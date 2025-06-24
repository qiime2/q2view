// ****************************************************************************
// This model is responsible for parsing and storing the provenance of the
// result
// ****************************************************************************
import JSZip from "jszip";

import BiMap from "$lib/scripts/biMap";
import { getYAML } from "$lib/scripts/fileutils";
import { currentMetadataStore } from "$lib/scripts/currentMetadataStore";

const ACTION_TYPES_WITH_HISTORY = ["method", "visualizer", "pipeline"];

let currentMetadata: Set<string>;

currentMetadataStore.subscribe((value) => {
  currentMetadata = value.currentMetadata;
});

/**
 * This class is a subscribable svelte store that manages parsing and storing provenance
 * information for the provided Result.
 */
export default class ProvenanceModel {
  // The height of the provenance tree
  height: number = 1;
  // Maps the UUIDs of each action to that actions depth in the tree
  heightMap: Map<string, number> = new Map();
  // The width of the provenance tree
  width: number = 1;

  // Every Action node, Result node, and edge in the provenance tree
  elements: Array<Object> = [];
  // We keep result nodes separate until the end so we can sort them out
  // horizontally before adding them to elements
  resultNodes: Array<Object> = [];

  // Json representing the provenance of the selected node in the tree
  provData: Object | undefined = undefined;

  // Keep track of Action, Result, and Collection IDs we have already seen.
  seenIDs: Set<string> = new Set();

  // Search JSON
  jsonKeysToJSON = new Map();
  nodeIDToJSON: BiMap<string, {}> = new BiMap();
  keys: Set<string> = new Set();
  searchIndex: number = 0;
  searchHits: Array<string> = [];

  searchError: any = null;
  seenMetadata: Set<string> = new Set();
  metadata: Array<Array<string>> = [];

  // Class attributes passed in by readerModel pertaining to currently loaded
  // Result
  uuid: string = "";
  zipReader: JSZip = new JSZip();

  /**
   * Receive state from ReaderModel pertaining to the currently loaded Result.
   *
   * @param {string} uuid - The UUID of the currently loaded Result
   * @param {JSZip} zipReader - An object that can read files contained within
   * the currently loaded Result's zip
   */
  init(uuid: string, zipReader: JSZip) {
    this.uuid = uuid;
    this.zipReader = zipReader;
  }

  /**
   * Recurses up the provenance tree from the Result provided to view exhausting
   * all Results and Actions involved in creating this Result
   *
   * @param {string} resultUUID - The UUID of the Result we are currently parsing
   * @param {string | undefined} paramName - The name of the parameter this Result
   * was passed into in the Action that received it. This will be undefined if
   * we are the root Result
   * @param {string | undefined} destinationActionUUID - The execution UUID of
   * the Action this Result was passed into. This will be undefined if we are the
   * root Result
   * @param {string | undefined} collectionKey - The key of this Result in the
   * Collection it is part of. This will be undefined if the Result is not part
   * of a Collection
   *
   * @returns {Promise<number>} The maximum depth of the tree above the Result
   * we are currently parsing
   */
  async _recurseUpTree(
    resultUUID: string,
    paramName: string | undefined,
    destinationActionUUID: string | undefined,
    collectionKey: string | undefined,
  ): Promise<number> {
    const sourceAction = await this.getProvenanceAction(resultUUID);
    const sourceActionUUID = sourceAction.execution.uuid;

    // Make this "-" to match q2-<plugin>
    if (sourceAction.action.action !== undefined) {
      sourceAction.action.action = sourceAction.action.action.replaceAll(
        "_",
        "-",
      );
    }

    // If this Result is in a Collection, we need to set this to
    // paramName:destinationActionUUID:sourceActionUUID in place of resultUUID
    // as our unique identifier in some places
    const resultID =
      collectionKey === undefined
        ? resultUUID
        : `${paramName}:${destinationActionUUID}:${sourceActionUUID}`;

    // Push the edge if we have a destination
    if (destinationActionUUID !== undefined) {
      this.elements.push({
        data: {
          id: `${paramName}_${resultID}_to_${destinationActionUUID}`,
          param: paramName,
          source: resultID,
          target: destinationActionUUID,
        },
      });
    }

    // Handle the Result we are currently parsing
    if (collectionKey !== undefined) {
      // If this Result is in a Collection, handle that
      if (await this._handleCollection(resultUUID, collectionKey, resultID)) {
        // If we have already seen this Collection then short circuit
        return this.heightMap.get(sourceActionUUID);
      }
    } else if (await this._handleResult(resultUUID)) {
      // If we have already seen this Result then short circuit
      return this.heightMap.get(sourceActionUUID);
    }

    // If we get here we haven't seen this result yet so we need to track any
    // metadata it might have
    this._handleMetadata(sourceAction, resultUUID);

    // If we have already seen this Action then short circuit
    if (await this._handleAction(resultID, sourceActionUUID, sourceAction)) {
      return this.heightMap.get(sourceActionUUID);
    }

    // Some Actions, most notably import, cannot have any steps upstream of
    // them. We don't need to run these steps trying to recurse up the tree on
    // those Actions, because they can't have anything above them.
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

    // Add this Action height to the map
    this.heightMap.set(sourceActionUUID, maxDepth);

    // Finally push the node for this Result if it was new
    this.resultNodes.push({
      data: {
        id: resultID,
        parent: sourceActionUUID,
        row: maxDepth,
      },
    });

    return maxDepth;
  }

