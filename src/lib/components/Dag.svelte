<script lang="ts">
  import "../../app.css";

  import { onMount } from "svelte";

  import provenanceModel from "$lib/models/provenanceModel";
  import cytoscape from "cytoscape";
  import ProvSearchbar from "./ProvSearchbar.svelte";
    import { getScrollBarWidth } from "$lib/scripts/util";

  let self: HTMLDivElement;
  let cy: cytoscape.Core;

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

<div>
  <div class="{getScrollBarWidth() === 0 ? "pr-4" : ""}">
    <ProvSearchbar height={provenanceModel.height} {cy}/>
  </div>
  <div
    bind:this={self}
    id="cy"
  />
</div>

<style lang="postcss">
  #cy {
    @apply border
    border-gray-300
    mb-4;
  }
</style>
