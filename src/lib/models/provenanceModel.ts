// ****************************************************************************
// This model is responsible for parsing and storing the provenance of the
// result
// ****************************************************************************
import JSZip from "jszip";

import { getYAML } from "$lib/scripts/fileutils";
import { currentMetadataStore } from "$lib/scripts/currentMetadataStore";
import { searchProvenance, transformQuery } from "$lib/scripts/provSearchUtils";
import { setUnion } from "$lib/scripts/util";
import cytoscape from "cytoscape";

const ACTION_TYPES_WITH_HISTORY = ["method", "visualizer", "pipeline"];

let currentMetadata: Set<string>;

currentMetadataStore.subscribe((value) => {
  currentMetadata = value.currentMetadata;
});

export interface ProvenanceError {
  name: string;
  query: string;
  date: string;
  description: string;
}

/**
 * This class is a subscribable svelte store that manages parsing and storing provenance
 * information for the provided Result.
 */
export default class ProvenanceModel {
  cy: cytoscape.Core = cytoscape();

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
  provTab: string = "provenance";

  // Search JSON
  nodeIDToJSON: Map<string, {}> = new Map();
  innerIDToPipeline: Map<string, string> = new Map();
  keys: Set<string> = new Set();
  searchIndex: number = 0;
  searchHits: Array<string> = [];

  searchError: any = null;

  // Metadata
  seenMetadata: Set<string> = new Set();
  metadata: Array<Array<string>> = [];

  // Error tracking
  nodeIDToErrors: Map<string, Map<number, ProvenanceError[]>> = new Map();
  errors: Map<number, ProvenanceError[]> = new Map();

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

    const depths: number[] = [];
    let maxDepth = 1;

