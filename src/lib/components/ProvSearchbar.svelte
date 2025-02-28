<script lang="ts">
  import "../../app.css";
  import { provSearchStore } from "$lib/scripts/prov-search-store";
  import cytoscape from "cytoscape";
  import { searchProvenance } from "$lib/scripts/provSearchUtils";
  import { onMount } from "svelte";

  export let height: number;
  export let cy: cytoscape.Core;

  let value: string = '';

  let searchIndex = 0;
  let searchHits: Array<string>;

  provSearchStore.subscribe((value) => {
    searchHits = value.searchHits
  });

  export function handleProvenanceSearch(searchValue: string) {
    const hits = searchProvenance(searchValue);

    // Sort the hit nodes by row then by col within a given row
    hits.sort((a, b) => {
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

    provSearchStore.set({
      searchHits: hits
    });
  }

  export function selectSearchHit(hitUUID: string) {
    if (hitUUID === undefined) {
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

  onMount(() => {
    // null this out when mounting a new DAG
    searchIndex = 0;

    provSearchStore.set({
      searchHits: []
    });
  })

</script>

<form on:submit|preventDefault={() => {searchIndex = 0; handleProvenanceSearch(value)}}>
  <label>
      Search Provenance:
      <input class="roundInput" bind:value />
  </label>
</form>
<div class="mx-auto">
  <button
    on:click={() => {
        if (searchIndex > 0) {
            searchIndex--;
        } else {
          searchIndex = searchHits.length - 1;
        }

        selectSearchHit(searchHits[searchIndex]);
    }}
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
    on:click={() => {
      if (searchIndex < searchHits.length - 1) {
        searchIndex++;
      } else {
        searchIndex = 0;
      }

      selectSearchHit(searchHits[searchIndex]);
    }}
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
    on:click={() => selectSearchHit(searchHits[searchIndex])}
    class="roundButton textButton"
  >
    Center on Result
  </button>
  <button
    on:click={() => {
      searchHits = [];
      value = "";
    }}
    class="roundButton textButton"
  >
    Clear Search
  </button>
</div>

<style lang="postcss">
  input {
    width: 100%;
  }

  .textButton {
    @apply border
    border-gray-300
    bg-gray-200
    mb-4
    mx-2;
  }

  .textButton:hover {
    @apply bg-gray-300;
  }
</style>
