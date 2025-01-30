<script lang="ts">
  import "../../app.css";

  import readerModel from "$lib/models/readerModel";

  import url from "$lib/scripts/url-store";
  import loading from "$lib/scripts/loading";

  import Iframe from "$lib/components/Iframe.svelte";
  import Gallery from "$lib/components/Gallery.svelte";
  import Citations from "$lib/components/Citations.svelte";
  import DropZone from "$lib/components/DropZone.svelte";
  import UrlInput from "$lib/components/UrlInput.svelte";
  import Provenance from "$lib/components/Provenance.svelte";
  import About from "$lib/components/About.svelte";
  import Error from "$lib/components/Error.svelte";
  import Loading from "$lib/components/Loading.svelte";

  let loadingComponent: undefined | HTMLElement;
</script>

<div id="positioned-container">
  <div id="content-container">
    <div
      class={$url.pathname.replaceAll("/", "") === "" && $loading.status !== "LOADING" ? "tab" : "hidden-tab"}
    >
      <p class="pb-4">
        This interface can view .qza and .qzv files directly in your browser
        without uploading to a server.
        <a
          href="#"
          on:click={() =>
            history.pushState({}, "", "/about/" + window.location.search)}
          >Click here to learn more.
        </a>
      </p>
      <DropZone />
      <UrlInput />
      <Gallery />
    </div>
    <div
      class={$url.pathname.replaceAll("/", "") === "about" && $loading.status !== "LOADING"
        ? "tab"
        : "hidden-tab"}
    >
      <About />
    </div>
    <div
      class={$url.pathname.replaceAll("/", "") === "error" && $loading.status !== "LOADING"
        ? "tab"
        : "hidden-tab"}
    >
      <Error />
    </div>
    {#if $loading.status === "LOADING"}
      <div class="tab" bind:this={loadingComponent}>
        <Loading />
      </div>
    {/if}
    {#if $readerModel.indexPath}
      <div
        class={$url.pathname.replaceAll("/", "") === "visualization" && $loading.status !== "LOADING"
          ? "tab"
          : "hidden-tab"}
      >
        <Iframe />
      </div>
    {/if}
    {#if $readerModel.rawSrc}
      <div
        class={$url.pathname.replaceAll("/", "") === "citations" && $loading.status !== "LOADING"
          ? "tab"
          : "hidden-tab"}
      >
        <Citations />
      </div>
      <!-- Extra class baggage to make this tab fullscreen -->
      <div
        class={$url.pathname.replaceAll("/", "") === "provenance" && $loading.status !== "LOADING"
          ? `tab provenance`
          : "hidden-tab"}
      >
        <Provenance />
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  #positioned-container {
    position: absolute;
    top: 50px;
    width: 100%;
    height: calc(100% - 50px);
    overflow: auto;
    /* Prevent content from repositioning in Chromium when a scrollbar appears */
    scrollbar-gutter: stable both-edges;
  }

  #content-container {
    display: grid;
    @apply mx-auto
    px-10
    max-w-7xl;
  }

  /* If we need to slap an alert notice at the top of the page use this
     class */
  #notice-banner {
    @apply text-center
    bg-red-200
    border
    border-red-300
    mb-4
    py-4
    rounded-lg;
  }

  .tab {
    margin-top: 21px;
    grid-column: 1;
    grid-row: 1;
    visibility: visible;
    overflow: hidden;
    /* This padding is to accomodate the dropshadow on the DropZone */
    padding-right: 10px;
    @apply mb-4;
  }

  /* Hoist this up here because the absolute will cause the scrollbar to persist
     across tabs if we do not remove this class as needed */
  .provenance {
    left: 0%;
    @apply lg:absolute
    lg:grid
    lg:grid-cols-[70%_30%]
    w-full
    gap-2;
  }

  .hidden-tab {
    grid-column: 1;
    grid-row: 1;
    height: 0;
    visibility: hidden;
    overflow: hidden;
  }
</style>
