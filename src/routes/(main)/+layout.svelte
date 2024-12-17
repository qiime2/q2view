<script lang="ts">
  import { env } from "$env/dynamic/public";
  import Main from "$lib/components/Main.svelte";
  import Vendored from "$lib/components/Vendored.svelte";
</script>

{#if env.PUBLIC_VENDORED}
  <Vendored />
{:else}
  <Main />
{/if}
