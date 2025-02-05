<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";

  let value: string = '';

  // Search syntax something like
  //
  // param:sampling_depth=1103 AND action=core_metrics AND plugin=boots
  //
  // If you are searching for a string value that contains = or : or " AND " you
  // will need to put that string in quotes
  //
  // Additionally, if your key contains any of those values you will need to put it
  // in quotes.
  //
  // If your key contains periods, you will need to format it as a list
  function searchProvenance() {
    const split = value.split('=');
    const key = split[0];
    const _value = split[1];

    const hits = provenanceModel.searchJSON([key], _value);
    console.log(hits);
  }
</script>

{#key $provenanceModel.uuid}
  <Dag />
{/key}
{#key $provenanceModel.provData}
  <div>
    <form on:submit|preventDefault>
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
