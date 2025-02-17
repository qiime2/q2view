<script lang="ts">
  import loading from '$lib/scripts/loading'
</script>

<h2 class="mt-5">
  Loading: {$loading.message}
</h2>
<div id="loader"></div>

<style lang="postcss">
  #loader {
    position: absolute;
    border: 16px solid;
    border-top: 16px solid;
    border-radius: 50%;
    width: 120px;
    height: 120px;
    animation: spin 2s linear infinite;
    left: calc(50% - 60px);
    padding-top: 10px;

    @apply border-t-blue-300
    border-gray-300;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
