<script lang="ts">
  import "../../app.css";
  import cytoscape from "cytoscape";
  import {
    searchProvenance,
    transformQuery,
  } from "$lib/scripts/provSearchUtils";
  import Panel from "./Panel.svelte";
  import provenanceModel from "$lib/models/provenanceModel";
  import { HEIGHT_MULTIPLIER_PIXELS } from "$lib/scripts/util";

  export let height: number;
  export let cy: cytoscape.Core;

  let value: string = "";
  let searchIndex: number = 0;
  let searchHits: Array<string> = [];

  // Map the literaly Lark uses to more human readable things
  const LARK_MAP: Map<string, string> = new Map([
    ["$END", '"End of input"'],
    ["COLON", '":"'],
    ["KEY_SEP", '"."'],
    ["NUMBER", "number"],
    ["STRING", '"string"'],
    ["KEY_VALUE", '"key"'],
    ["FALSE", "false"],
    ["TRUE", "true"],
    ["NULL", "null"],
    ["LPAR", '"("'],
    ["RPAR", '")"'],
    ["AND", '"AND"'],
    ["OR", '"OR"'],
  ]);

  function _formatSearchError() {
    let error = "ERROR: ";

    // The error types from the very large parser.js file get minified, so I am
    // dispatching this logic on inferred error types based on what attributes
    // the error has
    if (value === "") {
      error += "No search value entered.";
    } else if ("char" in $provenanceModel.searchError) {
      // UnexpectedCharacters error
      error += `Missing ${$provenanceModel.searchError.char}`;
    } else if ("token" in $provenanceModel.searchError) {
      // UnexpectedToken error
      error += `received ${LARK_MAP.get($provenanceModel.searchError.token.type)}` +
               ` expected one of ${_formatExpected($provenanceModel.searchError.expected)}.`;
    } else {
      error += $provenanceModel.searchError.message;
    }

    return error;
  }

  function _formatExpected(expected: Set<string>) {
    let mapped = [];

    for (const value of expected) {
      mapped.push(LARK_MAP.get(value));
    }

    return mapped.join(", ");
  }

  function _handleProvenanceSearch() {
    searchIndex = 0;

    try {
      const searchQuery = transformQuery(value);
      searchHits = Array.from(
        searchProvenance(searchQuery, provenanceModel.nodeIDToJSON),
      );
      if (searchHits.length === 0) {
        throw new Error("No search hits found");
      }

      provenanceModel.searchError = null;
    } catch (error) {
      provenanceModel.searchError = error;
    } finally {
      provenanceModel._dirty();
    }

    // Sort the hit nodes by row then by col within a given row
    searchHits.sort((a, b) => {
      let aNode: any = cy.$id(a);
      let bNode: any = cy.$id(b);

      // We only set a row and column on the Result nodes in the graph not the
      // Action nodes. Action nodes have Result nodes as children, so if a node
      // has children we know it is an Action node and we sort it based on its
      // first child which will be the furthest left Result node it contains.
      if (aNode.descendants().length > 0) {
        aNode = aNode.descendants()[0];
      }

      if (bNode.descendants().length > 0) {
        bNode = bNode.descendants()[0];
      }

      // Now sort by row first then by column within a row
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
      // This will happen if there are no search hits
      return;
    } else {
      const containerHeight = cy.container()?.offsetHeight;
      const elem = cy.$id(hitUUID);

      // Center on the selected node
      elem.select();
      cy.center(elem);

      // Pan to put the focused node near the top of the viewport
      // The linter whines that containerHeight could be undefined, but that's
      // only if we are headless... which won't happen
      //
      // This pans the viewport to put the focused node in the top center of
      // viewport ~one node height from the top of the viewport
      cy.panBy({
        x: 0,
        y: -((containerHeight / 2) - (HEIGHT_MULTIPLIER_PIXELS)),
      });
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
    provenanceModel.searchError = null;
    provenanceModel._dirty();
  }
</script>

<Panel header="Search Provenance" customPanelClass="p-4">
  <form on:submit|preventDefault={_handleProvenanceSearch}>
    <input
      class="roundInput"
      placeholder='type: ("FeatureData" OR "SampleData")'
      bind:value
    />
  </form>
  <div class="flex mt-2" style="align-items: center">
    <button on:click={_decrementSearchIndex} class="roundButton">
      <svg fill="none" width="10" height="10">
        <path
          stroke-width="3"
          stroke="rgb(119, 119, 119)"
          d="m8 0L3 5a0,2 0 0 1 1,1M3 5L8 10"
        />
      </svg>
    </button>
    <!-- Show 0/0 when no results -->
    {searchHits.length > 0 ? searchIndex + 1 : searchIndex}/{searchHits.length}
    <button on:click={_incrementSearchIndex} class="roundButton">
      <svg fill="none" width="10" height="10">
        <path
          stroke-width="3"
          stroke="rgb(119, 119, 119)"
          d="m3 0L8 5a0,2 0 0 1 1,1M8 5L3 10"
        />
      </svg>
    </button>
    <button on:click={_selectSearchHit} class="roundButton textButton">
      Center on Result
    </button>
    <button on:click={_clearSearch} class="roundButton textButton">
      Clear Search
    </button>
    <!-- The reactivity of $provenanceModel.searchError !== null only reacts
     to searchError changing from or to null. We need the key to react to
     the searchError changing from one error to a different error. -->
    {#key $provenanceModel.searchError}
      {#if $provenanceModel.searchError !== null}
        <div
          class="border border-red-300 rounded-md bg-red-100 py-1 px-3 ml-auto w-2/3"
        >
          {_formatSearchError()}
        </div>
      {/if}
    {/key}
  </div>
</Panel>

<style lang="postcss">
  input {
    width: 100%;
    @apply mb-2;
  }

  .textButton {
    @apply border
    border-gray-300
    bg-gray-200
    mx-2
    px-3
    py-1;
  }

  .textButton:hover {
    @apply bg-gray-300;
  }

  :global(#search-panel) {
    height: 102px;
    @apply py-0 overflow-y-auto;
  }
</style>
