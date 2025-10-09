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

  async function _previewFile(path: string) {
    const split = path.split('/');
    const pathWithoutUUID = split.slice(1).join('/');

    const file = await getFile(
      pathWithoutUUID,
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
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        let text = "This file is in a binary format and cannot be displayed in text.";

        // Make sure their data was a plaintext file not a binary
        try {
          text = new TextDecoder("utf8", { fatal: true }).decode(buffer);
        } catch(e) {}

        readerModel.selectedFile = path;
        readerModel.filePreviewText = text;
        readerModel._dirty();
      });
  }
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
      {#if icon === 'folder' && hasChildren && $isExpanded(path)}
        <svelte:component this={icons['folderOpen']} class="h-4 w-4" />
      {:else}
        <svelte:component this={icons[icon]} class="h-4 w-4" />
      {/if}

      {#if hasChildren}
        <span class="select-none">{title}</span>
      {:else}
        <span class="text-blue-700 hover:text-gray-600">{title}</span>
      {/if}

      {#if $isSelected(path) && !hasChildren}
        <!-- This is formatted as an anonymous function that is immediately
        called so the return will be void which gets us the side effect of the
        function without stuffing a return value into the DOM to render -->
        {(() => {_previewFile(path)})()}
      {/if}

      {#if $readerModel.selectedFile === path}
        <!-- We want to maintain our selected icon on the file that is being
        previewed -->
        <svelte:component this={icons['selected']} class="h-4 w-4" />
      {/if}
    </button>

    {#if children}
      <ul use:melt={$group({ id: path })}>
        <Tree treeItems={children} level={level + 1} />
      </ul>
    {/if}
  </li>
{/each}
