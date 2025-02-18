<script lang="ts">
  import "../../app.css";

  import { onMount } from "svelte";

  import provenanceModel from "$lib/models/provenanceModel";
  import { provSearchStore } from "$lib/scripts/prov-search-store";

  let self: HTMLDivElement;
  let cy: cytoscape.Core;

  // Search syntax something like
  //
  // param:sampling_depth=1103 AND action=core_metrics AND plugin=boots
  //
  // If you are searching for a string value that contains = or : or " AND " you
  // will need to put that string in quotes
  // If the string contains quotes, they will need to be escaped e.g. \"
  // If the string contains \" add additional \ e.g. \\"
  //
  // param/params/parameter/parameters and input as special keys?
  // param and co. match if parameters is above terminal key in path
  // inputs mathes if inputs is above terminal key in path
  // what happens if param is in middle of complex key?
  export function searchProvenance(searchValue: string) {
    const tokens: Array<Array<any>> = [];
    parser(searchValue, tokens);

    const hits: Array<Set<string>> = [];

    for (const token of tokens) {
      hits.push(provenanceModel.searchJSON(token[0], token[1]));
    }

    let finalHits: Set<string> | Array<string> = hits[0];
    for (let i = 1; i < hits.length; i++) {
      finalHits = finalHits.intersection(hits[i])
    }

    finalHits = Array.from(finalHits);

    // Sort the hit nodes by row then by col within a given row
    finalHits.sort((a, b) => {
      let aNode: any = cy.$id(a);
      let bNode: any = cy.$id(b);

      if (aNode.descendants().length > 0) {
        aNode = aNode.descendants()[0];
      }

      if (bNode.descendants().length > 0) {
        bNode = bNode.descendants()[0];
      }

      console.log(aNode.data())
      console.log(bNode.data())

      if (aNode.data().row === bNode.data().row) {
        return aNode.data().col - bNode.data().col;
      }

      return aNode.data().row - bNode.data().row;
    });

    provSearchStore.set({
      searchHits: finalHits
    });
  }

  // TODO: Clean this up and make it work better
  // sampling_depth=1103 AND plugin=boots
  // sampling_depth=1103 AND plugin="boots AND something"
  // sampling_depth=1103 AND plugin="boots AND something" AND action=idk
  function parser(searchValue: string, tokens: Array<Array<any>>) {
    if (searchValue === "") {
      return;
    }

    // The location of the = that separates key=values
    const splitIndex = searchValue.indexOf('=');
    // Everything before that = is the key
    const keys = searchValue.split('=', 1)[0].split(':');

    // The indices marking the beginning and end of the value that goes with
    // the current key
    let startValIndex = splitIndex + 1;
    let endValIndex = searchValue.indexOf(' AND ');
    let value = '';

    // If the value starts with a quote, our value is everything between this
    // quote and the next unescaped quote.
    if (searchValue[startValIndex] === '"') {
      // Increment past the opening quote
      startValIndex++;
      endValIndex++;

      // Search for the next unescaped quote
      do {
        endValIndex = searchValue.indexOf('"', endValIndex);
      } while (searchValue[endValIndex] === '\\')

      // If we hit the end of the searchValue they didn't close their quote
      if (endValIndex === -1) {
        console.log(keys)
        console.log("HERE")
        // some kinda parse error
      }

      // Cut the value out
      value = searchValue.slice(startValIndex, endValIndex);
      // Increment past the next " AND "
      endValIndex += 5;
    } else {
      endValIndex = searchValue.indexOf(" AND ");

      if (endValIndex === -1) {
        value = searchValue.slice(startValIndex);
        endValIndex = searchValue.length;
      } else {
        value = searchValue.slice(startValIndex, endValIndex);
        endValIndex += 5;
      }
    }

    tokens.push([keys, value]);
    parser(searchValue.slice(endValIndex), tokens);
  }

  export function selectSearchHit(hitUUID: string) {
    const elem = cy.$id(hitUUID);
    elem.select();
    cy.center(elem);

    // Pan to put the focused node near the top of the viewport
    cy.panBy({
      x: 0,
      y: ((provenanceModel.height - 2) / 2) * -105
    })
  }

  const cytoscapeConfig = {
    boxSelectionEnabled: true,
    autounselectify: false,
    userZoomingEnabled: false,
    layout: {
      name: "grid",
      fit: false,
      condense: true,
      avoidOverlapPadding: 75,
      position: node => ({
        row: node.data("row"),
        col: node.data("col")
      })
    },
    style: [
      {
        selector: "node",
        css: {
          "text-valign": "center",
          "text-halign": "center"
        }
      },
      {
        selector: "$node > node",
        css: {
          "padding-top": "10px",
          "padding-left": "10px",
          "padding-bottom": "10px",
          "padding-right": "10px",
          "text-valign": "top",
          "text-halign": "center",
          "background-color": "#bbb"
        }
      },
      {
        selector: "edge",
        css: {
          content: "data(param)",
          "target-arrow-shape": "triangle",
          "curve-style": "segments"
        }
      },
      {
        selector: ":selected",
        css: {
          "background-color": "rgb(29, 78, 216)",
          "line-color": "rgb(29, 78, 216)",
          "target-arrow-color": "rgb(29, 78, 216)",
          "source-arrow-color": "rgb(29, 78, 216)"
        }
      }
    ]
  };

  function setActionSelection(uuid: string) {
    provenanceModel.provTitle = "Action Details";
    const selectionData = provenanceModel.nodeIDToJSON.get(uuid);
    _setSelection(selectionData);
  }

  function setResultSelection(uuid: string) {
    provenanceModel.provTitle = "Result Details";
    let selectionData = provenanceModel.nodeIDToJSON.get(uuid);
    _setSelection(selectionData);
  }

  function _setSelection(data) {
    provenanceModel.provData = data;
    provenanceModel._dirty();
  }

  // TODO: The way this works causes the $provenanceModel.provData to flicker undefined
  // briefly when clicking between nodes which looks bad. Additionally, something
  // is causing the dag and info columns to jitter around in Chrome
  function clearSelection() {
    provenanceModel.provTitle = "Details";
    provenanceModel.provData = undefined;
    provenanceModel._dirty();
  }

  onMount(() => {
    // null this out when mounting a new DAG
    provSearchStore.set({
      searchHits: new Set()
    });

    // Set this height so we center the DAG based on this height
    let displayHeight = (provenanceModel.height + 1) * 105;
    self.style.setProperty("height", `${displayHeight}px`);

    let lock = false; // used to prevent recursive event storms
    let selectedExists = false;
    cy = cytoscape({
      ...cytoscapeConfig,
      container: document.getElementById("cy"),
      elements: provenanceModel.elements
    });

    cy.on("select", "node, edge", (event) => {
      if (!lock) {
        selectedExists = true;
        lock = true;
        const elem = event.target;

        let node = elem;
        if (elem.isEdge()) {
          node = elem.source();
        }

        if (node.isParent()) {
          // If our node is a parent then it must be an action node with artifact
          // nodes as its children. We get the action provenance from whichever
          // of its children happens to be first. It doesn't matter which because
          // the data for the action itself won't change regardless.
          setActionSelection(node.data("id"));
        } else {
          setResultSelection(node.data("id"));
        }

        const edges = node.edgesTo("node");
        cy.elements("node, edge").unselect();
        node.select();
        edges.select();

        lock = false;
      }
    });

    cy.on("unselect", "node, edge", (event) => {  // eslint-disable-line no-unused-vars
      cy.elements("node, edge").unselect();
      if (!lock && selectedExists) {
        clearSelection();
        selectedExists = false;
      }
    });

    // Now center the DAG in the small canvas
    cy.center();

    // Centering on the prior displayHeight should put the dag at top center.
    // Now set the height appropriately based on the height of the dag.
    self.style.setProperty("height", `max(calc(100vh - 100px), ${displayHeight}px)`);
  });
</script>

<div
  bind:this={self}
  id="cy"
/>

<style lang="postcss">
  #cy {
    @apply border
    border-gray-300
    mb-4;
  }
</style>
