<script lang="ts">
  import "../../app.css"

  import { createDropdownMenu, melt } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";

  export let errors;
  export let svgPath;

  function _searchProvForError(errorQuery: string) {
    let provSearchForm = document.getElementById("provSearchForm") as HTMLFormElement;
    let provSearchInput = document.getElementById("provSearchInput") as HTMLInputElement;

    provSearchInput.value = errorQuery;
    provSearchForm.requestSubmit();
  }

  const {
    elements: { menu, trigger: triggerDropdown },
    states: { open: openDropdown },
  } = createDropdownMenu({});
</script>

<button use:melt={$triggerDropdown} class="flex">
  <img src="{svgPath}" alt="{svgPath}"/>
  <div class="float-right flex items-center pl-2 text-2xl font-bold">
    {errors.size}
  </div>
</button>
{#if $openDropdown}
  <div use:melt={$menu} transition:fly id="dropdown">
    {#each errors as error}
      <button onclick={() => _searchProvForError('qiime2: ^"2024"')}>{error.name}</button>
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
