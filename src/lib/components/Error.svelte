<script>
    import readerModel from "$lib/models/readerModel";
    import Panel from "$lib/components/Panel.svelte";
</script>

<div class="container">
  <h1 class="pb-2">{$readerModel.error}</h1>
  <Panel customPanelClass="p-4 mb-4">
    <div class="border border-red-300 rounded-md bg-red-100 p-4">
      <div role="alert">
        {$readerModel.errorMessage}
      </div>
    </div>
  </Panel>
    <p><strong>
      Please see the <a href="/about/#troubleshooting">troubleshooting section
    </a> for assistance.</strong></p>
</div>