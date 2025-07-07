<script lang="ts">
  import readerModel from '$lib/models/readerModel';
  import { createDialog, melt } from '@melt-ui/svelte'

  let dismissed: boolean = $state(false);

  const {
    elements: {
      overlay,
      content,
      title,
      description,
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
            max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white
            p-4 shadow-lg"
      use:melt={$content}
    >
      <h2 use:melt={$title} class="text-lg">
        The following critical errors were found in your provenance. Please inspect them in your "Provenance" tab.
      </h2>
      {#each $readerModel.provenanceModel.highSeverityErrors as error}
        <div class="px-2 my-2 bg-gray-200 rounded-md">
          {error.name}
        </div>
      {/each}
      <div class="mt-4 flex gap-4">
        <button
          onclick={() => dismissed = true}
          class="inline-flex h-8 items-center justify-center rounded-md
                bg-zinc-300 px-4 font-medium leading-none"
        >
          Dismiss
        </button>
        <button
          onclick={_redirectToProv}
          class="inline-flex h-8 items-center justify-center rounded-md
                bg-blue-300 px-4 font-medium leading-none"
        >
          View Errors
        </button>
      </div>
    </div>
  </div>
{/if}