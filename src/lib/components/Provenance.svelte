<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";
</script>

{#key $provenanceModel.uuid}
  <Dag />
{/key}
{#key $provenanceModel.provData}
  <div>
    <Panel header={$provenanceModel.provTitle}>
      {#if provenanceModel.provData !== undefined}
        <div class="JSONTree">
          <JSONTree
            value={provenanceModel.provData}
            defaultExpandedLevel={100}
            shouldShowPreview={false}
          />
        </div>
      {:else}
        <div class="text-gray-700">
          <p class="pb-3 leading-5">Click on an element of the Provenance Graph to learn more. Alternatively, you can search the graph for actions and results matching specific criteria</p>
          <p class="font-bold text-lg">Search Query Instructions:</p>
          <p class="leading-5">All search queries are of the form key: "value"</p><span class="example">uuid: "&lt;uuid&gt;"</span>
          <p class="pt-3 font-bold text-lg">Rules for Keys:</p>
          <p class="leading-5">You can specify multiple levels of key by seperating them with "." </p><span class="example">execution.uuid: "&lt;uuid&gt;"</span>
          <p class="pt-3 leading-5">If your key contains a "." you must escape it with "\" </p><span class="example">key.contains.per\.iod: "value"</span>
          <p class="pt-3 leading-5">You can combine multiple keys with AND and OR </p><span class="example">uuid: "&lt;uuid&gt;" OR (trunc_len: 150 AND hashed_feature_ids: true)</span>
          <p class="pt-3 font-bold text-lg">Rules for Values:</p>
          <p class="leading-5">If the value you are searching for is a string it must be in quotes</p><span class="example">type: "FeatureData"</span>
          <p class="pt-3 leading-5"><span>Note:</span> the values true, false, and null are often NOT strings and do not need quotes </p>
          <p class="pt-3 leading-5">Strings match on includes and all other types match on equality </p><span class="example">type: "FeatureData"</span><p class="leading-5">will match all types containing "FeatureData"</p><span class="example">sampling_depth: 1000</span><p class="leading-5">will only match sampling depths equaling exactly 1000</p>
          <p class="pt-3 leading-5">Strings can use the start and end of string anchors "^" and "$" </p><span class="example">type: "^FeatureData"</span><p class="leading-5">will match all types that start with "FeatureData"</p><span class="example">type: "FeatureData$"</span><p class="leading-5">will match all types that end with "FeatureData"</p><span class="example">type: "^FeatureData[Taxonomy]$"</span><p class="leading-5">will only match exactly "FeatureData[Taxonomy]"</p>
          <p class="pt-3 leading-5">If your search value starts with "^" or ends with "$" you will have to escape them with "\" </p><span class="example">key: "\^String starts and ends with anchors\$"</span>
          <p class="pt-3 leading-5">You can also combine values with AND and OR </p><span class="example">uuid: (("^6" AND "5$") OR "ee")</span>
        </div>
      {/if}
    </Panel>
  </div>
{/key}

<style lang="postcss">
  .example {
    @apply text-black
    bg-gray-300
    rounded-md
    px-2
    py-0.5
  }
</style>
