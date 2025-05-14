<script lang="ts">
  import "../../app.css";

  import { onMount } from "svelte";

  import provenanceModel from "$lib/models/provenanceModel";
  import cytoscape from "cytoscape";
  import ProvSearchbar from "./ProvSearchbar.svelte";
  import { getScrollBarWidth, HEIGHT_MULTIPLIER_PIXELS } from "$lib/scripts/util";

  let self: HTMLDivElement = $state();
  let cy: cytoscape.Core = $state();

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
    const provDetails = document.getElementById("provDetails");

    // Attempt to calculate the height such that it lines up with the details
    // panel. If we cannot get any part of the information needed to calculate
    // this, just say screw it and use the screen height here.
    let defaultHeight = screen.height;
    if (provDetails === null) {
       console.warn("Failed to get provDetails div");
    } else {
      // We want to also factor in the margins of the prov searchBar above us
      // into the amount we subtract, but we only want to base our height off
      // the content height of the details we don't care about the margins.
      defaultHeight = provDetails.offsetHeight;
    }

    // Compute the height based on the prov DAG as well
    const dimensionBasedHeight = (provenanceModel.height + 1) * HEIGHT_MULTIPLIER_PIXELS;
    self.style.setProperty("height", `${dimensionBasedHeight}px`);

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

    // Now center the DAG in the canvas with height calculated based on the DAG
    // height. We do this because if the dimensionBasedHeight is smaller than
    // the default height, then we wan to center based on that smaller height
    // so the DAG ends up at the top center of the canvas not dead center
    cy.center();

    // Now we set the canvas size to whichever was larger. The height to line up
    // with the bottom of the default details panel, or the height needed to
    // fit the entire DAG
    self.style.setProperty("height", `max(${defaultHeight}px, ${dimensionBasedHeight}px)`);
  });
</script>

<div class="{getScrollBarWidth() == 0 ? "pl-2" : ""}">
  <div id="provSearchBar" class="mb-2 absolute z-10 bg-white">
    <ProvSearchbar {cy}/>
  </div>
  <div
    bind:this={self}
    id="cy"
></div>
</div>

<style lang="postcss">
  #cy {
    @apply border
    border-gray-300
    mb-4;
  }
</style>
