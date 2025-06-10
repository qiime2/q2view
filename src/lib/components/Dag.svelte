<script lang="ts">
  import "../../app.css";
  import { onMount } from "svelte";

  import readerModel from "$lib/models/readerModel";
  import cytoscape from "cytoscape";
  import ProvDAGControls from "$lib/components/ProvDAGControls.svelte";
  import { HEIGHT_MULTIPLIER_PIXELS, getScrollBarWidth } from "$lib/scripts/util";
  import ProvErrors from "./ProvErrors.svelte";

  let self: HTMLDivElement = $state();
  let cy: cytoscape.Core = $state();

  const NODE_ERROR_BG_COLORS = ["rgb(252, 200, 0)", "rgb(255, 105, 0)", "rgb(251, 44, 54)"]

  // Center on selected node. Places it centered horizontally and just below
  // the control panel vertically
  function centerOnSelected() {
    const selectedNodes = cy.elements('node:selected');
    if (selectedNodes.length === 0) {
      // No node currently selected
      return;
    }

    // We can only ever have one node selected at a time
    const selectedNode = selectedNodes[0];

    // Make sure we can get the container height, should always be doable but
    // guard anyway
    const containerHeight = cy.container()?.offsetHeight;
    if (containerHeight === undefined) {
      console.warn("Unable to get height of container");
      return;
    }

    // Center on node then pan it to the top of the viewport
    cy.center(selectedNode);
    cy.panBy({
      x: 0,
      y: -((containerHeight / 2) - (1.5 * HEIGHT_MULTIPLIER_PIXELS)),
    });
  }

  // Center on the entire graph. Places it centered horizontally and just below
  // the control panel vertically
  //
  // TODO: There is a tendency for the DAG to shift slightly to the left if you
  // open it then immediately click the "Recenter" button even though loading
  // and clicking Recenter both call this function. This isn't a big deal and
  // is to do with the how the width of the DAG container is calculated.
  // Leaving this as a TODO because in theory this should be fixed, but it is
  // probably not worth the effort
  function centerAndPan() {
    const provDAGControlsHeight = document.getElementById("provDAGControls")?.offsetHeight;
    if (provDAGControlsHeight === undefined) {
      console.warn("Unable to get height of prov search bar");
      return;
    }

    cy.center();
    cy.pan({
      x: cy.pan().x,
      y: provDAGControlsHeight - HEIGHT_MULTIPLIER_PIXELS,
    });
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
          "background-color": function(node) {
            const nodeID = node.id();
            const currentErrors = readerModel.provenanceModel.nodeIDToErrors.get(nodeID);

            if (currentErrors !== undefined) {
              return NODE_ERROR_BG_COLORS[currentErrors[0].severity];
            }

            return "#bbb";
          }
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
    const selectionData = readerModel.provenanceModel.nodeIDToJSON.get(uuid);
    _setSelection(selectionData);
  }

  function setResultSelection(uuid: string) {
    let selectionData = readerModel.provenanceModel.nodeIDToJSON.get(uuid);
    _setSelection(selectionData);
  }

  function _setSelection(data) {
    readerModel.provenanceModel.provData = data;
    readerModel._dirty();
  }

  function clearSelection() {
    readerModel.provenanceModel.provData = undefined;
    readerModel._dirty();
  }

  onMount(() => {
    mount();
  });

  function mount() {
    // This needs to be set to a non-zero height before we init the graph
    // below. It doesn't matter what amount it is set to just set it to a
    // concrete non-zero amount. We set it to the real height later.
    //
    // If this does not happen then FireFox in particular fails to center the
    // DAG correctly in the canvas when this is called in onMount.
    self.style.setProperty("height", "1px");

    let lock = false; // used to prevent recursive event storms
    let selectedExists = false;

    cy = cytoscape({
      ...cytoscapeConfig,
      container: document.getElementById("cy"),
      elements: readerModel.provenanceModel.elements
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

    // Now we set the container height to 100% of parent height before centering.
    self.style.setProperty("height", "100%");
    centerAndPan();
  }
</script>

<div>
  <div id="provDAGControls" class="absolute z-10 {getScrollBarWidth() == 0 ? "left-2": ""}">
    <ProvDAGControls {cy} {centerOnSelected} {centerAndPan} {mount}/>
  </div>
  <div id="errorSymbols" class="absolute z-10 {getScrollBarWidth() == 0 ? "left-2": ""} bottom-0">
    <ProvErrors />
  </div>
  <div
    bind:this={self}
    id="cy"
  ></div>
</div>
