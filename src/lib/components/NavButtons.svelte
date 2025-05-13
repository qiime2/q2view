<script lang="ts">
  import readerModel from "$lib/models/readerModel";
  import url from "$lib/scripts/url-store";
</script>

{#if $readerModel.indexPath}
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "visualization" ? "selected-nav-button nav-button" : "nav-button"}
        onclick={() => (history.pushState({}, "", "/visualization/"+window.location.search))}
        title='Visualization'
    >
      Visualization
    </button>
  </li>
{/if}
{#if $readerModel.rawSrc}
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "citations" ? "selected-nav-button nav-button" : "nav-button"}
        onclick={() => (history.pushState({}, "", "/citations/"+window.location.search))}
        title='Citations'
    >
      Citations
    </button>
  </li>
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "provenance" ? "selected-nav-button nav-button" : "nav-button"}
        onclick={() => (history.pushState({}, "", "/provenance/"+window.location.search))}
        title='Provenance'
    >
      Provenance
    </button>
  </li>
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "metadata" ? "selected-nav-button nav-button" : "nav-button"}
        onclick={() => (history.pushState({}, "", "/metadata/"+window.location.search))}
        title='Metadata'
    >
      Metadata
    </button>
  </li>
{/if}
