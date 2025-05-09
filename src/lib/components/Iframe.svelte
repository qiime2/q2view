<script lang="ts">
  import readerModel from "$lib/models/readerModel";
  import { getScrollBarWidth } from "$lib/scripts/util";
</script>

<iframe
  title="visualization"
  id="iframe"
  frameborder="0"
  src={$readerModel.indexPath}
  style:left={`calc(0% - ${getScrollBarWidth()}px)`}
  style:width={`calc(100% + 2 * ${getScrollBarWidth()}px)`}
></iframe>

<!-- Position this manually so it takes up basically the entire viewport -->
<style lang="postcss">
  #iframe {
    @apply absolute
    w-full
    h-full;
  }
</style>