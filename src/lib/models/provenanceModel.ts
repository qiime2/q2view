// ****************************************************************************
// This model is responsible for parsing and storing the provenance of the
// result
// ****************************************************************************
import JSZip from "jszip";

import { getYAML } from "$lib/scripts/fileutils";

class ProvenanceModel {
  height: number | undefined = undefined;
  elements: Array<Object> | undefined = undefined;

  provData: Object | undefined = undefined;
  provTitle: string = "Details";

  actionsToInputs = {};
  artifactsToActions = {};

  // Takes a collection and maps
  // <output-action>:<input-action>:<output-name>: [{key: ,uuid: }, ...]
  collectionMapping = {};
  inCollection = new Set();

  // Class attributes passed in by readerModel pertaining to currently loaded
  // result
  uuid = "";
  zipReader: JSZip = new JSZip();

  //***************************************************************************
  // Start boilerplate to make this a subscribable svelte store
  //***************************************************************************
  _subscription: Record<number, (arg0: ProvenanceModel) => void> = {};
  _subscriptionNum = 0;

  _dirty() {
    for (const subscription of Object.values(this._subscription)) {
      subscription(this);
    }
  }

  subscribe(subscription: (value: ProvenanceModel) => void): () => void {
    this._subscription[this._subscriptionNum] = subscription;
    subscription(this);
    return ((index) => {
      return () => {
        delete this._subscription[index];
      };
    })(this._subscriptionNum++);
  }
  //***************************************************************************
  // End boilerplate to make this a subscribable svelte store
  //***************************************************************************

  // This state is set by the readerModel when it comes time to read the
  // provenance
  setState(uuid: string, zipReader: JSZip) {
    // Reset class attributes
    this.height = undefined;
    this.elements = undefined;

    this.provData = undefined;
    this.provTitle = "Details";

    this.actionsToInputs = {};
    this.artifactsToActions = {};

    this.collectionMapping = {}
    this.inCollection = new Set();

    this.uuid = uuid;
    this.zipReader = zipReader;

    this._dirty()
  }

  async _inputMap(uuid, action) {
    // Recurse up the prov tree and get mappings of execution id to the inputs
    // that execution took
    // eslint-disable-line no-unused-vars
    if (action === undefined) {
      await this.getProvenanceAction(uuid)
        .then(async (action) => {
          await this._inputMapHelper(uuid, action);
        })
        .catch(() => (this.artifactsToActions[uuid] = null));
    } else {
      await this._inputMapHelper(uuid, action);
    }
  }

  // TODO: This can recurse through the tree but screw recursively constructing
  // the actual data structures as we return up the call stack. I should put
  // the data structures on the object and just slap things into them as needed
  async _inputMapHelper(uuid, action) {
    this.artifactsToActions[uuid] = action.execution.uuid;

    if (
      action.action.type === "method" ||
      action.action.type === "visualizer" ||
      action.action.type === "pipeline"
    ) {
      if (!(action.execution.uuid in this.actionsToInputs)) {
        this.actionsToInputs[action.execution.uuid] = new Set();
      }

      for (const inputMap of action.action.inputs) {
        const entry = Object.values(inputMap)[0];
        const inputName = Object.keys(inputMap)[0];

        if (typeof entry === "string") {
          await this._getMappings(inputName, entry, action);
        } else if (entry !== null) {
          // TODO: Refactor how this works for collections
          for (const e of entry) {
            if (typeof e !== "string") {
              // If we are here, this was a collection and each e is a
              // key, value pair. This collection could have been an output
              // from another action, and it could be going multiple different
              // places
              await this._getMappings(
                `${Object.keys(e)[0]}:${inputName}`,
                Object.values(e)[0],
                action,
              );
            } else {
              await this._getMappings(inputName, e, action);
            }
          }
        } // else optional artifact
      }
      for (const paramMap of action.action.parameters) {
        const paramName = Object.keys(paramMap)[0];
        const param = Object.values(paramMap)[0];

        if (
          param !== null &&
          typeof param === "object" &&
          Object.prototype.hasOwnProperty.call(param, "artifacts")
        ) {
          for (const artifactUUID of param.artifacts) {
            await this._getMappings(paramName, artifactUUID, action);
          }
        }
      }
    }
  }

  async _getMappings(key, uuid, action) {
    this.actionsToInputs[action.execution.uuid].add({ [key]: uuid });

    await this.getProvenanceAction(uuid)
      .then(async (innerAction) => {
        if (!(innerAction.execution.uuid in this.actionsToInputs)) {
          await this._inputMap(uuid, innerAction);
        } else {
          this.artifactsToActions[uuid] = innerAction.execution.uuid;
        }
      })
      .catch(() => {
        console.log(uuid)
        this.artifactsToActions[uuid] = null;
      });
  }

