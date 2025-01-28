<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";
  import readerModel from "$lib/models/readerModel";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
</script>

{#key $readerModel.uuid}
  <Dag />
{/key}
{#key $readerModel.provData}
  <Panel header={$readerModel.provTitle}>
    {#if readerModel.provData !== undefined}
      <div class="JSONTree">
        <JSONTree
          value={readerModel.provData}
          defaultExpandedLevel={100}
          shouldShowPreview={false}
        />
      </div>
    {:else}
      <p>Click on an element of the Provenance Graph to learn more</p>
    {/if}
  </Panel>
{/key}
