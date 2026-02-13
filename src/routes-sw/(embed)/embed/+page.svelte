<script lang='ts'>
    import readerModel from "$lib/models/readerModel";
    import { checkBrowserCompatibility } from "$lib/scripts/util";
    import { onMount } from "svelte";

    let self: HTMLIFrameElement | undefined;

    onMount(async () => {
        checkBrowserCompatibility();
        readerModel.attachToServiceWorker();

        const controller = new AbortController()
        const port: Promise<MessagePort> = new Promise((resolve, reject) => {
            window.addEventListener('message', (event: MessageEvent) => {
                if (event.data.event == 'SESSION_PROPOSE') {
                    const potentialPort = event.data.port as MessagePort;
                    const id = event.data.id as string;
                    const session = event.data.session as string;

                    potentialPort.addEventListener('message', (event) => {
                        if (event.data.event == 'SESSION_CONFIRM') {
                            potentialPort.postMessage({event: 'SESSION_READY'})
                            console.debug(`[${id}: child / ${session}] Connection ready.`)
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
                }, {signal: controller.signal})
        })

        Promise.all([
            port.then((port) => {
                port.addEventListener('message', handleMessage)
                return port
            }),
            new Promise<void>((resolve) => {
                const c = new AbortController()
                self?.addEventListener('load', () => {
                    c.abort()
                    resolve()
                }, {signal: c.signal})
            }),
            fetch('/_/wakeup')
        ]).then(([port]) => {
            sendSize(port, self!)
            self!.addEventListener('load', () => {
                sendSize(port, self!)
            })
        })
    })

    function sendSize(port: MessagePort, iframe: HTMLIFrameElement) {
        let height = iframe.contentDocument?.documentElement.offsetHeight;
        if (height) {
            port.postMessage({event: 'inner_size', height})
        }
    }

    function handleMessage(event: MessageEvent) {
        const handlers = {
            BLOB_ARCHIVE: ({blob}: {blob: Blob}) => {
                readerModel.initModelFromData(blob).then(() => {
                    self!.src = readerModel.indexPath}
                );
            }
        }
        handlers[event.data.event as keyof typeof handlers](event.data)
    }
</script>

<iframe
  title="visualization"
  class='absolute w-full h-full border-0'
  bind:this={self}
></iframe>
