<script lang="ts">
  import provenanceModel from "$lib/models/provenanceModel";
  import { getFile } from "$lib/scripts/fileutils";
</script>

<table>
  <tr>
    <th>Artifact UUID</th>
    <th>File Name</th>
    <th>Download</th>
  </tr>
  {#each $provenanceModel.metadataMap.entries() as entry}
    <tr>
      <td>{entry[0]}</td>
      {#each entry[1] as inner}
        <td>{inner.file}</td>
        <td>
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
        </td>
      {/each}
      </tr>
  {/each}
  </table>

<style lang="postcss">
  table {
    @apply border
    border-solid
    border-gray-300;
  }
</style>