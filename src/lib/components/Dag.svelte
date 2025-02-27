<script lang="ts">
  import "../../app.css";

  import { onMount } from "svelte";

  import provenanceModel from "$lib/models/provenanceModel";
  import cytoscape from "cytoscape";
  import { provSearchStore } from "$lib/scripts/prov-search-store";
  import { get_parser, Transformer } from "$lib/scripts/parser";

  let self: HTMLDivElement;
  let cy: cytoscape.Core;

  const OR = "|";
  const AND = "&";

  class _Pair {
    key: Array<string>;
    value: any;

    constructor(key: Array<string>, value: any) {
      this.key = key
      this.value = value;
    }
  }

  function _searchProvenanceValue(json: Array<any>, index: number): Set<string> {
    const elem = json[index];
    let hits = new Set<string>;

    if (elem.constructor === Array) {
      hits = _searchProvenanceValue(elem, 0);
    } else if (elem.constructor === _Pair) {
      hits = _searchProvKey(elem.key, elem.value)
    } else {
      // TODO: ERROR
    }

    if (index < (json.length - 1)) {
      hits = _searchProvenanceOperator(json, index + 1, hits);
    }

    return hits;
  }

  function _searchProvenanceOperator(json: Array<any>, index: number, hits: Set<string>): Set<string> {
    const elem = json[index];
    const next_hits = _searchProvenanceValue(json, index + 1);

    if (elem === OR) {
      hits = hits.union(next_hits);
    } else if (elem === AND) {
      hits = hits.intersection(next_hits);
    } else {
      // TODO: ERROR
    }

    return hits;
  }

  function _searchProvKey(key: Array<string>, value: any): Set<string> {
    let hits = new Set<string>;

    if (value.constructor === Array) {
      hits = _searchProvKeyValue(key, value, 0);
    } else {
      hits = provenanceModel.searchJSON(key, value);
    }

    return hits;
  }

  function _searchProvKeyValue(key: Array<string>, values: Array<any>, index: number): Set<string> {
    const elem = values[index];
    let hits = new Set<string>;

    if (elem.constructor === Array) {
      hits = _searchProvKeyValue(key, elem, 0);
    } else {
      hits = _searchProvKey(key, elem);
    }

    if (index < (values.length - 1)) {
      hits = _searchProvKeyOperator(key, values, index + 1, hits);
    }

    return hits;
  }

  function _searchProvKeyOperator(key: Array<string>, values: Array<any>, index: number, hits: Set<string>): Set<string> {
    const elem = values[index];
    const next_hits = _searchProvKeyValue(key, values, index + 1);

    if (elem === OR) {
      hits = hits.union(next_hits);
    } else if (elem === AND) {
      hits = hits.intersection(next_hits);
    } else {
      // TODO: ERROR
    }

    return hits;
  }

  class MyTransformer extends Transformer {
    start(start) {
      return start;
    }

    pair(pair) {
      return pair[0];
    }

    pair_single(pair) {
      const key = pair[0];
      const value = pair[1];

      return new _Pair(key, value);
    }

    pair_group(pair_group) {
      return pair_group;
    }

    value_group(list) {
      return list
    }

    // They key allows for the union of valid Python identifiers and valid
    // Conda package names. The Conda package names only adds . and -. We use
    // . as the key sep meaning . in the key must be escaped \.
    key(key) {
      const keyList = [];

      for (const child of key) {
        // Undefined is the seperators which we don't want inlcuded in here
        if (child !== undefined) {
          // There can't be any \ characters actually in the key, so kill
          // off the escape characters here
          keyList.push(child.replace("\\", ""));
        }
      }

      return keyList;
    }

    value(value) {
       return value[0];
    }

    STRING(string) {
      return string.value.slice(1, -1);
    }

    NUMBER(number) {
      return Number(number.value);
    }

    TRUE(_) {
      return true;
    }

    FALSE(_) {
      return false;
    }

    NULL(_) {
      return null;
    }

    OR(_) {
      return OR;
    }

    AND(_) {
      return AND;
    }

    KEY_SEP(_) {
      return;
    }

    KEY_VALUE(key_value) {
      return key_value.value;
    }
  }

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
    const parser = get_parser();
    const myTransformer = new MyTransformer()

    const ast = parser.parse(searchValue);
    const json = myTransformer.transform(ast);
    const hits: Array<string> = Array.from(_searchProvenanceValue(json, 0));

    // Sort the hit nodes by row then by col within a given row
    hits.sort((a, b) => {
      let aNode: any = cy.$id(a);
      let bNode: any = cy.$id(b);

      if (aNode.descendants().length > 0) {
        aNode = aNode.descendants()[0];
      }

      if (bNode.descendants().length > 0) {
        bNode = bNode.descendants()[0];
      }

      if (aNode.data().row === bNode.data().row) {
        return aNode.data().col - bNode.data().col;
      }

      return aNode.data().row - bNode.data().row;
    });

    provSearchStore.set({
      searchHits: hits
    });
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
