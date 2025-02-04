<script lang="ts">
  import "../../app.css";

  import readerModel from "$lib/models/readerModel";
  import loading from "$lib/scripts/loading"

  import { onMount } from "svelte";
  import url from "$lib/scripts/url-store";

  import NavButtons from "$lib/components/NavButtons.svelte";

  import { createCollapsible, createDropdownMenu, melt } from "@melt-ui/svelte";
  import { slide, fly } from "svelte/transition";

  export let vendored: boolean = false;

  onMount(() => {
    const nav_dropdown = document.getElementById("nav-dropdown") as Element;
    observer.observe(nav_dropdown);
  });

  const observer = new ResizeObserver(updateNavDropdownHeight);

  const {
    elements: { root, content, trigger: triggerCollapsible },
    states: { open: openCollapsible },
  } = createCollapsible({});

  const {
    elements: { menu, trigger: triggerDropdown },
    states: { open: openDropdown },
  } = createDropdownMenu({});

  function updateNavDropdownHeight() {
    const nav_dropdown = document.getElementById("nav-dropdown");
    const positioned_container = document.getElementById("positioned-container");

    // This entire function is predicated on this element existing and using
    // its height to offset other elements
    if (nav_dropdown === null) {
      return;
    }

    const nav_dropdown_height = nav_dropdown.clientHeight;
    const offset = 50 + nav_dropdown_height;

    if (positioned_container !== null) {
      positioned_container.style.top = `${offset}px`;
      positioned_container.style.height = `calc(100% - ${offset}px)`;
    }
  }

  function navLogoClicked() {
    // It's easiest to just calculate this here. If we do it at the top of the
    // page then we will likely do it before index path is set.
    let logoTarget = vendored ? ($readerModel.indexPath ? "/visualization/" : "/details/") : "/";

    if ($loading.status === "LOADING") {
      // If we are in the loading state go back to root and reload to force the
      // loading to stop
      history.pushState({}, "", logoTarget);
      location.reload();
    } else if ($url.pathname.replaceAll("/", "") === "error") {
      // If we are navigating away from the error page then we want to clean out
      // the errored state and push clean state
      readerModel.clear();
      history.pushState({}, "", logoTarget);
    } else {
      history.pushState({}, "", logoTarget + window.location.search);
    }
  }
</script>

<nav id="navbar" use:melt={$root}>
  <div id="nav-container">
    <button on:click={navLogoClicked}>
      <img id="navlogo" src="/images/q2view.png" alt="QIIME 2 view logo" />
    </button>
    {#if $readerModel.name}
      <ul class="mx-auto flex">
        <li id="file-text">
          File: {$readerModel.name}
        </li>
        {#if !vendored && ($readerModel.indexPath || $readerModel.rawSrc)}
          <li>
            <button title="Unload File" id="close-button" on:click={() => {
                readerModel.clear();
                history.pushState({}, "", "/");
              }}>
              <svg fill="none"
                viewBox="0 0 20 20"
                class="nav-thumbnail"
              >
                <path
                  id="close-button-path"
                  stroke-width="3"
                  stroke="rgb(119, 119, 119)"
                  d="M2 18L18 2M18 18L2 2"
                />
              </svg>
            </button>
          </li>
        {/if}
      </ul>
    {/if}
    <ul class="hidden lg:flex">
      <NavButtons {readerModel} />
    </ul>
    {#if $readerModel.indexPath || $readerModel.rawSrc}
      <div class="flex ml-auto lg:hidden">
        <button use:melt={$triggerCollapsible} class={$openCollapsible ? "selected-nav-button" : "nav-button"}>
          {#if $openCollapsible}
            <svg
              fill="none"
              viewBox="0 0 20 20"
              class="nav-thumbnail"
            >
              <title>Close Collapsible</title>
              <path
                stroke-width="3"
                stroke="black"
                d="M2 18L18 2M18 18L2 2"
              />
            </svg>
          {:else}
            <svg
              fill="none"
              viewBox="0 0 20 20"
              class="nav-thumbnail"
            >
              <title>Open Collapsible</title>
              <path
                stroke-width="3"
                stroke="black"
                d="M2 2L18 2M2 10L18 10M2 18L18 18"
              />
            </svg>
          {/if}
        </button>
      </div>
    {/if}
    <ul class="flex">
      {#if $readerModel.sourceType === "remote"}
        <li>
          <button use:melt={$triggerDropdown} class="nav-button">
            <img class="nav-thumbnail" src="/images/link-grey.png" alt="Link" />
          </button>
          {#if $openDropdown}
            <div use:melt={$menu} transition:fly id="dropdown">
              <a href={$url.toString()}>
                  Shareable Link:
              </a>
              <input
                  id="dropdown-input"
                  readOnly
                  value={$url.toString()}
                  type="text"
                  on:select={e => e.stopPropagation()}
              />
            </div>
          {/if}
        </li>
        <li>
          <button class="nav-button" onclick="location.href='{String($readerModel.rawSrc)}'" type="button">
            <img class="nav-thumbnail" src="/images/download-grey.png" alt="Download" />
          </button>
        </li>
      {/if}
    </ul>
  </div>
  <div id="nav-dropdown">
    {#if $openCollapsible}
      <ul use:melt={$content} transition:slide class="lg:hidden">
        <NavButtons {readerModel} />
      </ul>
    {/if}
  </div>
</nav>

<style lang="postcss">
  #navbar {
    width: 100vw;
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
    background-color: #f8f8f8;
    @apply fixed
    w-full
    z-10
    top-0
    left-0
    right-0;
  }

  #nav-container {
    @apply flex
    max-w-7xl
    mx-auto
    px-2;
  }

  #navlogo {
    width: 125px;
    height: 40px;
    @apply my-1;
  }

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

  #file-text {
    margin: auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 500px;
    @apply hidden
    lg:block;
  }

  #close-button {
    @apply w-full
    h-full
    p-3;
  }

  #close-button:hover #close-button-path {
    stroke: red;
  }

  .nav-thumbnail {
    height: 20px;
    width: 20px;
  }

  :global(.nav-button) {
    @apply w-full
    h-full
    p-3;
  }

  :global(.nav-button:hover) {
    @apply bg-gray-300;
  }

  :global(.selected-nav-button) {
    @apply w-full
    h-full
    p-3
    bg-gray-200;
  }

  :global(.selected-nav-button:hover) {
    @apply bg-gray-300;
  }
</style>