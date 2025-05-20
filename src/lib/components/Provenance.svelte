<script lang="ts">
  import "../../app.css";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import readerModel from "$lib/models/readerModel";
  import { getScrollBarWidth } from "$lib/scripts/util";
</script>

{#key $readerModel.provenanceModel.uuid}
  <Dag />
{/key}
{#key $readerModel.provenanceModel.provData}
  <!-- If there is a visibile scrollbar then the rounding clips awkwardly -->
  <div class="{getScrollBarWidth() == 0 ? "rounded-md" : ""} mb-2 border border-gray-300 p-4 overflow-y-auto bg-gray-50"
       style="margin-right: {getScrollBarWidth()}px">
    {#if readerModel.provenanceModel.provData !== undefined}
      <div class="JSONTree">
        <JSONTree
          value={readerModel.provenanceModel.provData}
          defaultExpandedLevel={100}
          shouldShowPreview={false}
        />
      </div>
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
</style>
