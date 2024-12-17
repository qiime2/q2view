<script lang="ts">
  import readerModel from "$lib/models/readerModel";

  let files: FileList;
  let isDragging = false;
  let isSelected = false;

  function onDragOver(event: DragEvent) {
    isDragging = true;
    event.preventDefault();
  }

  function onDragLeave(event: DragEvent) {
    isDragging = false;
  }

  function onDrop(event: DragEvent) {
    isDragging = false;
    event.preventDefault();

    let items = event.dataTransfer?.files;

    if (items !== undefined) {
      files = items;
    }
  }

  function fileChange(event) {
    // Reset to null so using the same file multiple times works
    event.target.value = null;
  }

  $: if (files) {
    if (files.length < 1) {
      // Do nothing.
      //
      // If you open the file input window then close it, you get an empty file
      // list which can trigger this code. If this code was triggered with no
      // files just ignore it
    } else if (files.length > 1) {
      alert("Please only provide a single file.");
    } else {
      console.log(files[0]);
      readerModel.readData(files[0]);
    }
  }
</script>

<!-- I couldn"t find a good answer for what ARIA role to give this, but the
  linter told me I needed one -->
<div
  id="dropzone"
  class:isDragging
  class:isSelected
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  role="button"
  tabindex="0"
>
  <input id="dropinput" bind:files on:change={(event) => fileChange(event)} type="file" accept=".qza, .qzv"/>
  <div class="text-xl text-gray-700 text-center">
    <h1 class="mt-2.5 mb-1 text-4xl">Drag and drop or click here</h1>
    to view a QIIME 2 Artifact or Visualization (.qza/.qzv) from your computer.
  </div>
</div>

<style lang="postcss">
  #dropzone {
    box-shadow: rgb(153, 153, 153) 5px 5px 5px;
    @apply relative
      border-4
      border-dashed
      border-gray-300
      rounded-lg
      w-full
      p-12
      bg-gray-100
      mb-4;
  }

  #dropzone.isDragging {
    @apply border-solid
      shadow-inner
      font-bold
  }

  #dropinput {
    @apply cursor-pointer
    opacity-0
    absolute
    top-0
    right-0
    bottom-0
    left-0
    w-full
    h-full;
  }
</style>