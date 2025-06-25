<script lang="ts">
  import "../../app.css";
  import { onMount } from "svelte";

  import readerModel from "$lib/models/readerModel";
  import cytoscape from "cytoscape";
  import ProvDAGControls from "$lib/components/ProvDAGControls.svelte";
  import { HEIGHT_MULTIPLIER_PIXELS, getScrollBarWidth } from "$lib/scripts/util";
  import ProvErrors from "./ProvErrors.svelte";

  let self: HTMLDivElement = $state();

  const NODE_ERROR_BG_COLORS = ["rgb(252, 200, 0)", "rgb(255, 105, 0)", "rgb(251, 44, 54)"]

  // Center on selected node. Places it centered horizontally and just below
  // the control panel vertically
  function centerOnSelected() {
    let selectedNodes = readerModel.provenanceModel.cy.elements('node:selected');
    let selectedNode;

    if (selectedNodes.length === 0) {
      if (readerModel.provenanceModel.searchHits.length === 0) {
        // No selected node
        return;
      }

      // No selected node BUT we have a search hit, so we select that
      const hitID = readerModel.provenanceModel.searchHits[readerModel.provenanceModel.searchIndex];
      selectedNode = readerModel.provenanceModel.cy.$id(hitID);
      selectedNode.select();
    } else {
      // If we got selected nodes, there will only be one
      selectedNode = selectedNodes[0];
    }

    // Make sure we can get the container height, should always be doable but
    // guard anyway
    const containerHeight = readerModel.provenanceModel.cy.container()?.offsetHeight;
    if (containerHeight === undefined) {
      console.warn("Unable to get height of container");
      return;
    }

    // Center on node then pan it to the top of the viewport
    readerModel.provenanceModel.cy.center(selectedNode);
    readerModel.provenanceModel.cy.panBy({
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

    readerModel.provenanceModel.cy.center();
    readerModel.provenanceModel.cy.pan({
      x: readerModel.provenanceModel.cy.pan().x,
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
        selector: ".highlighted",
        css: {
          "border-width": "2px",
          "border-color": "rgb(81, 162, 255)",
        }
      },
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
              if (currentErrors.get(2)) {
                return NODE_ERROR_BG_COLORS[2];
              } else if (currentErrors.get(1)) {
                return NODE_ERROR_BG_COLORS[1];
              } else {
                return NODE_ERROR_BG_COLORS[0];
              }
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

  function _highSevertiyErrorSearch() {
    const provSearchForm = document.getElementById("provSearchForm") as HTMLFormElement;
    const provSearchInput = document.getElementById("provSearchInput") as HTMLInputElement;

    let errorQuery = "";

    // Or together the error queries for all high severity errors present
    readerModel.provenanceModel.highSeverityErrors.forEach((error) => {
      errorQuery += `(${error.query}) OR `;
    })

    // Chop off the trailing " OR "
    errorQuery = errorQuery.slice(0, errorQuery.length - 4);

    // Submit the search for the query
    provSearchInput.value = errorQuery;
    provSearchForm.requestSubmit();

    // Set the tab to error
    readerModel.provenanceModel.provTab = "error";
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

    readerModel.provenanceModel.cy = cytoscape({
      ...cytoscapeConfig,
      container: document.getElementById("cy"),
      elements: readerModel.provenanceModel.elements
    });

    readerModel.provenanceModel.cy.on("select", "node, edge", (event) => {
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
        readerModel.provenanceModel.cy.elements("node, edge").unselect();
        node.select();
        edges.select();

        lock = false;
      }
    });

    readerModel.provenanceModel.cy.on("unselect", "node, edge", (event) => {  // eslint-disable-line no-unused-vars
      readerModel.provenanceModel.cy.elements("node, edge").unselect();
      if (!lock && selectedExists) {
        clearSelection();
        selectedExists = false;
      }
    });

    // If we have high severity errors then we want to search for them by
    // default when mounting the DAG.
    //
    // I am not 100% positive why we need to resize the DAG after centering on
    // the search hits if there are high severity errors and before centering
    // the DAG in the canvas if there aren't, but this order DOES matter.
    if (readerModel.provenanceModel.highSeverityErrors.size > 0) {
      // If we have high severity errors then we search them which will center
      // the DAG on whichever of them is first in the results. We resize the
      // canvas after the search.
      _highSevertiyErrorSearch();
      self.style.setProperty("height", "100%");
    } else {
      // If we don't have high severity errors then we resize before we center
      // the DAG in the canvas.
      self.style.setProperty("height", "100%");
      centerAndPan();
    }
  }
</script>

<div>
  <div id="provDAGControls" class="absolute z-10 {getScrollBarWidth() == 0 ? "left-2": ""}">
    <ProvDAGControls {centerOnSelected} {centerAndPan} {mount}/>
  </div>
  <div id="errorSymbols" class="absolute z-10 {getScrollBarWidth() == 0 ? "left-2": ""} bottom-0">
    <ProvErrors />
  </div>
  <div
    bind:this={self}
    id="cy"
  ></div>
</div>
