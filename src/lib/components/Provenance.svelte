<script lang="ts">
  import "../../app.css";
  import Panel from "$lib/components/Panel.svelte";

  import JSONTree from "svelte-json-tree";
  import Dag from "./Dag.svelte";
  import provenanceModel from "$lib/models/provenanceModel";
  import { provSearchStore } from "$lib/scripts/prov-search-store";

  let DAG: Dag;
  let value: string = '';

  let searchIndex = 1;
  let searchHits: Array<string>;

  provSearchStore.subscribe((value) => {
    searchHits = value.searchHits
  });

  $: {
    if (DAG !== undefined && searchHits[searchIndex - 1] !== undefined) {
      DAG.selectSearchHit(searchHits[searchIndex - 1]);
    }
  }
</script>

{#key $provenanceModel.uuid}
  <Dag bind:this={DAG}/>
{/key}
{#key $provenanceModel.provData}
  <div>
    <form on:submit|preventDefault>
      <label>
          Search Provenance:
          <input class="roundInput" bind:value />
      </label>
      <button on:click={() => {
        searchIndex = 1;
        DAG.searchProvenance(value)
      }}>GO</button>
    </form>
    {#if searchHits.length > 0}
      <div class="mx-auto">
        <button
          on:click={() => {
              if (searchIndex > 1) {
                  searchIndex--;
              }
          }}
          class="roundButton"
        >
        <svg fill="none"
            width="10"
            height="10">
            <path
              stroke-width="3"
              stroke="rgb(119, 119, 119)"
              d="m8 0L3 5a0,2 0 0 1 1,1M3 5L8 10"/>
          </svg>
        </button>
        {searchIndex}/{searchHits.length}
        <button
          on:click={() => {
            if (searchIndex < searchHits.length) {
              searchIndex++;
            }
          }}
          class="roundButton"
        >
          <svg fill="none"
            width="10"
            height="10">
            <path
              stroke-width="3"
              stroke="rgb(119, 119, 119)"
              d="m3 0L8 5a0,2 0 0 1 1,1M8 5L3 10"/>
          </svg>
        </button>
      </div>
    {/if}
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
