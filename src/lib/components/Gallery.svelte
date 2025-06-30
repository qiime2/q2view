<script lang="ts">
  import GalleryCard from "$lib/components/GalleryCard.svelte";
  import { onMount } from 'svelte';

  const GALLERY_URL = "https://raw.githubusercontent.com/qiime2/library-catalog/refs/heads/main/gallery/"

  let galleryEntries: Array<Object> = [];
  let filteredGalleryEntries: Array<Object> = $state([]);

  let currentPage: number = $state(1);
  let numPages: number = $state();
  // A 1440p screen fits two rows well. A 1080p screen JUST ABOUT fits one row.
  // There are 3 cards per row.
  let numRows: number = screen.height >= 1440 ? 2 : 1;

  // We need to derive the number of columns from the screen width and then
  // derive the number of rows from a combination of the number of columns and
  // the number of cards per page. I wanted to do this in a more clever way
  // using tailwind breakpoints, but I wasn't sure how (or if that is even
  // possible), so I ended up using this instead.
  let numCols: number = $state();
  let cardsPerPage: number = $state();

  const LARGE_BREAKPOINT = 1110;
  const MEDIUM_BREAKPOINT = 980;
  const SMALL_BREAKPOINT = 768;

  onMount(() => {
    function handleResize() {
      if (window.innerWidth >= LARGE_BREAKPOINT) {
        numCols = 4;
      } else if (window.innerWidth >= MEDIUM_BREAKPOINT) {
        numCols = 3;
      } else if (window.innerWidth >= SMALL_BREAKPOINT) {
        numCols = 2;
      } else {
        numCols = 1;
      }

      cardsPerPage = numCols * numRows;
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  async function getGalleryEntries() {
    let indexJSON;

    try {
      indexJSON = await (await fetch(GALLERY_URL + "index.json")).json();
    } catch(error) {
      return;
    }

    for(const galleryEntry of indexJSON) {
      let galleryJSON = Object();

      try {
        galleryJSON = await (await fetch(GALLERY_URL + galleryEntry + '/info.json')).json();
        galleryJSON["img"] =  GALLERY_URL + galleryEntry + '/thumb.png';
      } catch(error) {
        galleryJSON["title"] = "Missing Asset";
        galleryJSON["desc"] = "This asset failed to load with the following " +
          `error: "${error}." This could be a temporary local error resolved ` +
          "by reloading the page, or it could be an issue with the site " +
          "hosting the asset.";
      }

      galleryEntries.push(galleryJSON);
    }

    filteredGalleryEntries.push(...galleryEntries);

    numPages = Math.ceil(filteredGalleryEntries.length / cardsPerPage);
  }

  function applySearchFilter() {
    const searchBar = document.getElementById("searchInput") as HTMLInputElement;
    const searchFilter = searchBar.value.toLowerCase();

    filteredGalleryEntries = galleryEntries.filter(
      (e) => String(e["title" as keyof Object].toLowerCase()).startsWith(searchFilter)
    );
  }

  function changeCardsPerPage(event: Event) {
    const inputElement = document.getElementById(
      "setCardsPerPage",
    ) as HTMLInputElement;

    const currentVal = parseInt(inputElement.value);

    // If we have something less than 1 (should only ever be 0) or a NaN
    // then set this back to what it was before
    if (currentVal < 1 || currentVal !== currentVal) {
      inputElement.value = String(cardsPerPage);
    } else {
      cardsPerPage = currentVal;
    }
  }

  $effect(() => {
    const _num_pages = Math.ceil(filteredGalleryEntries.length / cardsPerPage);

    if (_num_pages === 0) {
      numPages = 1;
    } else {
      numPages = _num_pages;
    }

    // The num_pages could drop below the current page we're on. We don't
    // want to leave ourselves on some weird empty non page
    if (currentPage > numPages) {
      currentPage = numPages;
    }
  });
</script>

<h2 class="text-2xl text-[#1a414c] font-bold">Gallery</h2>
<p class="pb-2">Don&apos;t have a QIIME 2 result of your own to view? Try one of these!</p>
<input class="roundInput" id="searchInput" placeholder="search" oninput={applySearchFilter}/>
{#await getGalleryEntries()}
  <h3>Fetching Gallery...</h3>
{:then}
  {#if galleryEntries.length === 0}
    <h3>
      No gallery entries found. Try refreshing the page. If that doesn't work
      the gallery might be down.
    </h3>
  {:else}
    <div class="grid gap-6"
         style="grid-template-columns: repeat({numCols}, minmax(0, 1fr));
                grid-template-rows: repeat({numRows}, minmax(0, 1fr));">
      {#each filteredGalleryEntries.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage) as galleryEntry}
        <GalleryCard {...galleryEntry}/>
      {/each}
    </div>
  {/if}
{/await}
<div id="pageControls" class='mt-4'>
  <div></div>
  <div class="mx-auto">
    <button
      onclick={() => {
          if (currentPage > 1) {
              currentPage--;
          }
      }}
      class="roundButton"
      aria-label="Previous Gallery Page"
    >
     <svg fill="none"
        width="10"
        height="10">
        <path
          stroke-width="3"
          stroke="rgb(119, 119, 119)"
          d="m8 0L3 5a0,2 0 0 1 1,1M3 5L8 10"/>
      </svg>
    </button>
    {currentPage}/{numPages}
    <button
      onclick={() => {
        if (currentPage < numPages) {
          currentPage++;
        }
      }}
      class="roundButton"
      aria-label="Next Gallery Page"
    >
      <svg fill="none"
        width="10"
        height="10">
        <path
          stroke-width="3"
          stroke="rgb(119, 119, 119)"
          d="m3 0L8 5a0,2 0 0 1 1,1M8 5L3 10"/>
      </svg>
    </button>
  </div>
  <div class="ml-auto">
    <span>Per Page:&nbsp;</span>
    <input
      class="roundInput"
      id="setCardsPerPage"
      type="number"
      value={cardsPerPage}
      min="1"
      onchange={changeCardsPerPage}
    />
  </div>
</div>

<style lang="postcss">
  #pageControls {
    @apply grid
    grid-cols-3
    pt-4;
  }
</style>
