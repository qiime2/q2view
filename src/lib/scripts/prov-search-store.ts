import { writable } from "svelte/store";

export const provSearchStore = writable<{
  searchHits: Set<string>;
}>({
  searchHits: new Set(),
});
