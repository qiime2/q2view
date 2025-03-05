<script lang="ts">
  import "../../app.css";
  import cytoscape from "cytoscape";
  import { searchProvenance } from "$lib/scripts/provSearchUtils";
  import { onMount } from "svelte";
    import Panel from "./Panel.svelte";

  export let height: number;
  export let cy: cytoscape.Core;

  let value: string = "";
  let searchIndex: number = 0;
  let searchHits: Array<string> = [];

  function _handleProvenanceSearch() {
    searchIndex = 0;
    searchHits = searchProvenance(value);

    // Sort the hit nodes by row then by col within a given row
    searchHits.sort((a, b) => {
      let aNode: any = cy.$id(a);
      let bNode: any = cy.$id(b);

      if (aNode.descendants().length > 0) {
        aNode = aNode.descendants()[0];
      }

      if (bNode.descendants().length > 0) {
        bNode = bNode.descendants()[0];
      }

      if (aNode.data().row === bNode.data().row) {
        return aNode.data().col - bNode.data().col;
      }

      return aNode.data().row - bNode.data().row;
    });

    _selectSearchHit();
  }

  function _selectSearchHit() {
    const hitUUID = searchHits[searchIndex];

    if (hitUUID === undefined) {
      // This will happen if there are no searc hits
      return;
    } else {
      const elem = cy.$id(hitUUID);
      elem.select();
      cy.center(elem);

      // Pan to put the focused node near the top of the viewport
      cy.panBy({
        x: 0,
        y: ((height - 2) / 2) * -105
      })
    }
  }

  function _decrementSearchIndex() {
    if (searchHits.length === 0) {
      // This will happen if the button is clicked with no search results
      return;
    }

    if (searchIndex > 0) {
      searchIndex--;
    } else {
      searchIndex = searchHits.length - 1;
    }

    _selectSearchHit();
  }

  function _incrementSearchIndex() {
    if (searchHits.length === 0) {
      // This will happen if the button is clicked with no search results
      return;
    }

    if (searchIndex < searchHits.length - 1) {
      searchIndex++;
    } else {
      searchIndex = 0;
    }

    _selectSearchHit();
  }

  function _clearSearch() {
    value = "";
    searchIndex = 0;
    searchHits = [];
  }

  onMount(() => {
    // reininit this out when mounting a new DAG
    _clearSearch();
  })
</script>

<form on:submit|preventDefault={_handleProvenanceSearch}>
  <label>
      Search Provenance:
      <input class="roundInput" bind:value />
  </label>
</form>
<div class="mx-auto">
  <button
    on:click={_decrementSearchIndex}
    class="roundButton"
  >
  <svg fill="none"
      width="10"
      height="10">
      <path
        stroke-width="3"
        stroke="rgb(119, 119, 119)"
        d="m8 0L3 5a0,2 0 0 1 1,1M3 5L8 10"/>
    </svg>
  </button>
  <!-- Show 0/0 when no results -->
  {searchHits.length > 0 ? searchIndex + 1 : searchIndex}/{searchHits.length}
  <button
    on:click={_incrementSearchIndex}
    class="roundButton"
  >
    <svg fill="none"
      width="10"
      height="10">
      <path
        stroke-width="3"
        stroke="rgb(119, 119, 119)"
        d="m3 0L8 5a0,2 0 0 1 1,1M8 5L3 10"/>
    </svg>
  </button>
  <button
    on:click={_selectSearchHit}
    class="roundButton textButton"
  >
    Center on Result
  </button>
  <button
    on:click={_clearSearch}
    class="roundButton textButton"
  >
    Clear Search
  </button>
</div>

<style lang="postcss">
  input {
    width: 100%;
    @apply mb-2
  }

  .textButton {
    @apply border
    border-gray-300
    bg-gray-200
    mb-2
    mx-2
    p-1;
  }

  .textButton:hover {
    @apply bg-gray-300;
  }

  :global(#search-panel) {
    height: 102px;
    @apply py-0 overflow-y-auto;
  }
</style>
