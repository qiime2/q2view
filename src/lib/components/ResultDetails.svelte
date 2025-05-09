
<script lang="ts">
  interface Props {
    name?: string | null;
    resultJSON: {};
  }

  let { name = null, resultJSON }: Props = $props();
</script>

<ul>
  {#if name !== null}
    <li>
      <span>
        name:
      </span>
      "{name}"
    </li>
  {/if}
  <li>
    <span>
      uuid:
    </span>
    "{resultJSON.uuid}"
  </li>
  <li>
    <span>
      type:
    </span>
    "{resultJSON.type}"
  </li>
<!-- TODO: This way of styling this sucks. I need to more generically
  style strings vs non-strings in these json dumps -->
{#if resultJSON.format === null}
  <li id="null">
    <span>
      format:
    </span>
    {resultJSON.format}
  </li>
{:else}
  <li>
    <span>
      format:
    </span>
    "{resultJSON.format}"
  </li>
{/if}
</ul>

<style lang="postcss">
  li {
    @apply text-green-700;
  }

  span {
    @apply text-blue-700;
  }

  #null {
    @apply text-red-700;
  }
</style>
