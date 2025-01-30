// ****************************************************************************
// This model is responsible for parsing and storing the provenance of the
// result
// ****************************************************************************
import JSZip from "jszip";
import Fuse from "fuse.js";

import { getYAML } from "$lib/scripts/fileutils";
import { getAllObjectKeysRecursively } from "$lib/scripts/util";

const ACTION_TYPES_WITH_HISTORY = ["method", "visualizer", "pipeline"];

class ProvenanceModel {
  height: number = 1;
  elements: Array<Object> = [];

  provData: Object | undefined = undefined;
  provTitle: string = "Details";

  actionsToInputs = {};
  resultsToActions = {};
  seenActions = new Set();

  // Takes a collection and maps
  // <output-action>:<input-action>:<output-name>: [{key: ,uuid: }, ...]
  collectionMapping = {};
  inCollection = new Set();

  // Class attributes passed in by readerModel pertaining to currently loaded
  // result
  uuid = "";
  zipReader: JSZip = new JSZip();

  // Search JSON
  search: Fuse<unknown> | null = null;
  jsonMap = {};

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
    this.height = 1;
    this.elements = [];

    this.provData = undefined;
    this.provTitle = "Details";

    this.actionsToInputs = {};
    this.resultsToActions = {};
    this.seenActions = new Set();

    this.collectionMapping = {};
    this.inCollection = new Set();

    this.uuid = uuid;
    this.zipReader = zipReader;

    this.search = null;
    this.jsonMap = {};

