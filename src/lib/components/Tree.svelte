<script context="module" lang="ts">
  export type TreeItem = {
    title: string;
    icon: string;

    children?: TreeItem[];
    path?: string;
  };
</script>

<script lang="ts">
  import { melt, type TreeView } from '@melt-ui/svelte';
  import { getContext } from 'svelte';
  import closedArrow from '$lib/icons/closedArrow.svelte';
  import openArrow from '$lib/icons/openArrow.svelte';
  import { getFile } from "$lib/scripts/fileutils";
  import readerModel from "$lib/models/readerModel";

  export let treeItems;
  export let level = 1;

  const {
    elements: { item, group },
    helpers: { isExpanded, isSelected },
  } = getContext<TreeView>('tree');

  const icons = {
    folder: closedArrow,
    folderOpen: openArrow
  };
</script>

{#each treeItems as { title, icon, children, path }, i}
  {@const hasChildren = !!children?.length}

  <li class={level !== 1 ? 'pl-4' : ''}>
    <button
      class="flex items-center gap-1 rounded-md p-1"
      use:melt={$item({
        id: title,
        hasChildren,
      })}>
      <!-- Add icon. -->
      {#if icon === 'folder' && hasChildren && $isExpanded(title)}
        <svelte:component this={icons['folderOpen']} class="h-4 w-4" />
      {:else}
        <svelte:component this={icons[icon]} class="h-4 w-4" />
      {/if}

      {#if hasChildren}
        <span class="select-none">{title}</span>
      {:else}
        <!-- svelte-ignore node_invalid_placement_ssr -->
        <button onclick={async () => {
            const split  = path.split('/');
            const uuid = split[0]
            const newPath = split.slice(1).join('/');

            const file = await getFile(
              newPath,
              uuid,
              readerModel.provenanceModel.zipReader).then(
                (data) => new Blob(
                  [data.byteArray],
                  { type: data.type }
                )
              )
            const link = document.createElement('a');

            link.href = URL.createObjectURL(file);
            link.download = newPath;
            link.click();
            URL.revokeObjectURL(link.href);
          }
        } class="text-blue-700 hover:text-gray-600">{title}</button>
      {/if}
    </button>

    {#if children}
      <ul use:melt={$group({ id: title })}>
        <svelte:self treeItems={children} level={level + 1} />
      </ul>
    {/if}
  </li>
{/each}
