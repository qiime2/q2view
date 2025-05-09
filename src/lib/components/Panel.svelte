<script lang="ts">
  interface Props {
    header?: string;
    customHeaderClass?: string;
    customPanelClass?: string;
    children?: import('svelte').Snippet;
  }

  let {
    header = "",
    customHeaderClass = "",
    customPanelClass = "",
    children
  }: Props = $props();
</script>

<div>
  {#if header !== ""}
    <div class="panel-header border-gray-300 rounded-t-md py-2 px-4 bg-gray-200 {customHeaderClass}">
      {header}
    </div>
  {/if}
  <div class="border border-gray-300 {header === "" ? "rounded-md" : "rounded-b-md"} {customPanelClass}">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style lang='postcss'>
  .panel-header {
    border-top-width: 1px;
    border-right-width: 1px;
    border-left-width: 1px;
  }
</style>

