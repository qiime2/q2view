<script lang="ts">
  import { createTreeView } from '@melt-ui/svelte';
  import { setContext } from 'svelte';

  import Tree from '$lib/components/Tree.svelte';
  import readerModel from '$lib/models/readerModel';

  const ctx = createTreeView({
    defaultExpanded: ['data'],
  });
  setContext('tree', ctx);

  const {
    elements: { tree },
  } = ctx;
</script>

<div class="grid grid-cols-2 gap-4" style="height: 85vh">
  <div
    class="flex overflow-y-auto flex-col border rounded-md"
  >
    <div class="flex flex-col gap-1 px-4 pt-4">
      <h3 class="text-xl font-bold">Artifact Structure</h3>
      <hr />
    </div>

    <ul class="overflow-auto px-4 pb-4 pt-2 text-lg" {...$tree}>
      {#if $readerModel.fileTree.length > 0}
        <Tree treeItems={readerModel.fileTree[0].children} level={1} />
      {/if}
    </ul>
  </div>
  <pre class="border rounded-md p-2 overflow-auto text-sm">
{$readerModel.filePreviewText}
  </pre>
</div>
