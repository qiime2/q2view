<script lang="ts">
  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import readerModel from "$lib/models/readerModel";
  import { getScrollBarWidth } from "$lib/scripts/util";

  function _sumErrorsOnSelectedNode() {
    let low = readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(0)?.length;
    let medium = readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(1)?.length;
    let high = readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(2)?.length;

    low = low === undefined ? 0 : low;
    medium = medium === undefined ? 0 : medium;
    high = high === undefined ? 0 : high;

    return low + medium + high;
  }
</script>

{#key $readerModel.provenanceModel.uuid}
  <Dag />
{/key}
{#key $readerModel.provenanceModel.provData}
  <!-- If there is a visibile scrollbar then the rounding clips awkwardly -->
  <div class="{getScrollBarWidth() == 0 ? "rounded-md" : ""} mb-2 border border-gray-300 p-4 overflow-y-auto bg-gray-50"
       style="margin-right: {getScrollBarWidth()}px">
    {#if readerModel.provenanceModel.provData !== undefined}
      {#if readerModel.provenanceModel.cy.elements('node:selected').length > 0 && readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())}
        <div class="flex border-b border-solid border-gray-500 pb-2 mb-4">
          <button onclick={() => readerModel.provenanceModel.provTab = "provenance"} class="nav-button float-left mx-auto w-1/2 pb-0.5 {readerModel.provenanceModel.provTab === "provenance" ? "selected-nav-button" : ""}">
            Provenance
          </button>
          <button onclick={() => readerModel.provenanceModel.provTab = "error"} class="nav-button float-right mx-auto w-1/2 pb-0.5 {readerModel.provenanceModel.provTab === "error" ? "selected-nav-button" : ""}">
            Errors <span class="nav-button-child border border-gray-500 border-solid px-1.5 rounded-full">{_sumErrorsOnSelectedNode()}</span>
          </button>
        </div>
        <div class="JSONTree {readerModel.provenanceModel.provTab === "provenance" ? "block" : "hidden"}">
          <JSONTree
            value={readerModel.provenanceModel.provData}
            defaultExpandedLevel={100}
            shouldShowPreview={false}
          />
        </div>
        <div class="{$readerModel.provenanceModel.provTab === "error" ? "block" : "hidden"}">
          {#if readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(2)}
            <span class="font-bold">High Severity Errors</span><br>
            {#each readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(2) as error}
              <div class="mb-2 bg-gray-200 rounded-lg p-2">
                <span class="font-bold">name: </span> {error.name}<br>
                <span class="font-bold">description: </span> {error.description}<br>
                <span class="font-bold">discovery date: </span> {error.date}<br>
                <span class="font-bold">query: </span> {error.query}<br>
              </div>
            {/each}
          {/if}
          {#if readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(1)}
            <span class="font-bold">Medium Severity Errors</span><br>
            {#each readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(1) as error}
              <div class="mb-2 bg-gray-200 rounded-lg p-2">
                <span class="font-bold">name: </span> {error.name}<br>
                <span class="font-bold">description: </span> {error.description}<br>
                <span class="font-bold">discovery date: </span> {error.date}<br>
                <span class="font-bold">query: </span> {error.query}<br>
              </div>
            {/each}
          {/if}
          {#if readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(0)}
            <span class="font-bold">Low Severity Errors</span><br>
            {#each readerModel.provenanceModel.nodeIDToErrors.get(readerModel.provenanceModel.cy.elements('node:selected')[0].id())?.get(0) as error}
              <div class="mb-2 bg-gray-200 rounded-lg p-2">
              <span class="font-bold">name: </span> {error.name}<br>
                <span class="font-bold">description: </span> {error.description}<br>
                <span class="font-bold">discovery date: </span> {error.date}<br>
                <span class="font-bold">query: </span> {error.query}<br>
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <div class="JSONTree">
          <JSONTree
            value={readerModel.provenanceModel.provData}
            defaultExpandedLevel={100}
            shouldShowPreview={false}
          />
        </div>
      {/if}
    {:else}
      <div class="text-gray-700 text-sm">
        <p class="pb-3 leading-5">Click on an element of the Provenance Graph to learn more. Alternatively, you can search the graph for actions and results matching specific criteria</p>
        <p class="font-bold text-lg">Search Query Instructions:</p>
        <p class="leading-5">To search for a given key with a given value use the 'key: value' syntax</p><span class="example">sampling_depth: 1000</span>
        <p class="leading-5">To search for a given key with any value simply give the key on its own</p><span class="example">sampling_depth</span>
        <p class="pt-3 leading-5"><span class="font-bold">NOTE: </span>The AND and OR operators described below are simply computed left to right. For complex queries, please use parentheses to indicate precedence.</p>
        <p class="pt-3 font-bold text-lg">Rules for Keys:</p>
        <p class="leading-5">You can specify multiple levels of key by seperating them with "."</p><span class="example">execution.uuid: "&lt;uuid&gt;"</span>
        <p class="pt-3 leading-5">If your key contains a "." you must escape it with "\"</p><span class="example">key.contains.per\.iod: "value"</span>
        <p class="pt-3 leading-5">You can combine multiple keys with AND and OR</p><span class="example">uuid: "&lt;uuid&gt;" OR (trunc_len: 150 AND hashed_feature_ids: true)</span>
        <p class="pt-3 font-bold text-lg">Rules for Values:</p>
        <p class="leading-5">If the value you are searching for is a string it must be in quotes</p><span class="example">type: "FeatureData"</span>
        <p class="pt-3 leading-5"><span class="font-bold">NOTE:</span> the values true, false, and null are often NOT strings and do not need quotes</p>
        <p class="pt-3 leading-5">Strings match on includes and all other types match on equality</p><span class="example">type: "FeatureData"</span><p class="leading-5">will match all types containing "FeatureData"</p><span class="example">sampling_depth: 1000</span><p class="leading-5">will only match sampling depths equaling exactly 1000</p>
        <p class="pt-3 leading-5">Strings can use the start and end of string anchors "^" and "$"</p><span class="example">type: ^"FeatureData"</span><p class="leading-5">will match all types that start with "FeatureData"</p><span class="example">type: "[Taxonomy]"$</span><p class="leading-5">will match all types that end with "[Taxonomy]"</p><span class="example">type: ^"FeatureData[Taxonomy]"$</span><p class="leading-5">will only match exactly "FeatureData[Taxonomy]"</p>
        <p class="pt-3 leading-5">If your search value contains a double quote, you will need to escape it with "\"</p><span class="example">type: "\""</span><p class="leading-5">will match all types that contain a double quote</p>
        <p class="pt-3 leading-5">The same is true if your string contains a "\"</p><span class="example">type: "\\"</span><p class="leading-5">will match all types that contain a backslash</p>
        <p class="pt-3 leading-5">Numerical values can use the comparison operators &gt;, &gt;=, &lt;, &lt;=</p><span class="example">sampling_depth: &gt;=1000</span><p class="leading-5">will match all sampling_depths greater than or equal to 1000</p>
        <p class="pt-3 leading-5">You can also combine values with AND and OR. You must wrap these clauses in parentheses</p><span class="example">uuid: ((^"6" AND "5"$) OR "ee")</span><p class="leading-5">will match all uuids that start with 6 and end with 5 or contain "ee"</p>
      </div>
    {/if}
  </div>
{/key}

<style lang="postcss">
  p {
    @apply text-sm;
  }

  .example {
    @apply text-black
    bg-gray-300
    rounded-md
    px-2
    py-0.5
  }

  .nav-button {
    @apply block
    border-b-4
    border-b-transparent
    text-gray-500;
  }

  .nav-button:hover {
    @apply text-gray-950;
  }

  .nav-button:hover > .nav-button-child {
    @apply border-gray-950;
  }

  .selected-nav-button {
    @apply
    font-bold
    text-gray-950
    border-gray-950
    border-b-[#e39e54];
  }

  .selected-nav-button > .nav-button-child {
    @apply
    font-bold
    text-gray-950
    border-gray-950
    border-2;
  }

  .nav-button::before {
    @apply font-bold;
    display: block;
    content: attr(title);
    height: 1px;
    width: max-content;
    color: transparent;
    overflow: hidden;
    visibility: hidden;
  }
</style>
