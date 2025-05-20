<script lang="ts">
  import "../../app.css";

  import { getFile } from "$lib/scripts/fileutils";
  import Panel from "./Panel.svelte";
  import readerModel from "$lib/models/readerModel";
</script>

<Panel header="Warning: Do not include confidential information in your metadata." customPanelClass="p-4 mb-4">
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
  <tbody>
    <tr class="border-b border-gray-400 text-gray-800">
      <th class="text-left p-1">Plugin</th>
      <th class="text-left p-1">Action</th>
      <th class="text-left p-1">Execution UUID</th>
      <th class="text-left p-1">Filename</th>
      <th class="text-left p-1">Download</th>
    </tr>
    {#each $readerModel.provenanceModel.metadata as [plugin, action, executionUUID, metadataFile, artifactUUID]}
      <tr class="border-t border-gray-300 text-gray-600">
          <td class="p-1 py-2">{plugin}</td>
          <td class="p-1">{action}</td>
          <td class="p-1">{executionUUID}</td>
          <td class="p-1">{metadataFile}</td>
          <td class="p-1 text-blue-700">
            <button onclick={async () => {
                let metadataFilePath;

                if (artifactUUID === readerModel.provenanceModel.uuid) {
                  metadataFilePath = `provenance/action/${metadataFile}`;
                } else {
                  metadataFilePath = `provenance/artifacts/${artifactUUID}/action/${metadataFile}`
                }

                const file = await getFile(
                  metadataFilePath,
                  readerModel.uuid,
                  readerModel.provenanceModel.zipReader).then(
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
  </tbody>
</table>
