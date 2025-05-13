// Source: https://svelte.dev/repl/5abaac000b164aa1aacc6051d5c4f584?version=3.59.2
import { derived, writable } from "svelte/store";

// TODO: SvelteKit claims that calling history.pushstate and history.replacestate
// causes problems for its routing. This may be true with some more advanced use cases
// but doesn't seem to be a problem for us
export function createUrlStore() {
  const href = writable(window.location.href);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const updateHref = () => href.set(window.location.href);

  history.pushState = function () {
    originalPushState.apply(this, arguments);
    updateHref();
  };

  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    updateHref();
  };

  window.addEventListener("popstate", updateHref);

  return {
    subscribe: derived(href, ($href) => new URL($href)).subscribe,
  };
}

// If you're using in a pure SPA, you can return a store directly and share it everywhere
export default createUrlStore();
