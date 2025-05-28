<script lang="ts">
  import readerModel from "$lib/models/readerModel";
</script>

{#if $readerModel.provenanceModel.lowSeverityErrors.size !== 0}
  <svg fill="#000000" width="80px" height="80px" viewBox="0 0 24 24" id="warning-alt" data-name="Flat Line" xmlns="http://www.w3.org/2000/svg" class="icon flat-line">
    <path id="secondary" d="M10.25,4.19,2.63,18a2,2,0,0,0,1.75,3H19.62a2,2,0,0,0,1.75-3L13.75,4.19A2,2,0,0,0,10.25,4.19Z" style="fill: rgb(255, 204, 0); stroke-width: 2;">
    </path>
    <line id="primary-upstroke" x1="12.05" y1="17" x2="11.95" y2="17" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5;">
    </line>
    <path id="primary" d="M12,9v4M10.25,4.19,2.63,18a2,2,0,0,0,1.75,3H19.62a2,2,0,0,0,1.75-3L13.75,4.19A2,2,0,0,0,10.25,4.19Z" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;">
    </path>
  </svg>
{/if}
{#if $readerModel.provenanceModel.medSeverityErrors.size !== 0}
  <svg fill="#000000" width="80px" height="80px" viewBox="0 0 24 24" id="warning" data-name="Flat Line" xmlns="http://www.w3.org/2000/svg" class="icon flat-line">
    <circle id="secondary" cx="12" cy="12" r="9" style="fill: rgb(255, 103, 00); stroke-width: 2;">
    </circle>
    <path id="primary" d="M21,12a9,9,0,1,1-9-9A9,9,0,0,1,21,12ZM12,7v6" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;">
    </path>
    <line id="primary-upstroke" x1="12.05" y1="17" x2="11.95" y2="17" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5;">
    </line>
  </svg>
{/if}
{#if $readerModel.provenanceModel.highSeverityErrors.size !== 0}
  <svg fill="#000000" width="80px" height="80px" viewBox="0 0 24 24" id="warning-alt-2" data-name="Flat Line" xmlns="http://www.w3.org/2000/svg" class="icon flat-line">
    <path id="secondary" d="M17.48,3.5l4.62,8a1,1,0,0,1,0,1l-4.62,8a1,1,0,0,1-.86.5H7.38a1,1,0,0,1-.86-.5l-4.62-8a1,1,0,0,1,0-1l4.62-8A1,1,0,0,1,7.38,3h9.24A1,1,0,0,1,17.48,3.5Z" style="fill: rgb(204, 2, 2); stroke-width: 2;">
    </path>
    <line id="primary-upstroke" x1="12.05" y1="17" x2="11.95" y2="17" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5;">
    </line>
    <path id="primary" d="M12,7v6M16.62,3H7.38a1,1,0,0,0-.86.5l-4.62,8a1,1,0,0,0,0,1l4.62,8a1,1,0,0,0,.86.5h9.24a1,1,0,0,0,.86-.5l4.62-8a1,1,0,0,0,0-1l-4.62-8A1,1,0,0,0,16.62,3Z" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;">
    </path>
  </svg>
{/if}
