<script lang="ts">
  import "../../app.css"
  import readerModel from "$lib/models/readerModel";
  import ErrorDropdown from "./ErrorDropdown.svelte";
</script>

<!-- TODO: Clean up functionality and styling here -->
{#if $readerModel.provenanceModel.highSeverityErrors.size !== 0}
  <ErrorDropdown errors={$readerModel.provenanceModel.highSeverityErrors} svgPath={"/images/hi-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.medSeverityErrors.size !== 0}
  <ErrorDropdown errors={$readerModel.provenanceModel.medSeverityErrors} svgPath={"/images/medium-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.lowSeverityErrors.size !== 0}
  <ErrorDropdown errors={$readerModel.provenanceModel.lowSeverityErrors} svgPath={"/images/low-severity-error.svg"} />
{/if}
