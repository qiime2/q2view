<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";

  let value: string = '';
  let submittedValue: string | undefined = undefined;

  function searchProvenance() {
    return provenanceModel.search?.search(value);
  }
</script>

{#key $provenanceModel.uuid}
  <Dag />
{/key}
{#key $provenanceModel.provData}
  <div>
    <form on:submit|preventDefault={() => submittedValue = value}>
      <label>
          Search Provenance:
          <input bind:value />
      </label>

      <button on:click={() => console.log(searchProvenance())}>GO</button>
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
