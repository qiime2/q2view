<script lang="ts">
  import "../../app.css";

  import provenanceModel from "$lib/models/provenanceModel";
  import { getFile } from "$lib/scripts/fileutils";
  import Panel from "./Panel.svelte";
</script>

<Panel header="Note About Metadata:">
  <p>
    QIIME 2 goes to great lengths to ensure that your bioinformatics workflow
    will be reproducible. This includes recording information about your analysis
    inside of your Results’ data provenance, and the recorded information includes
    metadata that you provided to run specific commands. For this and other reasons,
    we strongly recommend that you never include confidential information, such
    as Personally Identifying Information (PII), in your QIIME 2 metadata. Because
    QIIME 2 stores metadata in your data provenance, confidential information that
    you use in a QIIME 2 analysis will persist in downstream Results.
  </p>
  <br>
  <p>
    Instead of including confidential information in your metadata, you should
    encode it with variables that only authorized individuals have access to.
    For example, subject names should be replaced with anonymized subject identifiers
    before use with QIIME 2.
  </p>
</Panel>
<table class="w-full">
  <tr class="border-b border-gray-300">
    <th class="border-r border-gray-300">Artifact UUID</th>
    <th class="border-r border-gray-300">File Name</th>
    <th>Download</th>
  </tr>
  {#each $provenanceModel.metadataMap.entries() as entry}
    <tr class="border-b border-gray-300">
      <td class="border-r border-gray-300 p-1">{entry[0]}</td>
      <!-- TODO: We need to in some way handle multiple files in one artifact and dedup
           dedup ought to be doable on name. A given artifact cannot have multiple files of the same name in its provenance dir
           so multiple references to the same name must be the same file -->
      {#each entry[1] as inner}
        <td class="border-r border-gray-300 p-1">{inner.file}</td>
        <td class="p-1">
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