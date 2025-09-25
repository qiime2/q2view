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

<div
  class="flex w-full overflow-y-auto flex-col"
>
  <div class="flex flex-col gap-1 px-4 pt-4">
    <h3 class="text-lg font-bold">Artifact Structure</h3>
    <hr />
  </div>

  <ul class="overflow-auto px-4 pb-4 pt-2" {...$tree}>
    {#if $readerModel.fileTree.length > 0}
      <Tree treeItems={readerModel.fileTree[0].children} />
    {/if}
  </ul>
</div>
