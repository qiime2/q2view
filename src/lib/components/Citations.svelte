<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";
  import readerModel from "$lib/models/readerModel";
  import ResultDetails from "$lib/components/ResultDetails.svelte";

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