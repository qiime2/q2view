<script lang="ts">
  import provenanceModel from "$lib/models/provenanceModel";
    import { getFile } from "$lib/scripts/fileutils";
</script>

<div>
  {#each $provenanceModel.metadataMap.entries() as entry}
    {entry[0]}
    {#each entry[1] as inner}
      {inner.file}
      {inner.artifacts}
      <button on:click={async () => {
          const file = await getFile(`provenance/action/${inner.file}`, entry[0], provenanceModel.zipReader).then((data) => new Blob([data.byteArray], { type: data.type }))
          const link = document.createElement('a');

          link.href = URL.createObjectURL(file);
          link.download = inner.file;
          link.click();
          URL.revokeObjectURL(link.href);
        }
      }>
        Download
      </button>
    {/each}
  {/each}
</div>