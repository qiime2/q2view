class ProvenanceModel
  // Recurse up the provenance tree from the result we were proveded
  async _inputMap(uuid, action) {
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
      .catch(() => (this.artifactsToActions[uuid] = null));
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
    let json = {};
    let keySet: Set<string> = new Set();

    const actionNodes = [];
    const seenActions = new Set();

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

    console.log(this.artifactsToActions)
    console.log(this.inCollection)
    for (const uuidPair of Object.entries(this.artifactsToActions)) {
      const artifactUUID = uuidPair[0];
      const actionUUID = uuidPair[1];

      if (!seenActions.has(actionUUID)) {
        json = await this.getProvenanceAction(artifactUUID);
        getAllObjectKeysRecursively(json, '', keySet);
        this.jsonMap[actionUUID] = json;

        actionNodes.push({
          data: { id: actionUUID },
        });

        seenActions.add(actionUUID);
      }

      if (!this.inCollection.has(artifactUUID)) {
        console.log(artifactUUID)
        json = await this.getProvenanceArtifact(artifactUUID);
        getAllObjectKeysRecursively(json, '', keySet);
        this.jsonMap[artifactUUID] = json;

        nodes.push({
          data: {
            id: artifactUUID,
            parent: actionUUID,
            row: findMaxDepth(artifactUUID),
          },
        });
      }
    }

    // Add all nodes and edges for collections
     for (const collectionID of Object.keys(this.collectionMapping)) {
      console.log(this.collectionMapping)
      // Get the uuid of the first element of this collection to represent the
      // entire collection in some metrics
      const collection = this.collectionMapping[collectionID];
      const representative = collection[0]["uuid"];

      const split = collectionID.split(":");
      const source = split[0];
      const target = split[1];
      const param = split[2];

      for (const elem of collection) {
        json = await this.getProvenanceArtifact(elem.uuid);
        this.jsonMap[elem.uuid] = json;
        getAllObjectKeysRecursively(json, '', keySet);
      }

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

    this.search = new Fuse([...Object.values(this.jsonMap)], {keys: [...keySet]});

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
    let elements = nodes.concat(edges);

    return [height, elements];
  }

  getProvenanceAction(uuid) {
    if (this.uuid === uuid) {
      return this._getYAML("provenance/action/action.yaml");
    }
    return this._getYAML(`provenance/artifacts/${uuid}/action/action.yaml`);
  }

  getProvenanceArtifact(uuid) {
    if (this.uuid === uuid) {
      return this._getYAML("provenance/metadata.yaml");
    }
    return this._getYAML(`provenance/artifacts/${uuid}/metadata.yaml`);
  }
}