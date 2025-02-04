<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";

  let value: string = '';
  let submittedValue: string | undefined = undefined;

  // Chloe said her most common searches would probably be
  //
  // Search for where X param has Y value
  // Search for a specific artifact UUID
  // Search for a specific action UUID
  function searchProvenance() {
    console.log(value)
    // const searchVal = `'${value}`
    // const thing = provenanceModel.jsonMap.get('33a0f06d-626d-4328-974f-4b0446abd384')
    // thing['action']['parameters']['1']['sampling_depth'] = '1103';
    // const searchVal = {'sampling_depth': "1103"}
    const hits = provenanceModel.searchJSON('sampling_depth', 1103)
    // const searchVal = '1103'
    // const hits = provenanceModel.search?.search(searchVal);
    const keys = []
    console.log(hits)

    for (const hit of hits) {
      keys.push(provenanceModel.nodeIDToJSON.getKey(hit.item));
    }

    return keys
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
