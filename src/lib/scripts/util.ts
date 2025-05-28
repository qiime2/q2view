import readerModel from "$lib/models/readerModel";
import type cytoscape from "cytoscape";

// This value is multiplied by the height of the graph in nodes to get the
// height of the graph in pixels. It is the height of a node in the graph plus
// a bit of padding on top and bottom.
export const HEIGHT_MULTIPLIER_PIXELS = 105;

export const readBlobAsText = (blob) =>
  new Promise((resolve, reject) => {
    // eslint-disable-line no-unused-vars
    const reader = new FileReader();
    reader.onload = (event) => {
      // eslint-disable-line no-unused-vars
      resolve(reader.result);
    };
    reader.readAsText(blob, "utf8");
  });

export const timeoutAt = (timeout, reason = "Timed out") =>
  new Promise((resolve, reject) => {
    // eslint-disable-line no-unused-vars
    setTimeout(() => {
      reject(reason);
    }, timeout);
  });

export const waitUntil = (condition) =>
  new Promise((resolve, reject) => {
    // eslint-disable-line no-unused-vars
    const checkCondition = () => {
      const isCondition = condition();
      if (isCondition) {
        resolve(isCondition);
      } else {
        setTimeout(checkCondition, 5);
      }
    };
    checkCondition();
  });

export const parseFileNameFromURL = (urlString) =>
  new URL(urlString).pathname.split("/").pop();

export function checkBrowserCompatibility() {
  if (typeof window.navigator === "undefined") {
    redirectToIncompatibleBrowser();
  }

  if (typeof window.navigator.serviceWorker === "undefined") {
    redirectToIncompatibleBrowser();
  }

  if (typeof window.MessageChannel === "undefined") {
    redirectToIncompatibleBrowser();
  }

  if (typeof window.history === "undefined") {
    redirectToIncompatibleBrowser();
  }

  if (typeof window.history.pushState === "undefined") {
    redirectToIncompatibleBrowser();
  }
}

function redirectToIncompatibleBrowser() {
  history.replaceState({}, "", "/incompatible/");
  location.reload();
}

export function handleError(msg: string, error = "Something went wrong!") {
  readerModel.error = error;
  readerModel.errorMessage = msg;
  readerModel._dirty();
  history.replaceState({}, "", `/error/?src=${readerModel.urlSrc}`);
}

// TODO: Maybe we calculate this once then memoize it? Is it possible for it to
// change?
//
// Adapted from https://stackoverflow.com/a/8079681
//
// Creates an invisible div with a 100% width child that overflows in y then
// calculates the difference between the width of the outer div and the width
// of the inner div with the scroll.
export function getScrollBarWidth() {
  // Create outer div
  const outer = document.createElement("div");
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "scroll";

  // Create inner div that is taller than inner div
  const inner = document.createElement("p");
  inner.style.width = "100%";
  inner.style.height = "200px";

  // Make inner div a child of outer div
  outer.appendChild(inner);
  // Add outer div to the document
  document.body.appendChild(outer);

  // Get the width of the inner div. Since this div is set to 100% width it
  // will be the width of the outer div MINUS the width of the scrollbar
  // because the scrollbar width cuts into the div width
  const withScrollWidth = inner.offsetWidth;
  // Get the width of the outer div which is the same as the width of the
  // inner div would be without a scroll bar since the inner div width is set
  // to 100% of the outer div width
  const withoutScrollWidth = outer.offsetWidth;

  // Remove this dummy div from the DOM
  document.body.removeChild(outer);

  // Return difference in widths, this is the width of the scrollbar
  return withoutScrollWidth - withScrollWidth;
}

/**
 * Recursively acquire every full key path in the object and add each of them
 * to a list of all key paths the object has.
 *
 * @param {object} targetObject - The object we are parsing all key paths from
 * @param {Array<string>} currentkeyAccumulator - The key path we are currently
 * building up
 * @param {Array<Array<string>>} objectKeyPaths - An Array of all key paths on
 * the object
 */
export function getAllObjectKeyPathsRecursively(
  targetObject: object,
  currentkeyAccumulator: Array<string>,
  objectKeyPaths: Array<Array<string>>,
) {
  if (targetObject !== null && targetObject !== undefined) {
    for (const nextKey of Object.keys(targetObject)) {
      const nextObject = targetObject[nextKey as keyof object];

      // Add our new key to the accumulator
      currentkeyAccumulator.push(nextKey);

      // Some terminal values, such as the start and end times, will parse as
      // objects, but they do not have keys of their own
      if (
        typeof nextObject === "object" &&
        nextObject !== null &&
        Object.keys(nextObject).length !== 0
      ) {
        getAllObjectKeyPathsRecursively(
          nextObject,
          currentkeyAccumulator,
          objectKeyPaths,
        );
      } else {
        // Need to spread here because js arrays are pass by reference
        objectKeyPaths.push([...currentkeyAccumulator]);
      }

      // Remove our new key from the accumulator ready to add the next one in
      // its place
      currentkeyAccumulator.pop();
    }
  }
}

export function sortDAGNodes(DAG: cytoscape.Core, aID: string, bID: string) {
  let aNode: any = DAG.$id(aID);
  let bNode: any = DAG.$id(bID);

  // We only set a row and column on the Result nodes in the graph not the
  // Action nodes. Action nodes have Result nodes as children, so if a node
  // has children we know it is an Action node and we sort it based on its
  // first child which will be the furthest left Result node it contains.
  if (aNode.descendants().length > 0) {
    aNode = aNode.descendants()[0];
  }

  if (bNode.descendants().length > 0) {
    bNode = bNode.descendants()[0];
  }

  // Now sort by row first then by column within a row
  if (aNode.data().row === bNode.data().row) {
    return aNode.data().col - bNode.data().col;
  }

  return aNode.data().row - bNode.data().row;
}

//*****************************************************************************
// Unbelievably Set.Union and Set.Intersection were only added to the
// ECMAScript standard in 2024, so I'm going to implement them here in ways
// that will work on older js.
//****************************************************************************/
export function setUnion(setA: Set<string>, setB: Set<string>) {
  return new Set([...setA, ...setB]);
}

export function setIntersection(setA: Set<string>, setB: Set<string>) {
  return new Set([...setA].filter((elem) => setB.has(elem)));
}