  /**
   * This function is called by _recurseUpTree if the Result it is parsing is a
   * member of a collection. It determines if we have seen the Collection this
   * Result  is part of yet or not and either adds this Result to the existing
   * Collection map or creates a new entry in the map for this Collection
   *
   * @param {string} resultUUID - The UUID of the Result we are currently parsing
   * @param {string} collectionKey - The key of this Result in the Collection it
   * is part of
   * @param {string} collectionID - Unique identifier of this Collection of the
   * form paramName:destinationActionUUID:sourceActionUUID
   *
   * @returns {Promise<boolean>} Whether we have seen this Collection yet or not.
   * If we have, we can short circuit in _recurseUpTree
   */
  async _handleCollection(
    resultUUID: string,
    collectionKey: string,
    collectionID: string,
  ): Promise<boolean> {
    const result = await this.getProvenanceArtifact(resultUUID);

    // STUPID HACK: JS returns object keys in insertion order UNLESS it can parse
    // the key into a non-negative integer. It puts all those non-negative integer
    // keys in numerical order ABOVE all the other keys. We want the order of collection
    // elements to be maintained in the final JSON tree we render. If we use a
    // map to maintain this order, the formatting of the tree becomes highly undesirable.
    // The best solution I could come up with was slapping this space in front
    // of the key to insure the key CANNOT be parsed into a number. This space
    // does not show up in the final JSONTree.
    collectionKey = ` ${collectionKey}`;

    // We map this collectionID to every element of the collection
    if (!this.seenIDs.has(collectionID)) {
      // This an as yet untracked collection, so we need to begin tracking it
      // then continue recursing
      this.seenIDs.add(collectionID);
      this.nodeIDToJSON.set(collectionID, {});
      this.nodeIDToJSON.get(collectionID)[collectionKey] = result;
    } else {
      // This is a collection we are already tracking, so we need to add this
      // result to the collection and then can stop recursing up this path
      this.nodeIDToJSON.get(collectionID)[collectionKey] = result;
      return true;
    }

    return false;
  }

  /**
   * This function is called by _recurseUpTree to determine if we have seen the
   * Result we are currently parsing yet or not.
   *
   * @note This method will not be called if it has already been determined the
   * currenty parsed Result is part of a previously seen Collection because
   * _recurseUpTree will already have short circuited
   *
   * @param {string} resultUUID - The UUID of the Result we are currently parsing
   *
   * @returns {Promise<boolean>} Whether we have seen this Result yet or not. If
   * we have, we can short circuit in _recurseUpTree
   */
  async _handleResult(resultUUID: string): Promise<boolean> {
    if (this.seenIDs.has(resultUUID)) {
      return true;
    }

    this.seenIDs.add(resultUUID);
    let result = await this.getProvenanceArtifact(resultUUID);
    this.nodeIDToJSON.set(resultUUID, result);

    return false;
  }

  /**
   * This function is called by _recurseUpTree to determine if we have seen the
   * Action that produced the Result we are currently parsing yet or not.
   *
   * @note This method will not be called if it has already been determined the
   * currently parsed Result is part of a Collection we have already seen or has
   * itself already been seen because _recurseUpTree will already have short circuited
   *
   * @param {string} resultUUID - The UUID of the rResult we are currently parsing
   * @param {string} sourceActionUUID - The UUID of the Action we are currently
   * handling
   * @param {Object} sourceAction - The action that produced the Result we are currently
   * parsing
   *
   * @returns {Promise<boolean>} Whether we have seen this Action yet or not. If
   * we have, we can short circuit in _recuseUpTree
   */
  async _handleAction(
    resultUUID: string,
    sourceActionUUID: string,
    sourceAction: Object,
  ): Promise<boolean> {
    if (this.seenIDs.has(sourceActionUUID)) {
      // This is called after _handleResult, so if we got here then we have not
      // seen this result yet and need to add it
      this.resultNodes.push({
        data: {
          id: resultUUID,
          parent: sourceActionUUID,
          row: this.heightMap.get(sourceActionUUID),
        },
      });

      return true;
    }

    // Push this Action node
    this.seenIDs.add(sourceActionUUID);
    this.nodeIDToJSON.set(sourceActionUUID, sourceAction);

    this.elements.push({
      data: { id: sourceActionUUID },
    });

    return false;
  }

