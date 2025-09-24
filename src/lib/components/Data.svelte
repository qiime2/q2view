<script lang="ts">
  import { createTreeView } from '@melt-ui/svelte';
  import { setContext } from 'svelte';

  import Tree from '$lib/components/Tree.svelte';
  import readerModel from '$lib/models/readerModel';

  const ctx = createTreeView({
    defaultExpanded: ['lib-0', 'tree-0'],
  });
  setContext('tree', ctx);

  const {
    elements: { tree },
  } = ctx;
</script>

<div
  class="flex h-full w-full flex-col rounded-xl bg-white text-neutral-900 md:h-[350px]"
>
  <div class="flex flex-col gap-1 px-4 pt-4">
    <h3 class="text-lg font-bold">Project Structure</h3>
    <hr />
  </div>

  <ul class="overflow-auto px-4 pb-4 pt-2" {...$tree}>
    {#key $readerModel.fileTree}
      <Tree treeItems={readerModel.fileTree} />
    {/key}
    </ul>
</div>
