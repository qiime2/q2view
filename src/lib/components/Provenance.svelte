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
        <p class="text-sm pb-2">Click on an element of the Provenance Graph to learn more. Alternatively, you can search the prov dag for nodes matching specific criteria.</p>
        <p class="text-md">Search Query Instructions:</p>
        <p class="text-sm">
          All search queries are of the form key: value <br><br>
          If the value you are searching for is a string (appears in quotes in the Details panel) it must be in quotes in your search query e.g. type: "FeatureData" <br><br>
          String values match on includes and all other values match on equality. <br><br>
          This means type: "FeatureData" will match all type's containing "FeatureData" while sampling_depth: 1000 will only match sampling depths equaling exactly 1000 <br><br>
          Note the values false, true, and null are often NOT strings and do not need quotes <br><br>
          Strings can use the start and end of string anchors "^" and "$"" <br><br>
          type: "^FeatureData" will match all type's that start with "FeatureData" while type: "FeatureData$" will match all types that end with "FeatureData" <br><br>
          Note that this means you can match an exact string by beginning your search string with "^" and ending it with "$" e.g. type: "^FeatureData[Taxonomy]$" will only match exactly "FeatureData[Taxonomy]". Although in this case the anchors are likely unnecessary because any type that includes "FeatureData[Taxonomy]" is probably exactly "FeatureData[Taxonomy]" <br><br>
          If your search value actually starts with "^" or ends with "$" you will have to escape them with "\" e.g. key: "\^String starts and ends with anchors\$"<br><br>
          You can also combine values with AND and OR e.g. uuid: (("^6" AND "$5") OR "ee") <br><br>
          You can do the same with multiple keys e.g. uuid: "6" OR (sampling_depth: 1000 AND other: false) <br><br>
          You can specify multiple levels of key by seperating them with . e.g. execution.uuid: "6" <br><br>
          The same as with anchors, if your key contains a . you must escape it with \ e.g. key.contains.per\.iod: "value"
        </p>
      {/if}
    </Panel>
  </div>
{/key}
