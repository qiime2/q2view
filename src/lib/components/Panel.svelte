<script lang="ts">
  export let header: string = "";
  export let customHeaderID: string  = "";
  export let customPanelID: string  = "";
</script>

<div>
  {#if header !== ""}
    <div class="panel-header border-gray-300 rounded-t-md py-2 px-4 bg-gray-200" id={customHeaderID}>
      {header}
    </div>
  {/if}
  <div class="border border-gray-300 p-4 mb-4 {header === "" ? "rounded-md" : "rounded-b-md"}" id={customPanelID}>
    <slot>
    </slot>
  </div>
</div>

<style lang='postcss'>
  .panel-header {
    border-top-width: 1px;
    border-right-width: 1px;
    border-left-width: 1px;
  }
</style>