    // Need a set of all input/parameter artifacts to the pipeline so can
    // recurse up from any pipeline aliased artifact until all inputs are a
    // subset of that set.
    //
    // TODO: This code could be modified in the future to only call _recurseUpTree
    // which could take accumulators for elements and resultNodes then we could
    // properly parse inner pipeline provenance into a real DAG. This only does
    // enough to map the prov errors of inner actions back up the outer node
    if (sourceAction.action["alias-of"] !== undefined) {
      const inputArtifacts = this._getInputArtifacts(sourceAction);
      const parameterArtifacts = this._getParameterArtifacts(sourceAction);

      const artifactUnion = setUnion(inputArtifacts, parameterArtifacts);

      await this._recurseUpPipeline(
        sourceActionUUID,
        artifactUnion,
        sourceAction.action["alias-of"],
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

    // Track any metadata this result might have
    this._handleMetadata(sourceAction, resultUUID);

    // Handle the Result we are currently parsing
    if (collectionKey !== undefined) {
      // If this Result is in a Collection, handle that
      if (await this._handleCollection(resultUUID, collectionKey, resultID)) {
        // If we have already seen this Collection then short circuit after
        // adding this result to it
        return this.heightMap.get(sourceActionUUID);
      }
    } else if (await this._handleResult(resultUUID, sourceAction)) {
      // If we have already seen this Result then short circuit
      return this.heightMap.get(sourceActionUUID);
    }

    // We don't want to go parsing up the tree on actions we have already seen
    //
    // Additionally, some actions, most notably import, cannot have any steps
    // upstream of them. We don't need to recurse up the tree on them either
    if (
      !(await this._handleAction(sourceActionUUID, sourceAction)) &&
      ACTION_TYPES_WITH_HISTORY.includes(sourceAction.action.type)
    ) {
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

      maxDepth = Math.max(...depths);
    } else {
      // This could be an action we have already seen in which case it will
      // have a height in the map, or it could be an import or something which
      // has nothing above it
      const mapped = this.heightMap.get(sourceActionUUID);
      maxDepth = mapped === undefined ? 1 : mapped;
    }

    // Add this Action height to the map
    this.heightMap.set(sourceActionUUID, maxDepth);

    // Finally push the node for this Result
    this.resultNodes.push({
      data: {
        id: resultID,
        parent: sourceActionUUID,
        row: maxDepth,
      },
    });

    // Return our current maxDepth
    return maxDepth;
  }

  /**
   * Recurses up nested pipelines and maps inner elements to the outermost
   * pipeline
   *
   * @param {string} rootUUID - The UUID of the pipeline
   * @param {Set<string>} rootArtifactUnion - A set of UUIDs of all Artifacts
   * used as input to the pipeline.
   * @param resultUUID - The UUID of the result we are currently looking at
   */
  async _recurseUpPipeline(rootUUID, rootArtifactUnion, resultUUID) {
    const sourceAction = await this.getProvenanceAction(resultUUID);

    this.nodeIDToJSON.set(sourceAction.execution.uuid, sourceAction);
    this.innerIDToPipeline.set(sourceAction.execution.uuid, rootUUID);

    // Need to handle nested pipelines
    //
    // This is mapping nested pipelines directly to the outter pipeline not to
    // their most immediate ancestor
    if (sourceAction.action["alias-of"] !== undefined) {
      const inputArtifacts = this._getInputArtifacts(sourceAction);
      const parameterArtifacts = this._getParameterArtifacts(sourceAction);

      const artifactUnion = setUnion(inputArtifacts, parameterArtifacts);

      await this._recurseUpPipeline(
        rootUUID,
        artifactUnion,
        sourceAction.action["alias-of"],
      );
    } else if (ACTION_TYPES_WITH_HISTORY.includes(sourceAction.action.type)) {
      const sourceInputArtifacts = this._getInputArtifacts(sourceAction);
      const sourceParameterArtifacts =
        this._getParameterArtifacts(sourceAction);

      const sourceArtifactUnion = setUnion(
        sourceInputArtifacts,
        sourceParameterArtifacts,
      );

      for (const sourceArtifactUUID of sourceArtifactUnion) {
        if (!rootArtifactUnion.has(sourceArtifactUUID)) {
          await this._recurseUpPipeline(
            rootUUID,
            rootArtifactUnion,
            sourceArtifactUUID,
          );
        }
      }
    }
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
    if (!this.nodeIDToJSON.has(collectionID)) {
      // This an as yet untracked collection, so we need to begin tracking it
      // then continue recursing
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
   * @param {any} sourceAction - The parsed json of the provenance of the Action
   * that produced this Result.
   *
   * @returns {Promise<boolean>} Whether we have seen this Result yet or not. If
   * we have, we can short circuit in _recurseUpTree
   */
  async _handleResult(resultUUID: string, sourceAction: any): Promise<boolean> {
    if (this.nodeIDToJSON.has(resultUUID)) {
      return true;
    }

    let result = await this.getProvenanceArtifact(resultUUID);
    result["environment"] = sourceAction["environment"];
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
   * @param {string} sourceActionUUID - The UUID of the Action we are currently
   * handling
   * @param {Object} sourceAction - The action that produced the Result we are currently
   * parsing
   *
   * @returns {Promise<boolean>} Whether we have seen this Action yet or not. If
   * we have, we don't need to recurse further in _recurseUpTree
   */
  async _handleAction(
    sourceActionUUID: string,
    sourceAction: Object,
  ): Promise<boolean> {
    if (this.nodeIDToJSON.has(sourceActionUUID)) {
      return true;
    }

    // Push this Action node
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

  _getInputArtifacts(sourceAction) {
    const inputArtifacts = new Set();

    for (const inputMap of sourceAction.action.inputs) {
      const inputValue = Object.values(inputMap)[0];

      if (typeof inputValue == "string") {
        // We have a single input artifact
        inputArtifacts.add(inputValue);
      } else if (inputValue !== null && typeof inputValue === "object") {
        // We have an input collection
        for (const element of inputValue) {
          // Every element will be the same type, string if this was a List
          // and {} if this was a Collection
          if (typeof element === "string") {
            inputArtifacts.add(element);
          } else {
            inputArtifacts.add(Object.values(element)[0]);
          }
        }
      }
    }

    return inputArtifacts;
  }

  _getParameterArtifacts(sourceAction) {
    const parameterArtifacts = new Set();

    for (const paramMap of sourceAction.action.parameters) {
      const paramValue = Object.values(paramMap)[0];

      if (
        paramValue !== null &&
        typeof paramValue === "object" &&
        Object.prototype.hasOwnProperty.call(paramValue, "artifacts")
      ) {
        for (const artifactUUID of paramValue.artifacts) {
          parameterArtifacts.add(artifactUUID);
        }
      }
    }

    return parameterArtifacts;
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
  async getProvenanceAction(uuid: string) {
    // If we requested the uuid of the currently loaded Result, then we load our
    // own action.yaml
    let action;

    if (this.uuid === uuid) {
      action = await getYAML(
        "provenance/action/action.yaml",
        this.uuid,
        this.zipReader,
      );
    } else {
      // Otherwise we need to go through the Artifacts in our provenance
      action = await getYAML(
        `provenance/artifacts/${uuid}/action/action.yaml`,
        this.uuid,
        this.zipReader,
      );
    }

    // Make this "-" to match q2-<plugin>
    if (action.action.action !== undefined) {
      action.action.action = action.action.action.replaceAll("_", "-");
    }

    return action;
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

  async getErrors(ERRORS: ProvenanceError[] | undefined, severity: number) {
    if (ERRORS === undefined) {
      console.log(`Failed to parse provenance errors of severity ${severity}`);
      return;
    }

    for (const error of ERRORS) {
      // Search provenance for nodes matching this error's query
      let formattedQuery = transformQuery(error.query);
      let errorHits = searchProvenance(formattedQuery, this.nodeIDToJSON);

      // If we got any error hits, add this error to the list of overall errors
      // seen
      if (errorHits.length !== 0) {
        if (this.errors.get(severity) === undefined) {
          this.errors.set(severity, []);
        }

        this.errors.get(severity)?.push(error);

        for (const hit of errorHits) {
          if (this.nodeIDToErrors.get(hit) === undefined) {
            this.nodeIDToErrors.set(hit, new Map());
          }

          if (this.nodeIDToErrors.get(hit)?.get(severity) === undefined) {
            this.nodeIDToErrors.get(hit)?.set(severity, []);
          }

          this.nodeIDToErrors.get(hit)?.get(severity)?.push(error);
        }
      }
    }
  }
}
