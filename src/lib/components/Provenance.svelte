<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";
</script>

{#key $provenanceModel.uuid}
  <Dag />
{/key}
<Panel header={$provenanceModel.provTitle}>
  {#if $provenanceModel.provData !== undefined}
    <div class="JSONTree">
      <JSONTree
        value={provenanceModel.provData}
        defaultExpandedLevel={100}
        shouldShowPreview={false}
      />
    </div>
  {:else}
    <p>Click on an element of the Provenance Graph to learn more</p>
  {/if}
</Panel>