  /**
   * Checks if we parsed any metadata from this artifact and tracks it if we
   * did
   *
   * @param {object} sourceAction - The Action that received this metadata as
   * input.
   */
  _handleMetadata(sourceAction: object, resultUUID: string) {
    if (currentMetadata.size !== 0) {
      for (const metadataFile of currentMetadata) {
        const identifier = `${sourceAction.execution.uuid} ${metadataFile}`;

        if (!this.seenMetadata.has(identifier)) {
          this.seenMetadata.add(identifier);

          this.metadata.push([
            sourceAction.action.plugin,
            sourceAction.action.action,
            sourceAction.execution.uuid,
            metadataFile,
            resultUUID,
          ]);
        }
      }

      // Set this back to empty for the next artifact that has metadata
      currentMetadataStore.set({
        currentMetadata: new Set(),
      });
    }
  }

  /**
   * Iterate over and recurse up from all Results that were provided as QIIME 2
   * inputs to the Action that produced the Result we are currently parsing.
   *
   * @note This method will not be called if it has already been determined the
   * currently parsed Result is part of a Collection we have already seen or has
   * itself already been seen or if it has already been determined that the Action
   * that produced the currently parsed Result has already been seen because _recurseUpTree
   * will already have short circuited
   *
   * @param {Array<object>} inputs - An array of all QIIME 2 inputs passed into
   * this Action of the form {inputName: inputValue}
   * @param {string} sourceActionUUID - The UUID of the action whose QIIME 2 inputs
   * we are handling
   * @param {Array<number>} depths - See returns
   *
   * @returns {Promise<undefined>} Modifies the depths array in place to contain
   * the depths of this Action in the tree for each path above the tree. The max
   * of this array will be taken to determine the depth of the currently parsed
   * Result in the tree
   */
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

  /**
   * Iterate over and recurse up from all Results that were provided as QIIME 2
   * parameters to the Action that produced the Result we are currently parsing.
   *
   * @note This method will not be called if it has already been determined the
   * currently parsed Result is part of a Collection we have already seen or has
   * itself already been seen or if it has already been determined that the Action
   * that produced the currently parsed Result has already been seen because _recurseUpTree
   * will already have short circuited
   *
   * @param {Array<object>} inputs - An array of all QIIME 2parameters passed into
   * this Action of the form {paramName: paramValue}
   * @param {string} sourceActionUUID - The UUID of the action whose QIIME 2 parameters
   * we are handling
   * @param {Array<number>} depths - See returns
   *
   * @returns {Promise<undefined>} Modifies the depths array in place to contain
   * the depths of this Action in the tree for each path above the tree. The max
   * of this array will be taken to determine the depth of the currently parsed
   * Result in the tree
   */
  async _handleParameterArtifacts(
    parameters: Array<object>,
    sourceActionUUID: string,
    depths: Array<number>,
  ): Promise<undefined> {
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

  /**
   * Generate the provenance tree above the Result we were given recursively. Sets
   * class state to represent the tree.
   */
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

        if (n.data.col + 1 > this.width) {
          this.width = n.data.col + 1;
        }
      }
    }

    this.elements.push(...this.resultNodes);
  }

  /**
   * Loads the ation.yaml file of the specified Result and returns it as JSON
   *
   * @param {string} uuid - The UUID of the Result we want to load the action.yaml
   * for
   *
   * @returns {JSON} JSON representing the .yaml file that was loaded
   */
  getProvenanceAction(uuid: string) {
    // If we requested the uuid of the currently loaded Result, then we load our
    // own action.yaml
    if (this.uuid === uuid) {
      return getYAML(
        "provenance/action/action.yaml",
        this.uuid,
        this.zipReader,
      );
    }

    // Otherwise we need to go through the Artifacts in our provenance
    return getYAML(
      `provenance/artifacts/${uuid}/action/action.yaml`,
      this.uuid,
      this.zipReader,
    );
  }

  /**
   * Loads the metadata.yaml file of the specified Result and returns it as JSON
   *
   * @param {string} uuid - The UUID of the Result we want to load the metadata.yaml
   * for
   *
   * @returns {JSON} JSON representing the .yaml file that was loaded
   */
  getProvenanceArtifact(uuid: string) {
    // If we requested the uuid of the currently loaded Result, then we load our
    // own action.yaml
    if (this.uuid === uuid) {
      return getYAML("provenance/metadata.yaml", this.uuid, this.zipReader);
    }

    // Otherwise we need to go through the Artifacts in our provenance
    return getYAML(
      `provenance/artifacts/${uuid}/metadata.yaml`,
      this.uuid,
      this.zipReader,
    );
  }
}
