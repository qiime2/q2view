<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";
  import readerModel from "$lib/models/readerModel";
  import citationsModel from "$lib/models/citationsModel";
  import ResultDetails from "$lib/components/ResultDetails.svelte";

  let citations: HTMLElement;

  // If the user refreshes then we need to react to the citations being set
  // when we are already on this page
  //
  // They will be undefined for a sec and it will flash "No Citations" then
  // when they are actually loaded by the ReaderModel this will react to that
  $: {
    if ($citationsModel.citations !== undefined) {
      citationsModel.formatCitations();
    }
  }

  // If the citation style is changed we need to update the DOM
  $: {
    if (citations !== undefined) {
      let newInnerHTML = "";

      if ($citationsModel.citationStyle === 'bib' || $citationsModel.citationStyle === 'ris') {
        newInnerHTML = "<pre>" + citationsModel.formattedCitations + "</pre>";
      } else {
        newInnerHTML = citationsModel.formattedCitations;
      }

      citations.innerHTML = newInnerHTML;
    }
  }
</script>

<Panel header="Details of {$readerModel.name}">
  <ResultDetails name={$readerModel.name} resultJSON={$readerModel.metadata}/>
</Panel>
<Panel header="Citations">
  <label for="citation-style">
    Citation Format:
    <!-- TODO: It takes a bit of time to react to changing this style. Feels a bit jank need some feedback -->
    <select bind:value={citationsModel.citationStyle} id="citation-style" on:change={() => citationsModel.formatCitations()}>
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
  {#if $citationsModel.citations !== undefined}
    <a href={$citationsModel.downloadableFile} download={`${$citationsModel.uuid}.${$citationsModel.fileExt}`} style="float: right">Download</a>
    <div id="citations" bind:this={citations}></div>
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