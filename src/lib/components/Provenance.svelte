<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";

  const searchElement = document.getElementById("search") as HTMLInputElement;
  searchElement?.addEventListener("keypress", (event) => {
    console.log(event.key)
    if (event.key === "Enter") {
      alert(searchElement.value);
    }
  })
</script>

{#key $provenanceModel.uuid}
  <Dag />
{/key}
{#key $provenanceModel.provData}
  <div>
    <input id="search" type="text"/>
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
  #search {
    @apply border
    mb-4;
  }
</style>
