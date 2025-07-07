<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";
  import readerModel from "$lib/models/readerModel";
  import ResultDetails from "$lib/components/ResultDetails.svelte";
  import { createDialog, melt } from '@melt-ui/svelte'
  /** Internal helpers */
  import { fade } from 'svelte/transition';
    import { trusted } from "svelte/legacy";

  let dismissed: boolean = $state(false);

  const {
    elements: {
      trigger,
      overlay,
      content,
      title,
      description,
      close,
      portalled,
    },
    states: { open },
  } = createDialog({
    forceVisible: true,
  });

  let renderedCitations: HTMLElement | undefined = $state();

  // If the user refreshes then we need to react to the citations being set
  // when we are already on this page
  //
  // They will be undefined for a sec and it will flash "No Citations" then
  // when they are actually loaded by the ReaderModel this will react to that
  $effect(() => {
    if (readerModel.citationsModel.citations !== undefined) {
      readerModel.citationsModel.formatCitations();
    }
  });

  function _updateCitations() {
    if (renderedCitations === undefined) {
      return;
    }

    let newInnerHTML = "";

    if (readerModel.citationsModel.citationStyle === 'bib' || readerModel.citationsModel.citationStyle === 'ris') {
      newInnerHTML = "<pre>" + readerModel.citationsModel.formattedCitations + "</pre>";
    } else {
      newInnerHTML = readerModel.citationsModel.formattedCitations;
    }

    renderedCitations.innerHTML = newInnerHTML;
  }
</script>

{#if !dismissed && $readerModel.provenanceModel.highSeverityErrors.size > 0}
  <div class="" use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-50 bg-black/50"
      transition:fade={{ duration: 150 }}
    />
    <div
      class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[90vw]
            max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white
            p-6 shadow-lg"
      use:melt={$content}
    >
      <h2 use:melt={$title} class="m-0 text-lg font-medium text-black">
        Edit profile
      </h2>
      <p use:melt={$description} class="mb-5 mt-2 leading-normal text-zinc-600">
        Make changes to your profile here. Click save when you're done.
      </p>

      <fieldset class="mb-4 flex items-center gap-5">
        <label class="w-[90px] text-right text-black" for="name"> Name </label>
        <input
          class="inline-flex h-8 w-full flex-1 items-center justify-center
                    rounded-sm border border-solid px-3 leading-none text-black"
          id="name"
          value="Thomas G. Lopes"
        />
      </fieldset>
      <fieldset class="mb-4 flex items-center gap-5">
        <label class="w-[90px] text-right text-black" for="username">
          Username
        </label>
        <input
          class="inline-flex h-8 w-full flex-1 items-center justify-center
                    rounded-sm border border-solid px-3 leading-none text-black"
          id="username"
          value="@thomasglopes"
        />
      </fieldset>
      <div class="mt-6 flex justify-end gap-4">
        <button
          onclick={() => dismissed = true}
          class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100 px-4 font-medium leading-none text-zinc-600"
        >
          Cancel
        </button>
        <button
          onclick={() => dismissed = true}
          class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-magnum-100 px-4 font-medium leading-none text-magnum-900"
        >
          Save changes
        </button>
      </div>
      <button
        onclick={() => dismissed = true}
        aria-label="close"
        class="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none
                items-center justify-center rounded-full p-1 text-magnum-800
                hover:bg-magnum-100 focus:shadow-magnum-400"
      >
      </button>
    </div>
  </div>
{/if}

<Panel header="Details of {$readerModel.name}" customPanelClass="p-4 mb-4">
  <ResultDetails name={$readerModel.name} resultJSON={$readerModel.metadata}/>
</Panel>
<Panel header="Citations" customPanelClass="p-4 mb-4">
  <label for="citation-style">
    Citation Format:
    <!-- TODO: It takes a bit of time to react to changing this style. Feels a bit jank need some feedback -->
    <select bind:value={readerModel.citationsModel.citationStyle} id="citation-style" onchange={() => readerModel.citationsModel.formatCitations()}>
      <option value="apa">APA</option>
      <option value="asm">ASM</option>
      <option value="bib">BibTex</option>
      <option value="cell">Cell</option>
      <option value="chicago">Chicago</option>
      <option value="mla">MLA</option>
      <option value="nature">Nature</option>
      <option value="ris">RIS</option>
    </select>
  </label>
  {#if $readerModel.citationsModel.citations !== undefined}
    <a href={$readerModel.citationsModel.downloadableFile} download={`${$readerModel.citationsModel.uuid}.${$readerModel.citationsModel.fileExt}`} style="float: right">Download</a>
    <div id="citations" bind:this={renderedCitations}>
      {#key $readerModel.citationsModel.citationStyle}
        {_updateCitations()}
      {/key}
    </div>
  {:else}
    <pre id="citations">No Citations</pre>
  {/if}
</Panel>

<style lang="postcss">
  #citation-style {
    @apply border
    border-gray-300;
  }

  #citations {
    @apply border
    border-gray-300
    bg-gray-100
    overflow-x-auto
    text-xs
    p-2
    mt-2;
  }

  :global(.csl-entry) {
    clear: both;
    @apply my-2;
  }

  :global(.csl-entry:has(> .csl-left-margin):has(> .csl-right-inline)) {
    @apply flex
    my-2;
  }

  :global(.csl-left-margin) {
    @apply float-left
    mr-1;
  }

  :global(.csl-right-inline) {
    @apply float-right;
  }
</style>