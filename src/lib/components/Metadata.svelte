<script lang="ts">
  import "../../app.css";

  import provenanceModel from "$lib/models/provenanceModel";
  import { getFile } from "$lib/scripts/fileutils";
  import Panel from "./Panel.svelte";
    import readerModel from "$lib/models/readerModel";
</script>

<Panel header="Warning: Do not include confidential information in your metadata.">
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
  <tr class="border-b border-gray-400 text-gray-800">
    <th class="text-left p-1">Artifact UUID</th>
    <th class="text-left p-1">File Name</th>
    <th class="text-left p-1">Download</th>
  </tr>
  {#each $provenanceModel.metadataMap.entries() as [uuid, metadataFiles]}
    {#each metadataFiles as metadataFile}
      <tr class="border-t border-gray-300 text-gray-600">
          <td class="p-1 py-2">{uuid}</td>
          <td class="p-1">{metadataFile}</td>
          <td class="p-1 text-blue-700">
            <button on:click={async () => {
                let metadataFilePath;

                if (uuid === provenanceModel.uuid) {
                  metadataFilePath = `provenance/action/${metadataFile}`;
                } else {
                  metadataFilePath = `provenance/artifacts/${uuid}/action/${metadataFile}`
                }

                const file = await getFile(
                  metadataFilePath,
                  readerModel.uuid,
                  provenanceModel.zipReader).then(
                    (data) => new Blob(
                      [data.byteArray],
                      { type: data.type }
                    )
                  )
                const link = document.createElement('a');

                link.href = URL.createObjectURL(file);
                link.download = metadataFile;
                link.click();
                URL.revokeObjectURL(link.href);
              }
            }
            class="hover:text-gray-600">
              Download
            </button>
          </td>
      </tr>
    {/each}
  {/each}
</table>
