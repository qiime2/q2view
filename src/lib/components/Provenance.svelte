<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";
  import readerModel from "$lib/models/readerModel";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";

  const searchElement = document.getElementById("search") as HTMLInputElement;
  searchElement?.addEventListener("keypress", (event) => {
    console.log(event.key)
    if (event.key === "Enter") {
      alert(searchElement.value);
    }
  })
</script>

{#key $readerModel.uuid}
  <Dag />
{/key}
{#key $readerModel.provData}
<div>
  <input id="search" type="text"/>
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
</div>
{/key}

<style lang="postcss">
  #search {
    @apply border
    mb-4;
  }
</style>
