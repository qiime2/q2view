import { writable } from "svelte/store";

export const provSearchStore = writable<{
  searchHits: Array<string>;
}>({
  searchHits: [],
});
