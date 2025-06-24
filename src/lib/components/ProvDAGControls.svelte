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

  interface Props {
    cy: cytoscape.Core;
    centerOnSelected: Function;
    centerAndPan: Function;
    mount: Function;
  }

  let { cy, centerOnSelected, centerAndPan, mount }: Props = $props();

  let value: string = $state("");

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

  function _handleProvenanceSearch() {
    readerModel.provenanceModel.searchIndex = 0;

    for (const hitID of readerModel.provenanceModel.searchHits) {
      cy.$id(hitID).removeClass("highlighted");
    }

    try {
      const transformedSearchQuery = transformQuery(value);
      readerModel.provenanceModel.searchHits = searchProvenance(
        transformedSearchQuery,
        readerModel.provenanceModel.nodeIDToJSON,
      );
      readerModel.provenanceModel.searchError = null;
    } catch (error) {
      readerModel.provenanceModel.searchError = error;
    } finally {
      readerModel._dirty();
    }

    // Sort the hit nodes by row then by col within a given row
    readerModel.provenanceModel.searchHits.sort((a, b) => {
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

    for (const hitID of readerModel.provenanceModel.searchHits) {
      cy.$id(hitID).addClass("highlighted");
    }

    _selectSearchHit();
  }

  function _selectSearchHit() {
    const hitID = readerModel.provenanceModel.searchHits[readerModel.provenanceModel.searchIndex];

    if (hitID === undefined) {
      // This will happen if there are no search hits
      return;
    }

    cy.$id(hitID).select();
    centerOnSelected();
  }

  function _decrementSearchIndex() {
    if (readerModel.provenanceModel.searchHits.length === 0) {
      // This will happen if the button is clicked with no search results
      return;
    }

    if (readerModel.provenanceModel.searchIndex > 0) {
      readerModel.provenanceModel.searchIndex--;
    } else {
      readerModel.provenanceModel.searchIndex = readerModel.provenanceModel.searchHits.length - 1;
    }

    _selectSearchHit();
  }

  function _incrementSearchIndex() {
    if (readerModel.provenanceModel.searchHits.length === 0) {
      // This will happen if the button is clicked with no search results
      return;
    }

    if (readerModel.provenanceModel.searchIndex < readerModel.provenanceModel.searchHits.length - 1) {
      readerModel.provenanceModel.searchIndex++;
    } else {
      readerModel.provenanceModel.searchIndex = 0;
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

    for (const hitID of readerModel.provenanceModel.searchHits) {
      cy.$id(hitID).removeClass("highlighted");
    }

    readerModel.provenanceModel.searchIndex = 0;
    readerModel.provenanceModel.searchHits = [];
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
    {$readerModel.provenanceModel.searchHits.length > 0 ? $readerModel.provenanceModel.searchIndex + 1 : $readerModel.provenanceModel.searchIndex}/{$readerModel.provenanceModel.searchHits.length}
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
