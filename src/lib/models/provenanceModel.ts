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
  heightMap = {};
  elements: Array<Object> = [];
  actionNodes: Array<Object> = [];
  resultNodes: Array<Object> = [];
  edges: Array<Object> = [];

  provData: Object | undefined = undefined;
  provTitle: string = "Details";

  actionsToInputs = {};
  resultsToActions = {};
  seenIDs = new Set();

  // Takes a collection and maps
  // <output-action>:<input-action>:<output-name>: [{key: ,uuid: }, ...]
  collectionMapping = {};

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
    this.heightMap = {};

    this.elements = [];
    this.actionNodes = [];
    this.resultNodes = [];
    this.edges = [];

    this.provData = undefined;
    this.provTitle = "Details";

    this.actionsToInputs = {};
    this.resultsToActions = {};
    this.seenIDs = new Set();

    this.collectionMapping = {};

    this.uuid = uuid;
    this.zipReader = zipReader;

    this.search = null;
    this.jsonMap = {};

    this._dirty();
  }

  // resultUUID is the uuid of the result we are currently parsing
  //
  // destinationAction is the action this result was an input to
  async _recurseUpTree(
    resultUUID: string,
    paramName: string | undefined,
    destinationActionUUID: string | undefined,
    collectionKey: string | undefined,
  ): Promise<number> {
    const sourceAction = await this.getProvenanceAction(resultUUID);
    const sourceActionUUID = sourceAction.execution.uuid;

    // If this is a collection, handle that separately, and short circuit our
    // recursion if we had already seen this collection
    if (
      collectionKey !== undefined &&
      (await this._handleCollection(
        resultUUID,
        paramName,
        destinationActionUUID,
        sourceActionUUID,
        collectionKey,
      ))
    ) {
      return this.heightMap[sourceActionUUID];
    }

    // Push the edge if we have a destination
    if (destinationActionUUID !== undefined) {
      this.edges.push({
        data: {
          id: `${paramName}_${resultUUID}_to_${destinationActionUUID}`,
          param: paramName,
          source: resultUUID,
          target: destinationActionUUID,
        },
      });
    }

    // If we have already seen this result then short circuit
    if (this._handleResult(resultUUID, sourceActionUUID)) {
      return this.heightMap[sourceActionUUID];
    }

    // If we have already seen this action then short circuit
    if (await this._handleAction(resultUUID, sourceActionUUID, sourceAction)) {
      return this.heightMap[sourceActionUUID];
    }

    // Some actions, most notably import, cannot have any steps upstream of
    // them. We don't need to run these steps trying to recurse up the tree on
    // those actions, because they can't have anything above them.
    const depths = [1];

    if (ACTION_TYPES_WITH_HISTORY.includes(sourceAction.action.type)) {
      await this._handleInputArtifacts(
        sourceAction.action.inputs,
        sourceActionUUID,
        depths,
      );
      await this._handleParameterArtifacts(
        sourceAction.action.parameters,
        sourceActionUUID,
        depths,
      );
    }

    // Get the maxDepth of this node by taking the max of the depths set by the
    // recursive calls generated by the above handlers
    const maxDepth = Math.max(...depths);

    // Add this action height to the map
    this.heightMap[sourceActionUUID] = maxDepth;

    // Push this result node
    let result = await this.getProvenanceArtifact(resultUUID);
    this.jsonMap[resultUUID] = result;

    this.resultNodes.push({
      data: {
        id: resultUUID,
        parent: sourceActionUUID,
        row: maxDepth,
      },
    });

    return maxDepth;
  }

  // Determines if we have seen this collection already or not.
  //
  // If we have not, we create the mapping for this collection and return false
  // so we can continue recusring up the tree.
  //
  // If we have, we add this element to the existing mapping and return true
  // indicating we can short circuit
  async _handleCollection(
    resultUUID: string,
    paramName: string,
    destinationActionUUID: string,
    sourceActionUUID: string,
    collectionKey: string,
  ): Promise<boolean> {
    // Uniquely identify this collection as this parameter name coming into dest from source
    const collectionID = `${paramName}:${destinationActionUUID}:${sourceActionUUID}`;

    // We map this collectionID to every element of the collection
    if (!this.seenIDs.has(collectionID)) {
      // This an as yet untracked collection, so we need to begin tracking it
      // then continue recursing
      this.seenIDs.add(collectionID);
      this.collectionMapping[collectionID] = [
        { key: collectionKey, uuid: resultUUID },
      ];
    } else {
      // This is a collection we are already tracking, so we need to add this
      // result to the collection and then can stop recursing up this path
      this.collectionMapping[collectionID].push({
        key: collectionKey,
        uuid: resultUUID,
      });

      let result = await this.getProvenanceArtifact(resultUUID);
      this.jsonMap[resultUUID] = result;

      return true;
    }

    return false;
  }

  _handleResult(resultUUID: string): boolean {
    // If we have already seen this result then short circuit
    if (this.seenIDs.has(resultUUID)) {
      return true;
    }

    this.seenIDs.add(resultUUID);
    return false;
  }

  async _handleAction(
    resultUUID: string,
    sourceActionUUID: string,
    sourceAction: object,
  ): Promise<boolean> {
    // If we have already seen this action then short circuit
    if (this.seenIDs.has(sourceActionUUID)) {
      // Push this result node
      let result = await this.getProvenanceArtifact(resultUUID);
      this.jsonMap[resultUUID] = result;

      this.resultNodes.push({
        data: {
          id: resultUUID,
          parent: sourceActionUUID,
          row: this.heightMap[sourceActionUUID],
        },
      });

      return true;
    }

    // Add a node for this action
    this.seenIDs.add(sourceActionUUID);
    this.jsonMap[sourceActionUUID] = sourceAction;
    this.actionNodes.push({
      data: { id: sourceActionUUID },
    });

    return false;
  }

  async _handleInputArtifacts(
    inputs: Array<object>,
    sourceActionUUID: string,
    depths: Array<number>,
  ): Promise<undefined> {
    for (const inputMap of inputs) {
      const inputName = Object.keys(inputMap)[0];
      const inputValue = Object.values(inputMap)[0];

      if (typeof inputValue == "string") {
        // We have a single input artifact
        depths.push(
          (await this._recurseUpTree(
            inputValue,
            inputName,
            sourceActionUUID,
            undefined,
          )) + 1,
        );
      } else if (inputValue !== null && typeof inputValue === "object") {
        // We have an input collection
        for (const element of inputValue) {
          // Every element will be the same type, string if this was a List
          // and {} if this was a Collection
          if (typeof element === "string") {
            depths.push(
              (await this._recurseUpTree(
                element,
                inputName,
                sourceActionUUID,
                undefined,
              )) + 1,
            );
          } else {
            depths.push(
              (await this._recurseUpTree(
                Object.values(element)[0],
                inputName,
                sourceActionUUID,
                Object.keys(element)[0],
              )) + 1,
            );
          }
        }
      } // If we hit neither above condition, this was an optional input not provided
    }
  }

  async _handleParameterArtifacts(
    parameters: Array<object>,
    sourceActionUUID: string,
    depths: Array<number>,
  ): Promise<undefined> {
    // We may have received artifacts as parameters
    for (const paramMap of parameters) {
      const paramName = Object.keys(paramMap)[0];
      const paramValue = Object.values(paramMap)[0];

      if (
        paramValue !== null &&
        typeof paramValue === "object" &&
        Object.prototype.hasOwnProperty.call(paramValue, "artifacts")
      ) {
        for (const artifactUUID of paramValue.artifacts) {
          depths.push(
            (await this._recurseUpTree(
              artifactUUID,
              paramName,
              sourceActionUUID,
              undefined,
            )) + 1,
          );
        }
      }
    }
  }

  async getProvenanceTree() {
    this.height = await this._recurseUpTree(
      this.uuid,
      undefined,
      undefined,
      undefined,
    );

    // This makes sure the nodes are spaced in a sane manner horizontally
    for (let i = 1; i <= this.height; i += 1) {
      const currNodes = this.resultNodes.filter((v) => v.data.row === i);
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

    this.elements = [...this.actionNodes, ...this.resultNodes, ...this.edges];
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
