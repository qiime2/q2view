<script module lang="ts">
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
  import selectedArrow from '$lib/icons/selectedArrow.svelte';
  import { getFile } from "$lib/scripts/fileutils";
  import readerModel from "$lib/models/readerModel";
  import Tree from "./Tree.svelte";

  let { treeItems, level } = $props();

  const {
    elements: { item, group },
    helpers: { isExpanded, isSelected },
  } = getContext<TreeView>('tree');

  const icons = {
    folder: closedArrow,
    folderOpen: openArrow,
    selected: selectedArrow,
  };
</script>

{#each treeItems as { title, icon, children, path }}
  {@const hasChildren = !!children?.length}

  <li class={level !== 1 ? 'pl-4' : ''}>
    <button
      class="flex items-center gap-1 rounded-md p-1 hover:text-gray-600"
      use:melt={$item({
        id: path,
        hasChildren,
      })}>
      <!-- Add icon. -->
      {#if icon === 'folder' && hasChildren && $isExpanded(path)}
        <component this={icons['folderOpen']} class="h-4 w-4"></component>
      {:else}
        <component this={icons[icon]} class="h-4 w-4"></component>
      {/if}

      {#if hasChildren}
        <span class="select-none">{title}</span>
      {:else}
        <!-- svelte-ignore node_invalid_placement_ssr -->
        <button onclick={async () => {
            const file = await getFile(
              path,
              readerModel.uuid,
              readerModel.provenanceModel.zipReader).then(
                (data) => new Blob(
                  [data.byteArray],
                  { type: data.type }
                )
              )
            const link = document.createElement('a');

            link.href = URL.createObjectURL(file);

            await fetch(link.href)
              .then((res) => res.text())
              .then((text) => {
                readerModel.filePreviewText = text;
                readerModel._dirty();
              });
          }
        } class="text-blue-700 hover:text-gray-600">{title}</button>
      {/if}

      <!-- Selected icon. -->
      {#if $isSelected(path) && !hasChildren}
        <component this={icons['selected']} class="h-4 w-4"></component>
      {/if}
    </button>

    {#if children}
      <ul use:melt={$group({ id: path })}>
        <Tree treeItems={children} level={level + 1} />
      </ul>
    {/if}
  </li>
{/each}
