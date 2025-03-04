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