<script context="module" lang="ts">
  export type TreeItem = {
    title: string;
    icon: string;

    children?: TreeItem[];
  };
</script>

<script lang="ts">
  import { melt, type TreeView } from '@melt-ui/svelte';
  import { getContext } from 'svelte';

  export let treeItems;
  export let level = 1;

  const {
    elements: { item, group },
    helpers: { isExpanded, isSelected },
  } = getContext<TreeView>('tree');
</script>

{#each treeItems as { title, icon, children }, i}
  {@const itemId = `${title}-${i}`}
  {@const hasChildren = !!children?.length}

  <li class={level !== 1 ? 'pl-4' : ''}>
    <button
      class="flex items-center gap-1 rounded-md p-1"
      use:melt={$item({
        id: itemId,
        hasChildren,
      })}
    >
      <!-- Add icon. -->
      {#if icon === 'folder' && hasChildren && $isExpanded(itemId)}
        <svelte:component this={() => 'a'} class="h-4 w-4" />
      {:else}
        <svelte:component this={() => 'b'} class="h-4 w-4" />
      {/if}

      <span class="select-none">{title}</span>

      <!-- Selected icon. -->
      {#if $isSelected(itemId)}
        <svelte:component this={() => 'c'} class="h-4 w-4" />
      {/if}
    </button>

    {#if children}
      <ul use:melt={$group({ id: itemId })}>
        <svelte:self treeItems={children} level={level + 1} />
      </ul>
    {/if}
  </li>
{/each}

<style>
  /* Remove docs' focus box-shadow styling. */
  li:focus {
    box-shadow: none !important;
  }
</style>
