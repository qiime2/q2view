<script lang="ts">
  import url from "$lib/scripts/url-store";

  export let readerModel;
</script>

{#if $readerModel.indexPath}
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "visualization" ? "selected-nav-button nav-button" : "nav-button"}
        on:click={() => (history.pushState({}, "", "/visualization/"+window.location.search))}
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
        on:click={() => (history.pushState({}, "", "/citations/"+window.location.search))}
        title='Citations'
    >
      Citations
    </button>
  </li>
  <li>
    <button
        class={$url.pathname.replaceAll("/", "") === "provenance" ? "selected-nav-button nav-button" : "nav-button"}
        on:click={() => (history.pushState({}, "", "/provenance/"+window.location.search))}
        title='Provenance'
    >
      Provenance
    </button>
  </li>
{/if}
