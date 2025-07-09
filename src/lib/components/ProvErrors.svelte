<script lang="ts">
  import readerModel from "$lib/models/readerModel";
  import ErrorDropdown from "./ErrorDropdown.svelte";
</script>

<!-- TODO: Clean up functionality and styling here -->
{#if $readerModel.provenanceModel.errors.get(2) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(2)} svgPath={"/images/hi-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.errors.get(1) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(1)} svgPath={"/images/medium-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.errors.get(0) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(0)} svgPath={"/images/low-severity-error.svg"} />
{/if}
