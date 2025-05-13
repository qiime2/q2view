<script lang="ts">
  import "../../app.css";

  import readerModel from "$lib/models/readerModel";
  import loading from "$lib/scripts/loading"

  import url from "$lib/scripts/url-store";

  import NavButtons from "$lib/components/NavButtons.svelte";

  import { createCollapsible, createDropdownMenu, melt } from "@melt-ui/svelte";
  import { slide, fly } from "svelte/transition";
  import NavBanner from "./NavBanner.svelte";

  interface Props {
    vendored?: boolean;
  }

  let { vendored = false }: Props = $props();

  // Height of the navbar is bound to this var
  let nav_bar_height: number | undefined = $state();

  const {
    elements: { root, content, trigger: triggerCollapsible },
    states: { open: openCollapsible },
  } = createCollapsible({});

  const {
    elements: { menu, trigger: triggerDropdown },
    states: { open: openDropdown },
  } = createDropdownMenu({});

  $effect(() => {
    const positioned_container = document.getElementById("positioned-container");

    // Offset the container based on the current height of the navbar
    if (positioned_container !== null) {
      positioned_container.style.top = `${nav_bar_height}px`;
      positioned_container.style.height = `calc(100% - ${nav_bar_height}px)`;
    }
  });

  function navLogoClicked(event: MouseEvent) {
    // It's easiest to just calculate this here. If we do it at the top of the
    // page then we will likely do it before index path is set.
    const logoTarget = vendored ? ($readerModel.indexPath ? "/visualization/" : "/citations/") : "/";

    if (event.ctrlKey || event.metaKey) {
      return;
    } else {
      event.preventDefault();
    }

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

<svelte:head>
  {#if $readerModel.name}
  <title>{$readerModel.name} - QIIME 2 View</title>
  {:else}
  <title>QIIME 2 View</title>
  {/if}
</svelte:head>

<nav id="navbar" use:melt={$root} bind:offsetHeight={nav_bar_height}>
  {#if !vendored}
    <NavBanner/>
  {/if}
  <div class="nav-wrapper mx-2">
    <div id="nav-container" class="max-width">
      <button onclick={navLogoClicked} class='ml-1'>
        <a href='/'><img id="navlogo" src="/images/q2view.png" alt="QIIME 2 view logo" /></a>
      </button>
      {#if $readerModel.name}
        <ul class="mx-auto flex">
          <li id="file-text">
            File: <span class='font-bold'>{$readerModel.name}</span>
          </li>
          {#if !vendored && ($readerModel.indexPath || $readerModel.rawSrc)}
            <li>
              <button title="Unload File" id="close-button" onclick={() => {
                  readerModel.clear();
                  history.pushState({}, "", "/");
                }}
                aria-label="Unload File">
                <svg fill="none"
                  viewBox="0 0 20 20"
                  class="size-3"
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
      <!-- If the screen is wide enough slap the buttons here in a grid -->
      <ul class="hidden lg:grid grid-flow-col gap-6 items-center">
        <NavButtons/>
      </ul>
      <!-- If it isn't wide enough make them collapsible -->
      {#if $readerModel.rawSrc}
        <div class="flex ml-auto lg:hidden">
          <button use:melt={$triggerCollapsible} class={$openCollapsible ? "selected-nav-button" : "nav-button"}>
            {#if $openCollapsible}
              <svg
                fill="none"
                viewBox="0 0 20 20"
                stroke-width="3"
                class="size-5"
                stroke="currentColor"
              >
                <title>Close Collapsible</title>
                <path
                  d="M2 18L18 2M18 18L2 2"
                />
              </svg>
            {:else}
              <svg
                fill="none"
                viewBox="0 0 20 20"
                stroke-width="3"
                class="size-5"
                stroke="currentColor"
              >
                <title>Open Collapsible</title>
                <path
                  d="M2 2L18 2M2 10L18 10M2 18L18 18"
                />
              </svg>
            {/if}
          </button>
        </div>
      {/if}
      <ul class="grid grid-flow-col items-center gap-6">
        {#if $readerModel.sourceType === "remote"}
          <li class='ml-6'>
            <button use:melt={$triggerDropdown} class="nav-button">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
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
                    onselect={e => e.stopPropagation()}
                />
              </div>
            {/if}
          </li>
          <li>
            <button class="nav-button" onclick={() => location.href=`${String($readerModel.rawSrc)}`} type="button" aria-label="Download Result">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          </li>
        {/if}
      </ul>
    </div>
    <div id="nav-dropdown">
      {#if $openCollapsible}
        <ul use:melt={$content} transition:slide class="lg:hidden">
          <NavButtons />
        </ul>
      {/if}
    </div>
  </div>
</nav>

<style lang="postcss">
  #navbar {
    width: 100vw;
    font-size: 16px;
    box-shadow: rgb(153, 153, 153) 0px 1px 5px;
    @apply fixed
    bg-[#fcfcfc]
    w-full
    z-10
    top-0
    left-0
    right-0;
  }

  .nav-wrapper {
    scrollbar-gutter: stable;
    overflow: hidden;
  }

  #nav-container {
    height: 48px;
    @apply flex
    mx-auto
    text-[#636363]
    pl-2 pr-3;
  }

  #navlogo {
    @apply my-1 h-10;
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
    @apply
    max-w-[100px]
    lg:max-w-[500px]
    md:max-w-[350px]
    sm:max-w-[200px];
  }

  #close-button {
    @apply w-full
    h-full
    p-3;
  }

  #close-button:hover #close-button-path {
    stroke: red;
  }

  :global(.nav-button) {
    @apply block
    border-b-4
    border-b-transparent;
  }

  :global(.nav-button:hover) {
    @apply text-gray-950;
  }

  :global(.selected-nav-button) {
    @apply
    font-bold
    text-gray-950
    border-b-[#e39e54];
  }

  :global(.nav-button::before) {
    @apply font-bold;
    display: block;
    content: attr(title);
    height: 1px;
    width: max-content;
    color: transparent;
    overflow: hidden;
    visibility: hidden;
  }
</style>