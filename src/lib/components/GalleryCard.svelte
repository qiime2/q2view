<script lang="ts">
  interface Props {
    img: string;
    title: string;
    desc: string;
    href: string;
  }

  let {
    img,
    title,
    desc,
    href
  }: Props = $props();

  // This function ensures that every time you click a "Try it!" button the referenced
  // viz reloads entirely to have consistent behavior
  function galleryButton() {
    history.pushState({}, "", "/visualization/?src=" + href);
  }
</script>

<div class="gallery-card">
  <h3 class="pb-2 text-lg font-bold text-[#1a414c] shrink-0">{title}</h3>
  <img src={img} alt={title} class="pb-2 flex-grow min-w-0 min-h-0">
  <p class="description shrink-0 flex-grow pb-2">{desc}</p>
  <button class="gallery-button shrink-0 grid grid-flow-col items-center gap-1" onclick={galleryButton}>
    Start
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
      <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
    </svg>
  </button>
</div>

<style lang='postcss'>
  .gallery-card {
    position: relative;
    height: 400px;
    display: flex;
    flex-direction: column;
    @apply border
    rounded-lg
    bg-white
    shadow-md
    p-5 pt-3;
  }

  .description {
    font-size: 14px;
    flex: 1;
  }

  .gallery-button {
    @apply bg-[#1a414c]
    text-white
    self-end
    w-max
    rounded-md
    py-1
    pl-3 pr-2;
  }

  .gallery-button:hover {
    @apply bg-blue-600;
  }
</style>