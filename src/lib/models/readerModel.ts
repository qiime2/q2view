// ****************************************************************************
// This model is responsible for taking the result supplied by the user,
// ensuring we have a file if the result is remote, unzipping the result, and
// middle manning file requests as needed
// ****************************************************************************
import JSZip from "jszip";

import { handleError } from "$lib/scripts/util";

import loading from "$lib/scripts/loading";
import CitationsModel from "$lib/models/citationsModel";
import ProvenanceModel from "$lib/models/provenanceModel";
import { getFile, getYAML } from "$lib/scripts/fileutils";

class ReaderModel {
  error = "";
  errorMessage = "";

  rawSrc: File | string = "";
  urlSrc = "";
  name: string = "";
  sourceType: string = "";

  uuid: string = "";
  indexPath: string = "";
  version: string = "";
  frameworkVersion: string = "";
  zipReader: JSZip | null = null;
  port: string | null = null;

  metadata: object = {};

  session: string;

  provenanceModel: ProvenanceModel = new ProvenanceModel();
  citationsModel: CitationsModel = new CitationsModel();

  //***************************************************************************
  // Start boilerplate to make this a subscribable svelte store
  //***************************************************************************
  _subscription: Record<number, (arg0: ReaderModel) => void> = {};
  _subscriptionNum = 0;

  _dirty() {
    for (const subscription of Object.values(this._subscription)) {
      subscription(this);
    }
  }

