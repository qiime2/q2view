<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";

  let DAG: Dag;
  let value: string = '';
</script>

{#key $provenanceModel.uuid}
  <Dag bind:this={DAG}/>
{/key}
{#key $provenanceModel.provData}
  <div>
    <form on:submit|preventDefault>
      <label>
          Search Provenance:
          <input bind:value />
      </label>
      <button on:click={() => DAG.searchProvenance(value)}>GO</button>
    </form>
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
        <p>Click on an element of the Provenance Graph to learn more</p>
      {/if}
    </Panel>
  </div>
{/key}

<style lang="postcss">
  input {
    @apply border
    mb-4;
  }
</style>
