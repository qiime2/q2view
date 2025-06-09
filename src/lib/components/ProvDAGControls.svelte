<script lang="ts">
  import { preventDefault } from "svelte/legacy";

  import "../../app.css";
  import cytoscape from "cytoscape";
  import {
    searchProvenance,
    transformQuery,
  } from "$lib/scripts/provSearchUtils";
  import Panel from "./Panel.svelte";
  import readerModel from "$lib/models/readerModel";
  import { sortDAGNodes } from "$lib/scripts/util";

  interface Props {
    cy: cytoscape.Core;
    centerOnSelected: Function;
    centerAndPan: Function;
    mount: Function;
  }

  let { cy, centerOnSelected, centerAndPan, mount }: Props = $props();

  let value: string = $state("");
  let searchIndex: number = $state(0);
  let searchHits: Array<string> = $state([]);

  // Map the literals Lark uses to more human readable things
  const LARK_MAP: Map<string, string> = new Map([
    ["$END", '"End of input"'],
    ["COLON", '":"'],
    ["KEY_SEP", '"."'],
    ["NUMBER", "number"],
    ["STRING", '"string"'],
    ["KEY_COMPONENT", '"key"'],
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
    } else if ("char" in $readerModel.provenanceModel.searchError) {
      // UnexpectedCharacters error
      error += `Received unexpected ${$readerModel.provenanceModel.searchError.char}`;
    } else if ("token" in $readerModel.provenanceModel.searchError) {
      // UnexpectedToken error
      error +=
        `received ${LARK_MAP.get($readerModel.provenanceModel.searchError.token.type)}` +
        ` expected one of ${_formatExpected($readerModel.provenanceModel.searchError.expected)}.`;
    } else {
      error += $readerModel.provenanceModel.searchError.message;
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

  // Get Errors:
  //
  // Get whatever the database of known errors looks like
  // Put all queries through the search thing
  // Get map of each issue mapped to UUIDs of all affected actions
  // Scream about it very overtly if there is a serious issue
  // Otherwise put a list of them... Somewhere? TBD exactly where logged errors
  // are to be stored/displayed
  function _handleProvenanceSearch() {
    searchIndex = 0;

    try {
      const transformedSearchQuery = transformQuery(value);
      searchHits = searchProvenance(
        transformedSearchQuery,
        readerModel.provenanceModel.nodeIDToJSON,
      );

      if (searchHits.length === 0) {
        throw new Error("No search hits found");
      }

      readerModel.provenanceModel.searchError = null;
    } catch (error) {
      readerModel.provenanceModel.searchError = error;
    } finally {
      readerModel._dirty();
    }

    // Sort the hit nodes by row then by col within a given row
    searchHits.sort((a, b) => sortDAGNodes(cy, a, b));

    _selectSearchHit();
  }

  function _selectSearchHit() {
    let hitID = searchHits[searchIndex];

    // If this hit was on an inner action in a pipeline we need to disambiguate that.
    if (readerModel.provenanceModel.innerIDToPipeline.get(hitID) !== undefined) {
      hitID = readerModel.provenanceModel.innerIDToPipeline.get(hitID);
    }

    if (hitID === undefined) {
      // This will happen if there are no search hits
      return;
    } else {
      cy.$id(hitID).select();
      centerOnSelected();
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

  function _reset() {
    // Deselect the currently selected node
    _deselect();
    // Get rid of current search data
    _clearSearch();
    // Remount DAG
    mount();
  }

  function _deselect() {
    const selectedNodes = cy.elements('node:selected');
    if (selectedNodes.length !== 0) {
      // We can only ever have one node selected at a time
      const selectedNode = selectedNodes[0];
      selectedNode.unselect();
    }
  }

  function _clearSearch() {
    value = "";
    searchIndex = 0;
    searchHits = [];
    readerModel.provenanceModel.searchError = null;
    readerModel._dirty();
  }
</script>

<Panel customPanelClass="p-4 bg-gray-50">
  <form onsubmit={preventDefault(_handleProvenanceSearch)}>
    <input class="roundInput" placeholder="Search Provenance" bind:value />
  </form>
  <div class="flex mt-2" style="align-items: center">
    <button
      onclick={_decrementSearchIndex}
      class="roundButton"
      aria-label="Previous Search Result"
    >
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
    <button
      onclick={_incrementSearchIndex}
      class="roundButton"
      aria-label="Next Search Result"
    >
      <svg fill="none" width="10" height="10">
        <path
          stroke-width="3"
          stroke="rgb(119, 119, 119)"
          d="m3 0L8 5a0,2 0 0 1 1,1M8 5L3 10"
        />
      </svg>
    </button>
    <button onclick={_clearSearch} class="roundButton textButton">
      Clear Search
    </button>
    <button onclick={() => centerOnSelected()} class="roundButton textButton">
      Center on Selected
    </button>
    <button onclick={() => centerAndPan()} class="roundButton textButton">
      Recenter
    </button>
    <button onclick={_reset} class="roundButton textButton">
      Reset
    </button>
    <!-- The reactivity of $provenanceModel.searchError !== null only reacts
     to searchError changing from or to null. We need the key to react to
     the searchError changing from one error to a different error. -->
    {#key $readerModel.provenanceModel.searchError}
      {#if $readerModel.provenanceModel.searchError !== null}
        <div
          class="border border-red-300 rounded-md bg-red-100 py-1 px-3 ml-auto"
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
    mx-1
    px-2
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