  subscribe(subscription: (value: ReaderModel) => void): () => void {
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

  constructor() {
    this.session = Math.random().toString(36).substr(2);
  }

  clear() {
    this.error = "";
    this.errorMessage = "";

    this.rawSrc = "";
    this.urlSrc = "";
    this.name = "";
    this.sourceType = "";

    this.uuid = "";
    this.indexPath = "";
    this.version = "";
    this.frameworkVersion = "";
    this.zipReader = null;
    this.port = null;

    this.metadata = {};

    this.provenanceModel = new ProvenanceModel();
    this.citationsModel = new CitationsModel();

    this._dirty();
  }

  async readData(src: File | string, tab: string = "") {
    this.clear();
    loading.setLoading(true, "Loading started");

    try {
      let data = src instanceof File ? src : await this._readRemoteData(src);
      await this.initModelFromData(data);

      if (src instanceof File) {
        this._setLocalSrc(src);
      } else {
        this._setRemoteSrc(src);
      }
    } catch (err: any) {
      const uuid = this.uuid;

      // If we encountered an error we completely clear out our data
      this.clear();

      // Try to persist this. Very real chance if this is a file we don't have
      // a uuid yet, but that's fine
      if (src instanceof File) {
        this.urlSrc = uuid;
      } else {
        this.urlSrc = src;
      }

      console.log(err);
      loading.setLoading(false);
      handleError(err);
      return;
    }

    // We set this after reading the data because sometimes which tab we go to
    // is dependent on whether we read an artifact or a visualization and we
    // don't have a great way of knowing that for certain until we've actually
    // read it
    if (src instanceof File) {
      this._setLocalTab();
    } else {
      this._setRemoteTab(tab);
    }

    loading.setLoading(false);
    this._dirty();
  }

  async _readRemoteData(src: string) {
    loading.setMessage(
      "Reading remote data (this can take a while if the file is large)",
    );
    const sourceURL = new URL(src);

    if (sourceURL.hostname === "www.dropbox.com") {
      // Handle potential DropBox URL weirdness to do with search params
      sourceURL.searchParams.set("dl", "1");
      const path = `${sourceURL.pathname}?${sourceURL.searchParams}`;
      src = `https://dl.dropboxusercontent.com${path}`;
    } else if (sourceURL.hostname === "zenodo.org") {
      // Handle translating a regular zenodo download link to a zenodo API link
      if (!sourceURL.pathname.startsWith("/api")) {
        sourceURL.pathname = `/api${sourceURL.pathname}`;
      }

      if (!sourceURL.pathname.endsWith("/content")) {
        sourceURL.pathname = `${sourceURL.pathname}/content`;
      }

      src = sourceURL.href;
    }

    return await this._getRemoteFile(src);
  }

  _setLocalSrc(src: File) {
    this.urlSrc = this.uuid;
    this.name = src.name;
    this.sourceType = "local";
    this.rawSrc = src;
  }

  _setLocalTab() {
    let tab = this._getTab();

    // Pushes state because this change necessarily happened to move from the
    // root page to the new default page for the provided file
    history.pushState({}, "", `/${tab}/?src=${this.urlSrc}`);
  }

  _setRemoteSrc(src: string) {
    this.urlSrc = src;
    this.name = this.parseFileNameFromURL(src);
    this.sourceType = "remote";
    this.rawSrc = src;
  }

  _setRemoteTab(tab: string) {
    // If we were not given a tab then revert to the default behavior
    if (!tab) {
      tab = this._getTab();
    }

    history.replaceState({}, "", `/${tab}/?src=${this.urlSrc}`);
  }

  _getTab() {
    // If we have an index path we are a visualization and auto redirect to that
    // tab otherwise we are an artifact and auto redirect to the citations tab
    return this.indexPath ? "visualization" : "citations";
  }

  async _getRemoteFile(url: string): Promise<Blob> {
    return await fetch(url).then((response) => {
      if (!response.ok) {
        throw Error(`Network error, recieved ${response.status} from server.`);
      }

      return response.blob();
    });
  }

  private parseFileNameFromURL(url: string): string {
    const sourceURL = new URL(url);

    // Casting this to URL then splitting it like this makes sure we avoid the
    // hostname and any searchparams
    let splits = sourceURL.pathname.split("/");
    let fileName = splits.pop();

    // If we have a zenodo api url it will end with /content which we don't
    // want to use as the filename
    if (sourceURL.hostname === "zenodo.org" && fileName === "content") {
      fileName = splits.pop();
    }

    if (fileName === undefined) {
      throw Error(`Could not get filename from the URL ${url}`);
    }

    return fileName;
  }

  async initModelFromData(data: File | Blob) {
    loading.setMessage("Loading file data");

    const jsZip = new JSZip();
    const zip = await jsZip.loadAsync(data);
    const error = new Error("Not a valid QIIME 2 archive.");

    // Verify layout:
    // 1) Root dir named with UUID, only object in zip root
    // 2) UUID dir has a file named `VERSION`
    const files = Object.keys(zip.files);
    const parsedPaths = [];
    files.forEach((f) => {
      const fileParts = f.split("/");
      for (let i = 1; i <= fileParts.length; i += 1) {
        parsedPaths.push(fileParts.slice(0, i).join("/"));
      }
    });
    const uniquePaths = parsedPaths.filter(
      (value, index, self) => self.indexOf(value) === index,
    );

    // http://stackoverflow.com/a/13653180
    const uuidRegEx =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; // eslint-disable-line max-len
    let allInUUID = true;
    uniquePaths.every((path) => {
      const parts = path.split("/");
      if (!uuidRegEx.test(parts[0])) {
        allInUUID = false;
        return false; // break
      }
      return true;
    });

    // If every path has UUID, then proceed
    if (!allInUUID) {
      throw error;
    }

    const UUID = uniquePaths[0].split("/")[0];

    // Search for VERSION file
    if (uniquePaths.find((path) => path === `${UUID}/VERSION`) === undefined) {
      throw error;
    }

    this.uuid = UUID;
    this.zipReader = zip;

    // Set Metadata
    this.metadata = await getYAML("metadata.yaml", this.uuid, this.zipReader);

    // Determine if we have a visualization or an artifact
    if (this.metadata["type"] === "Visualization") {
      this.indexPath = `/_/${this.session}/${UUID}/data/index.html`;
    } else {
      this.indexPath = "";
    }

    // Set Citations
    loading.setMessage("Loading Citations");
    this.citationsModel.init(this.uuid, zip);
    await this.citationsModel.getCitations();

    // Set Provenance
    loading.setMessage("Loading Provenance");
    this.provenanceModel.init(this.uuid, zip);
    await this.provenanceModel.getProvenanceTree();
  }

  attachToServiceWorker() {
    window.navigator.serviceWorker.onmessage = (event) => {
      if (event.data.session !== this.session) {
        return; // This message is meant for another tab.
      }
      switch (event.data.type) {
        case "GET_DATA":
          // decode should go in the SW, but that'd require an upgrade
          getFile(
            decodeURIComponent(event.data.filename),
            this.uuid,
            this.zipReader,
          )
            .then((data) => {
              // the request should provide a port for later response
              event.ports[0].postMessage(data);
            })
            .catch((error) => {
              console.error(error);
              // Post a "we got an error" response asap to avoid the browser
              // waiting on a file that will never exist
              event.ports[0].postMessage({ data: "", type: "error" });
            }); // eslint-disable-line no-console
          break;
        default:
          console.log(`Unknown SW event type: ${event.data.type}`); // eslint-disable-line no-console
          break;
      }
    };
  }

  getURLOfPath(relpath) {
    return `/_/${this.session}/${this.uuid}/${relpath}`;
  }
}

// Create a singleton version of the reader for this session
const readerModel = new ReaderModel();
export default readerModel;
