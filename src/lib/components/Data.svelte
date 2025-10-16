<script lang="ts">
  import { createTreeView } from '@melt-ui/svelte';
  import { setContext } from 'svelte';
  import { getFile } from '$lib/scripts/fileutils';

  import Tree from '$lib/components/Tree.svelte';
  import readerModel from '$lib/models/readerModel';

  let ctx;
  let tree;

  _getTree();

  function _getTree() {
    ctx = createTreeView({
      defaultExpanded: [$readerModel.uuid, `${readerModel.uuid}/data`],
    });
    setContext('tree', ctx);
    tree = ctx.elements.tree;
  }
</script>

<div
  class="flex overflow-y-auto flex-col border rounded-md mb-2 ml-2"
>
  <div class="flex border-b border-solid border-gray-300 pb-2 pt-4 px-4 mb-4">
    <button onclick={() => readerModel.selectedTab = "data"} class="nav-button float-left mx-auto w-1/2 pb-0.5 {readerModel.selectedTab === "data" ? "selected-nav-button" : ""}">
      Your Data
    </button>
    <button onclick={() => readerModel.selectedTab = "artifact"} class="nav-button float-right mx-auto w-1/2 pb-0.5 {readerModel.selectedTab === "artifact" ? "selected-nav-button" : ""}">
      Artifact Structure
    </button>
  </div>

  {#if $readerModel.fileTree.length > 0}
    {_getTree()}
    {#if readerModel.selectedTab === "data"}
      <ul class="overflow-auto px-4 pb-4 text-lg" {...$tree}>
        <Tree treeItems={readerModel.fileTree[0].children?.find((element) => element.path === `${readerModel.uuid}/data`)?.children} level={1} />
      </ul>
    {:else if readerModel.selectedTab === "artifact"}
      <ul class="overflow-auto px-4 pb-4 text-lg" {...$tree}>
        <Tree treeItems={readerModel.fileTree} level={1} />
      </ul>
    {/if}
  {/if}
</div>
<div class="border rounded-md overflow-auto mb-2 mr-2">
  {#if $readerModel.selectedFile !== ""}
    <div class="flex border-b border-solid border-gray-300 pb-2 pt-4 px-4 mb-4">
      <div class="float-left">
        Filepath: {$readerModel.selectedFile}
      </div>
      <button class="download-button float-right ml-auto my-auto mr-2" onclick={async () => {
          const split = readerModel.selectedFile.split('/');
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
          link.download = pathWithoutUUID;
          link.click();
          URL.revokeObjectURL(link.href);
        }
      }>Download
      </button>
    </div>
  {/if}
  <pre class="pl-2 {readerModel.selectedFile === "" ? "pt-2" : ""}">
{$readerModel.filePreviewText}
  </pre>
</div>

<style lang='postcss'>
  .download-button {
    @apply bg-[#1a414c]
    text-white
    self-end
    w-max
    rounded-md
    py-1
    pl-3 pr-2;
  }

  .download-button:hover {
    @apply bg-blue-600;
  }
</style>
