<script lang='ts'>
    import { browser } from "$app/environment";
    import readerModel from "$lib/models/readerModel";
    import loading from "$lib/scripts/loading";
    import { checkBrowserCompatibility } from "$lib/scripts/util";
    import { onMount } from "svelte";

    let self: HTMLIFrameElement | undefined;
    let port: MessagePort | undefined;
    let channelReady = false;
    let archiveReceived = false;
    let modelReady = false;
    let frameLoaded = false;
    let visualizationRequested = false;
    let showLongWaitHint = false;
    let longWaitHintTimeout: number | undefined;

    $: isLoading = !modelReady || (visualizationRequested && !frameLoaded);
    $: loadingMessage = $loading.status === "LOADING" && $loading.message
        ? $loading.message
        : channelReady
            ? archiveReceived
                ? "Preparing visualization"
                : "Waiting for visualization data"
            : "Establishing message channel";
    $: if (browser) {
        if (isLoading) {
            if (longWaitHintTimeout === undefined) {
                showLongWaitHint = false;
                longWaitHintTimeout = window.setTimeout(() => {
                    showLongWaitHint = true;
                }, 2500);
            }
        } else {
            showLongWaitHint = false;
            if (longWaitHintTimeout !== undefined) {
                window.clearTimeout(longWaitHintTimeout);
                longWaitHintTimeout = undefined;
            }
        }
    }

    onMount(() => {
        loading.setLoading(true, loadingMessage);
        checkBrowserCompatibility();
        readerModel.attachToServiceWorker();

        const controller = new AbortController();
        const frameController = new AbortController();
        const frameReadyController = new AbortController();

        self?.addEventListener("load", () => {
            if (visualizationRequested) {
                if (port && self) {
                    sendSize(port, self);
                }
                frameLoaded = true;
                loading.setLoading(false);
            }
        }, {signal: frameController.signal});

        const openPort: Promise<MessagePort> = new Promise((resolve, reject) => {
            window.addEventListener('message', (event: MessageEvent) => {
                if (event.data.event == 'SESSION_PROPOSE') {
                    const potentialPort = event.data.port as MessagePort;
                    const id = event.data.id as string;
                    const session = event.data.session as string;

                    potentialPort.addEventListener('message', (event) => {
                        if (event.data.event == 'SESSION_CONFIRM') {
                            potentialPort.postMessage({event: 'SESSION_READY'})
                            console.debug(`[${id}: child / ${session}] Connection ready.`)
                            channelReady = true;
                            loading.setMessage("Waiting for visualization data");
                            resolve(potentialPort);
                        } else {
                            reject(`[${id}: child / ${session}] Connection refused from ${event.origin}.`)
                        }
                        controller.abort()
                    }, {signal: controller.signal})
                    potentialPort.start()

                    potentialPort.postMessage({event: 'SESSION_ACCEPT'})
                    console.debug(`[${id}: child / ${session}] Connection to ${event.origin} accepted.`)

                } else {
                    console.warn(`Unknown message from ${event.origin}: ${event.data}`)
                }
                }, {signal: controller.signal});
        });

        Promise.all([
            openPort.then((activePort) => {
                port = activePort;
                activePort.addEventListener('message', handleMessage);
                return activePort;
            }),
            new Promise<void>((resolve) => {
                if (self?.contentDocument?.readyState === "complete") {
                    resolve();
                    return;
                }
                self?.addEventListener('load', () => {
                    frameReadyController.abort();
                    resolve();
                }, {signal: frameReadyController.signal});
            }),
            fetch('/_/wakeup')
        ]);

        return () => {
            controller.abort();
            frameController.abort();
            frameReadyController.abort();
            if (longWaitHintTimeout !== undefined) {
                window.clearTimeout(longWaitHintTimeout);
                longWaitHintTimeout = undefined;
            }
            loading.setLoading(false);
        };
    });

    function sendSize(port: MessagePort, iframe: HTMLIFrameElement) {
        const height = iframe.contentDocument?.documentElement.offsetHeight;
        if (height) {
            port.postMessage({event: 'inner_size', height});
        }
    }

    async function handleMessage(event: MessageEvent) {
        const handlers = {
            BLOB_ARCHIVE: async ({blob}: {blob: Blob}) => {
                archiveReceived = true;
                modelReady = false;
                frameLoaded = false;
                visualizationRequested = false;

                await readerModel.initModelFromData(blob);
                modelReady = true;

                if (readerModel.indexPath) {
                    visualizationRequested = true;
                    self!.src = readerModel.indexPath;
                } else {
                    loading.setLoading(false);
                }
            }
        };

        const handler = handlers[event.data.event as keyof typeof handlers];
        if (handler) {
            try {
                await handler(event.data);
            } catch (error) {
                loading.setLoading(false);
                console.error(error);
            }
        } else {
            console.warn(`Unknown channel event: ${event.data.event}`);
        }
    }
</script>

<iframe
  title="visualization"
  class='absolute w-full h-full border-0'
  bind:this={self}
></iframe>
{#if isLoading}
  <div class="loading-overlay" aria-live="polite" aria-busy="true">
    <div id="loader"></div>
    <p>{loadingMessage}</p>
    {#if showLongWaitHint}
      <p class="loading-hint">(Large visualizations can take a bit longer.)</p>
    {/if}
  </div>
{/if}

<style lang="postcss">
  .loading-overlay {
    @apply absolute inset-0 z-10 flex flex-col items-center justify-start gap-3 bg-white px-3;
    padding-top: clamp(16px, 10vh, 96px);
  }

  .loading-overlay p {
    @apply text-base text-gray-700 text-center;
  }

  .loading-hint {
    @apply text-sm text-gray-500;
  }

  #loader {
    border: 10px solid;
    border-top: 10px solid;
    border-radius: 50%;
    width: 72px;
    height: 72px;
    animation: spin 2s linear infinite;
    @apply border-t-blue-300 border-gray-300;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
