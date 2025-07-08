<script lang="ts">
  import readerModel from '$lib/models/readerModel';
  import { createDialog, melt } from '@melt-ui/svelte'

  let dismissed: boolean = $state(false);

  const {
    elements: {
      overlay,
      content,
      title,
      portalled,
    },
  } = createDialog({
    forceVisible: true,
  });

  function _redirectToProv() {
    dismissed = true;
    history.pushState({}, "", "/provenance/" + window.location.search);
  }
</script>

{#if !dismissed}
  <div class="" use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
    >
    </div>
    <div
      class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw]
            max-w-[510px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white
            p-4 shadow-lg border border-gray-200"
      use:melt={$content}
    >
      <h2 use:melt={$title} class="text-lg">
        {#if readerModel.provenanceModel.highSeverityErrors.size === 1}
          The following high severity error was found in your provenance. This may affect the validity of this Result. Please inspect it in your "Provenance" tab.
        {:else}
          The following high severity errors were found in your provenance. These may affect the validity of this Result. Please inspect them in your "Provenance" tab.
        {/if}
      </h2>
      <div class="max-h-36 overflow-y-auto">
        {#each $readerModel.provenanceModel.highSeverityErrors as error}
          <div class="px-2 py-1 my-2 border border-gray-300 bg-gray-200 rounded-md">
            {error.name}
          </div>
        {/each}
      </div>
      <div class="mt-4 flex justify-end gap-4">
        <button
          onclick={() => dismissed = true}
          class="inline-flex h-8 items-center justify-center rounded-md
                 border border-zinc-400 bg-zinc-300 px-4 font-medium
                 leading-none dismiss-button"
        >
          Dismiss
        </button>
        <button
          onclick={_redirectToProv}
          class="inline-flex h-8 items-center justify-center rounded-md
                 border border-blue-400 bg-blue-300 px-4 font-medium
                 leading-none view-button"
        >
          View Errors
        </button>
      </div>
    </div>
  </div>
{/if}

<style lang="postcss">
  .dismiss-button:hover {
    @apply bg-zinc-400;
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
  }

  .view-button:hover {
    @apply bg-blue-400;
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
  }
</style>
