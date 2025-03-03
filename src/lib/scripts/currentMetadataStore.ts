import { writable } from "svelte/store";

export const currentMetadataStore = writable<{
  currentMetadata: Array<{}>;
}>({
  currentMetadata: [],
});