    this._dirty();
  }

  // resultUUID is the uuid of the result we are currently parsing
  //
  // destinationAction is the action this result was an input to
  async _getInputMap(
    resultUUID: string,
    paramName: string,
    destinationActionUUID: string,
  ): Promise<number> {
    const sourceAction = await this.getProvenanceAction(resultUUID);
    const sourceActionUUID = sourceAction.execution.uuid;

    let depths: Array<number> = [1];

    // destinationAction will be undefined if we call this with our root Result
    // because the root result was not used as an input to any other action in
    // this provenance
    if (destinationActionUUID !== "") {
      this.elements.push({
        data: {
          id: `${paramName}_${resultUUID}_to_${destinationActionUUID}`,
          param: paramName,
          source: resultUUID,
          target: destinationActionUUID,
        },
      });
    }

    // Push the action node if we haven't yet
    if (!this.seenActions.has(sourceActionUUID)) {
      this.seenActions.add(sourceActionUUID);

      this.elements.push({
        data: { id: sourceActionUUID },
      });
    }

    // Some actions, most notably import, cannot have any steps upstream of
    // them. We don't need to run these steps trying to recurse up the tree on
    // those actions, because they can't have anything above them.
    if (ACTION_TYPES_WITH_HISTORY.includes(sourceAction.action.type)) {
      for (const inputMap of sourceAction.action.inputs) {
        const inputName = Object.keys(inputMap)[0];
        const inputValue = Object.values(inputMap)[0];

        if (typeof inputValue == "string") {
          // We have a single input artifact
          depths.push(
            (await this._getInputMap(inputValue, inputName, sourceActionUUID)) +
              1,
          );
        } else if (inputValue !== null) {
          // We have an input collection
          for (const element of inputValue) {
            // Every element will be the same type, string if this was a List
            // and {} if this was a Collection
            if (typeof element === "string") {
              depths.push(
                (await this._getInputMap(
                  element,
                  inputName,
                  sourceActionUUID,
                )) + 1,
              );
            } else {
              depths.push(
                (await this._getInputMap(
                  Object.values(element)[0],
                  `${inputName}:${Object.keys(element)[0]}`,
                  sourceActionUUID,
                )) + 1,
              );
            }
          }
        } // If we hit neither above condition, this was an optional input not provided
      }

      // We may have received artifacts as parameters
      for (const paramMap of sourceAction.action.parameters) {
        const paramName = Object.keys(paramMap)[0];
        const paramValue = Object.values(paramMap)[0];

        if (
          paramValue !== null &&
          typeof paramValue === "object" &&
          Object.prototype.hasOwnProperty.call(paramValue, "artifacts")
        ) {
          for (const artifactUUID of paramValue.artifacts) {
            depths.push(
              (await this._getInputMap(
                artifactUUID,
                paramName,
                sourceActionUUID,
              )) + 1,
            );
          }
        }
      }
    }

    // Get the maxDepth of this node by taking the max of the depths returned
    // by the recursive calls
    const maxDepth = Math.max(...depths);

    // Push the result node
    // We do this here because we don't have our maxDepth until now
    this.elements.push({
      data: {
        id: resultUUID,
        parent: sourceActionUUID,
        row: maxDepth,
      },
    });

    return maxDepth;
  }

  // // Recurse up the prov tree and get mappings of execution id to the inputs
  // // that execution took
  // async _inputMap(uuid, action) {
  //   // eslint-disable-line no-unused-vars
  //   if (action === undefined) {
  //     await this.getProvenanceAction(uuid)
  //       .then(async (action) => {
  //         await this._inputMapHelper(uuid, action);
  //       })
  //       .catch(() => (this.resultsToActions[uuid] = null));
  //   } else {
  //     await this._inputMapHelper(uuid, action);
  //   }
  // }

  // // TODO: This can recurse through the tree but screw recursively constructing
  // // the actual data structures as we return up the call stack. I should put
  // // the data structures on the object and just slap things into them as needed
  // async _inputMapHelper(uuid, action) {
  //   this.resultsToActions[uuid] = action.execution.uuid;

  //   if (
  //     action.action.type === "method" ||
  //     action.action.type === "visualizer" ||
  //     action.action.type === "pipeline"
  //   ) {
  //     if (!(action.execution.uuid in this.actionsToInputs)) {
  //       this.actionsToInputs[action.execution.uuid] = new Set();
  //     }

  //     for (const inputMap of action.action.inputs) {
  //       const entry = Object.values(inputMap)[0];
  //       const inputName = Object.keys(inputMap)[0];

  //       if (typeof entry === "string") {
  //         await this._getMappings(inputName, entry, action);
  //       } else if (entry !== null) {
  //         // TODO: Refactor how this works for collections
  //         for (const e of entry) {
  //           if (typeof e !== "string") {
  //             // If we are here, this was a collection and each e is a
  //             // key, value pair. This collection could have been an output
  //             // from another action, and it could be going multiple different
  //             // places
  //             await this._getMappings(
  //               `${Object.keys(e)[0]}:${inputName}`,
  //               Object.values(e)[0],
  //               action,
  //             );
  //           } else {
  //             await this._getMappings(inputName, e, action);
  //           }
  //         }
  //       } // else optional artifact
  //     }
  //     for (const paramMap of action.action.parameters) {
  //       const paramName = Object.keys(paramMap)[0];
  //       const param = Object.values(paramMap)[0];

  //       if (
  //         param !== null &&
  //         typeof param === "object" &&
  //         Object.prototype.hasOwnProperty.call(param, "artifacts")
  //       ) {
  //         for (const artifactUUID of param.artifacts) {
  //           await this._getMappings(paramName, artifactUUID, action);
  //         }
  //       }
  //     }
  //   }
  // }

  // async _getMappings(uuid, depth) {
  //   // this.actionsToInputs[actionUUID].add({ [key]: uuid });
  //   const sourceAction = await this.getProvenanceAction(uuid);

  //   if (!this.seenActions.has(sourceAction.execution.uuid)) {
  //     await this._getInputMap(uuid, depth + 1, sourceAction);
  //   } else {
  //       // Push the result node
  //       this.elements.push({
  //         data: {
  //           id: uuid,
  //           parent: sourceAction.execution.uuid,
  //           row: depth,
  //         }
  //       });
  //   }

  //   // return sourceAction;

  // //   await this.getProvenanceAction(uuid)
  // //     .then(async (innerAction) => {
  // //       if (!this.seenActions.has(innerAction.execution.uuid)) {
  // //         await this._getInputMap(uuid, depth + 1, innerAction);
  // //       } else {
  // //         this.resultsToActions[uuid] = innerAction.execution.uuid;
  // //       }

  // //       return innerAction;
  // //     })
  // //     .catch(() => (this.resultsToActions[uuid] = null));
  // }

  async getProvenanceTree() {
    this.height = await this._getInputMap(this.uuid, "", "");
    console.log(this.elements);

    // const findMaxDepth = (uuid) => {
    //   if (
    //     this.resultsToActions[uuid] === null ||
    //     typeof this.actionsToInputs[this.resultsToActions[uuid]] ===
    //       "undefined" ||
    //     this.actionsToInputs[this.resultsToActions[uuid]].size === 0
    //   ) {
    //     return 0;
    //   }
    //   return (
    //     1 +
    //     Math.max(
    //       ...Array.from(
    //         this.actionsToInputs[this.resultsToActions[uuid]],
    //       ).map((mapping) => findMaxDepth(Object.values(mapping)[0])),
    //     )
    //   );
    // };

    // this.height = findMaxDepth(this.uuid);
    // let nodes = [];
    // let edges = [];
    // let json = {};
    // let keySet: Set<string> = new Set();

    // const actionNodes = [];
    // const seenActions = new Set();

    // // Add all edges for single Results and collate collections
    // for (const actionUUID of Object.keys(this.actionsToInputs)) {
    //   for (const mapping of this.actionsToInputs[actionUUID]) {
    //     let inputName = Object.keys(mapping)[0];

    //     // The only way we can have a : in the name is if this is a collection
    //     // element, we sort those out here where we have all the information
    //     // we need handy in one place. We add the nodes and edges for
    //     // collections separately from the single Result nodes and edges
    //     if (inputName.includes(":")) {
    //       const splitName = inputName.split(":");

    //       const inputKey = splitName[0];
    //       inputName = splitName[1];

    //       const inputUuid = Object.values(mapping)[0];
    //       const inputSrc = this.resultsToActions[inputUuid];

    //       const collectionID = `${inputSrc}:${actionUUID}:${inputName}`;

    //       if (!(collectionID in this.collectionMapping)) {
    //         this.collectionMapping[collectionID] = [
    //           { key: inputKey, uuid: inputUuid },
    //         ];
    //       } else {
    //         this.collectionMapping[collectionID].push({
    //           key: inputKey,
    //           uuid: inputUuid,
    //         });
    //       }

    //       this.inCollection.add(inputUuid);
    //     } else {
    //       edges.push({
    //         data: {
    //           id: `${Object.keys(mapping)[0]}_${
    //             Object.values(mapping)[0]
    //           }to${actionUUID}`,
    //           param: Object.keys(mapping)[0],
    //           source: Object.values(mapping)[0],
    //           target: actionUUID,
    //         },
    //       });
    //     }
    //   }
    // }

    // console.log(this.resultsToActions);
    // console.log(this.inCollection);
    // for (const uuidPair of Object.entries(this.resultsToActions)) {
    //   const artifactUUID = uuidPair[0];
    //   const actionUUID = uuidPair[1];

    //   if (!seenActions.has(actionUUID)) {
    //     json = await this.getProvenanceAction(artifactUUID);
    //     getAllObjectKeysRecursively(json, "", keySet);
    //     this.jsonMap[actionUUID] = json;

    //     actionNodes.push({
    //       data: { id: actionUUID },
    //     });

    //     seenActions.add(actionUUID);
    //   }

    //   if (!this.inCollection.has(artifactUUID)) {
    //     console.log(artifactUUID);
    //     json = await this.getProvenanceArtifact(artifactUUID);
    //     getAllObjectKeysRecursively(json, "", keySet);
    //     this.jsonMap[artifactUUID] = json;

    //     nodes.push({
    //       data: {
    //         id: artifactUUID,
    //         parent: actionUUID,
    //         row: findMaxDepth(artifactUUID),
    //       },
    //     });
    //   }
    // }

    // // Add all nodes and edges for collections
    // for (const collectionID of Object.keys(this.collectionMapping)) {
    //   console.log(this.collectionMapping);
    //   // Get the uuid of the first element of this collection to represent the
    //   // entire collection in some metrics
    //   const collection = this.collectionMapping[collectionID];
    //   const representative = collection[0]["uuid"];

    //   const split = collectionID.split(":");
    //   const source = split[0];
    //   const target = split[1];
    //   const param = split[2];

    //   for (const elem of collection) {
    //     json = await this.getProvenanceArtifact(elem.uuid);
    //     this.jsonMap[elem.uuid] = json;
    //     getAllObjectKeysRecursively(json, "", keySet);
    //   }

    //   nodes.push({
    //     data: {
    //       id: collectionID,
    //       parent: this.resultsToActions[representative],
    //       row: findMaxDepth(representative),
    //     },
    //   });

    //   edges.push({
    //     data: {
    //       id: `${param}_${source}to${target}`,
    //       param: param,
    //       source: collectionID,
    //       target: target,
    //     },
    //   });
    // }

    // this.search = new Fuse([...Object.values(this.jsonMap)], {
    //   keys: [...keySet],
    // });

    // for (let i = 0; i < this.height; i += 1) {
    //   const currNodes = this.nodes.filter((v) => v.data.row === i);
    //   const sorted = currNodes.sort((a, b) => {
    //     if (a.data.parent < b.data.parent) {
    //       return -1;
    //     } else if (a.data.parent > b.data.parent) {
    //       return 1;
    //     }
    //     return 0;
    //   });

    //   for (const n of currNodes) {
    //     n.data.col = sorted.indexOf(n);
    //   }
    // }

    // nodes = [...actionNodes, ...nodes];
    // this.elements = [...this.elements, ...this.nodes];
  }

  getProvenanceAction(uuid) {
    if (this.uuid === uuid) {
      return getYAML(
        "provenance/action/action.yaml",
        this.uuid,
        this.zipReader,
      );
    }
    return getYAML(
      `provenance/artifacts/${uuid}/action/action.yaml`,
      this.uuid,
      this.zipReader,
    );
  }

  getProvenanceArtifact(uuid) {
    if (this.uuid === uuid) {
      return getYAML("provenance/metadata.yaml", this.uuid, this.zipReader);
    }
    return getYAML(
      `provenance/artifacts/${uuid}/metadata.yaml`,
      this.uuid,
      this.zipReader,
    );
  }
}

const provenanceModel = new ProvenanceModel();
export default provenanceModel;
