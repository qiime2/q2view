<script lang="ts">
  import { createTreeView } from '@melt-ui/svelte';
  import { setContext } from 'svelte';

  import Tree from '$lib/components/Tree.svelte';
  import readerModel from '$lib/models/readerModel';

  const ctx = createTreeView({
    defaultExpanded: ['data', $readerModel.uuid],
  });
  setContext('tree', ctx);

  const {
    elements: { tree },
  } = ctx;

  let selectedTab = $state('Data');
</script>

<div
  class="flex overflow-y-auto flex-col border rounded-md mb-2 ml-2"
>
  <div class="flex border-b border-solid border-gray-300 pb-2 pt-4 px-4 mb-4">
    <button onclick={() => selectedTab = "Data"} class="nav-button float-left mx-auto w-1/2 pb-0.5 {selectedTab === "Data" ? "selected-nav-button" : ""}">
      Your Data
    </button>
    <button onclick={() => selectedTab = "Artifact"} class="nav-button float-right mx-auto w-1/2 pb-0.5 {selectedTab === "Artifact" ? "selected-nav-button" : ""}">
      Artifact Structure
    </button>
  </div>

  {#if $readerModel.fileTree.length > 0}
    {console.log(readerModel.fileTree[0].children)}
    {#if selectedTab === "Data"}
      <ul class="overflow-auto px-4 pb-4 pt-2 text-lg" {...$tree}>
        <Tree treeItems={readerModel.fileTree[0].children?.find((element) => element.path === "data")?.children} level={1} />
      </ul>
    {:else if selectedTab === "Artifact"}
      <ul class="overflow-auto px-4 pb-4 pt-2 text-lg" {...$tree}>
        <Tree treeItems={readerModel.fileTree} level={1} />
      </ul>
    {/if}
  {/if}
</div>
<pre class="border rounded-md p-2 overflow-auto text-sm mb-2 mr-2">
{$readerModel.filePreviewText}
</pre>
