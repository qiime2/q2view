import { writable } from "svelte/store";

export const currentMetadataStore = writable<{
  currentMetadata: Set<string>;
}>({
  currentMetadata: new Set(),
});
