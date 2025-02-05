<script lang="ts">
  import "../../app.css";

  import { onMount } from "svelte";

  import provenanceModel from "$lib/models/provenanceModel";
  import cytoscape from "cytoscape";

  let self: HTMLDivElement;
  let cy: cytoscape.Core;

  // Search syntax something like
  //
  // param:sampling_depth=1103 AND action=core_metrics AND plugin=boots
  //
  // If you are searching for a string value that contains = or : or " AND " you
  // will need to put that string in quotes
  //
  // Additionally, if your key contains any of those values you will need to put it
  // in quotes.
  //
  // If your key contains periods, you will need to format it as a list
  export function searchProvenance(searchValue: string) {
    const hits: Array<Set<string>> = [];

    const clauses = searchValue.split(' AND ');
    console.log(clauses)
    for (const clause of clauses) {
      const split = clause.split('=');
      const key = split[0].split('');
      const value = split[1];

      hits.push(provenanceModel.searchJSON(key, value));
    }

    console.log(hits)
    const finalHits = hits[0];
    for (let i = 1; i < hits.length; i++) {
      finalHits.union(hits[i])
    }

    console.log(finalHits);
    const hit = Array.from(finalHits)[0];
    const elem = cy.$id(hit);
    elem.select();
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
