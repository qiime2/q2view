<script lang="ts">
  import readerModel from "$lib/models/readerModel";
  import AnnotationDropdown from "./AnnotationDropdown.svelte";
  import ErrorDropdown from "./ErrorDropdown.svelte";
</script>

{#if $readerModel.provenanceModel.nodeIDToAnnotations.size !== 0}
  <AnnotationDropdown annotations={$readerModel.provenanceModel.nodeIDToAnnotations.size} svgPath={"/images/annotation.svg"} />
{/if}
{#if $readerModel.provenanceModel.errors.get(2) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(2)} svgPath={"/images/hi-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.errors.get(1) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(1)} svgPath={"/images/medium-severity-error.svg"} />
{/if}
{#if $readerModel.provenanceModel.errors.get(0) !== undefined}
  <ErrorDropdown errors={$readerModel.provenanceModel.errors.get(0)} svgPath={"/images/low-severity-error.svg"} />
{/if}
<!-- {#if $readerModel.provenanceModel.errors.get(2) !== undefined} -->
  <ErrorDropdown errors={2} svgPath={"/images/hi-severity-error.svg"} />
<!-- {/if} -->
<!-- {#if $readerModel.provenanceModel.errors.get(1) !== undefined} -->
  <ErrorDropdown errors={2} svgPath={"/images/medium-severity-error.svg"} />
<!-- {/if} -->
<!-- {#if $readerModel.provenanceModel.errors.get(0) !== undefined} -->
  <ErrorDropdown errors={2} svgPath={"/images/low-severity-error.svg"} />
<!-- {/if} -->
