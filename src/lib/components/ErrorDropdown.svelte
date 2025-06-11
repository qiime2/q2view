<script lang="ts">
  import "../../app.css"

  import { createDropdownMenu, melt } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";

  export let errors;
  export let svgPath;

  const {
    elements: { menu, item, trigger: triggerDropdown },
    states: { open: openDropdown },
  } = createDropdownMenu({});
</script>

<div class="flex cursor-pointer" use:melt={$triggerDropdown}>
  <img src="{svgPath}" />
  <div class="float-right flex items-center pl-2 text-2xl font-bold">
    {errors.size}
  </div>
</div>
{#if $openDropdown}
  <div use:melt={$menu} transition:fly id="dropdown">
    {#each errors as error}
      <div use:melt={$item}>{error.name}</div>
    {/each}
  </div>
{/if}

<style lang="postcss">
  #dropdown {
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
    @apply absolute
    border
    border-gray-300
    rounded
    h-auto
    p-1
    bg-gray-100
    z-10;
  }

  #dropdown-input {
    @apply border
    border-gray-300
    rounded
    w-full
  }
</style>
