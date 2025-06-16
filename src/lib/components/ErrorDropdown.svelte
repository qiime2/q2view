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
    <div>
      Search Provenance for Error:
    </div>
    {#each errors as error}
    <div>
      <button onclick={() => _searchProvForError(error.query)} class="border rounded-md p-2 m-2 bg-gray-300">{error.name}</button>
    </div>
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
