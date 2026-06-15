<script lang="ts">
    import { read } from "$app/server";
  import readerModel from "$lib/models/readerModel";

  import { createDropdownMenu, melt } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";

  export let annotations;
  export let svgPath;

  function _searchProvForAnnotations() {
    let provSearchForm = document.getElementById("provSearchForm") as HTMLFormElement;
    let provSearchInput = document.getElementById("provSearchInput") as HTMLInputElement;
    const annotationQuery = _buildAnnotationQuery();

    provSearchInput.value = annotationQuery;
    provSearchForm.requestSubmit();

    // readerModel.provenanceModel.provTab = "error";
  }

  function _buildAnnotationQuery() {
    const keys = [...readerModel.provenanceModel.nodeIDToAnnotations.keys()];
    let query = `uuid: ("${keys[0]}"`

    for (let i = 1; i < keys.length; i++) {
      query += ` OR "${keys[i]}"`;
    }

    query += ")";
    return query
  }

  const {
    elements: { menu, trigger: triggerDropdown },
    states: { open: openDropdown },
  } = createDropdownMenu({});
</script>

<button use:melt={$triggerDropdown} class="flex p-0.5">
  <img height="36px" width="36px" src="{svgPath}" alt="{svgPath}"/>
  <div class="float-right flex items-center pl-2 text-2xl font-bold">
    {annotations.size}
  </div>
</button>
{#if $openDropdown}
  <div use:melt={$menu} transition:fly id="dropdown">
    <div>
      Search Provenance for Annotations:
    </div>
    <div>
      <button onclick={() => _searchProvForAnnotations()} class="roundButton textButton my-1">Annotations</button>
    </div>
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

  .textButton {
    @apply border
    border-gray-300
    bg-gray-200
    mx-1
    px-2
    py-1;
  }

  .textButton:hover {
    @apply bg-gray-300;
  }

  button:hover {
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
  }
</style>