  async getProvenanceTree() {
    await this._inputMap(this.uuid, undefined);

    const findMaxDepth = (uuid) => {
      if (
        this.artifactsToActions[uuid] === null ||
        typeof this.actionsToInputs[this.artifactsToActions[uuid]] ===
          "undefined" ||
        this.actionsToInputs[this.artifactsToActions[uuid]].size === 0
      ) {
        return 0;
      }
      return (
        1 +
        Math.max(
          ...Array.from(
            this.actionsToInputs[this.artifactsToActions[uuid]],
          ).map((mapping) => findMaxDepth(Object.values(mapping)[0])),
        )
      );
    };

    let height = findMaxDepth(this.uuid);
    let nodes = [];
    let edges = [];
    const actionNodes = [];

    // Add all edges for single Results and collate collections
    for (const actionUUID of Object.keys(this.actionsToInputs)) {
      for (const mapping of this.actionsToInputs[actionUUID]) {
        let inputName = Object.keys(mapping)[0];

        // The only way we can have a : in the name is if this is a collection
        // element, we sort those out here where we have all the information
        // we need handy in one place. We add the nodes and edges for
        // collections separately from the single Result nodes and edges
        if (inputName.includes(":")) {
          const splitName = inputName.split(":");

          const inputKey = splitName[0];
          inputName = splitName[1];

          const inputUuid = Object.values(mapping)[0];
          const inputSrc = this.artifactsToActions[inputUuid];

          const collectionID = `${inputSrc}:${actionUUID}:${inputName}`;

          if (!(collectionID in this.collectionMapping)) {
            this.collectionMapping[collectionID] = [
              { key: inputKey, uuid: inputUuid },
            ];
          } else {
            this.collectionMapping[collectionID].push({
              key: inputKey,
              uuid: inputUuid,
            });
          }

          this.inCollection.add(inputUuid);
        } else {
          edges.push({
            data: {
              id: `${Object.keys(mapping)[0]}_${
                Object.values(mapping)[0]
              }to${actionUUID}`,
              param: Object.keys(mapping)[0],
              source: Object.values(mapping)[0],
              target: actionUUID,
            },
          });
        }
      }
    }

    // Add all action nodes
    for (const actionUUID of Object.values(this.artifactsToActions)) {
      // These don't need to be sorted.
      if (actionUUID !== null) {
        actionNodes.push({
          data: { id: actionUUID },
        });
      }
    }

    // Add all nodes for individual Results
    for (const artifactUUID of Object.keys(this.artifactsToActions)) {
      if (!this.inCollection.has(artifactUUID)) {
        nodes.push({
          data: {
            id: artifactUUID,
            parent: this.artifactsToActions[artifactUUID],
            row: findMaxDepth(artifactUUID),
          },
        });
      }
    }

    // Add all nodes and edges for collections
    for (const collectionID of Object.keys(this.collectionMapping)) {
      const representative = this.collectionMapping[collectionID][0]["uuid"];

      const split = collectionID.split(":");
      const source = split[0];
      const target = split[1];
      const param = split[2];

      // Use the uuid of the first artifact in the collection to represent the
      // collection here
      if (this.collectionMapping[collectionID].length === 1) {
        nodes.push({
          data: {
            id: representative,
            parent: this.artifactsToActions[representative],
            row: findMaxDepth(representative),
          },
        });

        edges.push({
          data: {
            id: `${param}_${source}to${target}`,
            param: param,
            source: representative,
            target: target,
          },
        });
      } else {
        nodes.push({
          data: {
            id: collectionID,
            parent: this.artifactsToActions[representative],
            row: findMaxDepth(representative),
          },
        });

        edges.push({
          data: {
            id: `${param}_${source}to${target}`,
            param: param,
            source: collectionID,
            target: target,
          },
        });
      }
    }

    for (let i = 0; i < height; i += 1) {
      const currNodes = nodes.filter((v) => v.data.row === i);
      const sorted = currNodes.sort((a, b) => {
        if (a.data.parent < b.data.parent) {
          return -1;
        } else if (a.data.parent > b.data.parent) {
          return 1;
        }
        return 0;
      });

      for (const n of currNodes) {
        n.data.col = sorted.indexOf(n);
      }
    }

    nodes = [...actionNodes, ...nodes];

    this.height = height;
    this.elements = nodes.concat(edges);
    this._dirty();
  }

  getProvenanceAction(uuid) {
    if (this.uuid === uuid) {
      return getYAML("provenance/action/action.yaml", this.uuid, this.zipReader);
    }
    return getYAML(`provenance/artifacts/${uuid}/action/action.yaml`, this.uuid, this.zipReader);
  }

  getProvenanceArtifact(uuid) {
    if (this.uuid === uuid) {
      return getYAML("provenance/metadata.yaml", this.uuid, this.zipReader);
    }
    return getYAML(`provenance/artifacts/${uuid}/metadata.yaml`, this.uuid, this.zipReader);
  }
}

const provenanceModel = new ProvenanceModel();
export default provenanceModel;
