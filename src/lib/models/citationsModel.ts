import Cite from "citation-js";

import JSZip, { JSZipObject } from "jszip";

import asmTemplate from "$lib/citation-templates/asm";
import cellTemplate from "$lib/citation-templates/cell";
import chicagoTemplate from "$lib/citation-templates/chicago";
import mlaTemplate from "$lib/citation-templates/mla";
import natureTemplate from "$lib/citation-templates/nature";

class CitationsModel {
  // Class attributes containing current state of the citations
  fileExt = "";
  citations = "";
  fileContents = "";
  downloadableFile = "";
  formattedCitations = "";
  citationStyle = "bib";

  // Class attributes used to format the citations
  formatter = new Cite();
  register = Cite.CSL.register.addTemplate;

  // Class attributes passed in by readerModel pertaining to currently loaded
  // result
  uuid = "";
  zipReader: JSZip = new JSZip();

  //***************************************************************************
  // Start boilerplate to make this a subscribable svelte store
  //***************************************************************************
  _subscription: Record<number, (arg0: CitationsModel) => void> = {};
  _subscriptionNum = 0;

  _dirty() {
    for (const subscription of Object.values(this._subscription)) {
      subscription(this);
    }
  }

  subscribe(subscription: (value: CitationsModel) => void): () => void {
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
    this.register("asm", asmTemplate);
    this.register("cell", cellTemplate);
    this.register("chicago", chicagoTemplate);
    this.register("mla", mlaTemplate);
    this.register("nature", natureTemplate);
  }

  // This state is set by the readerModel when it comes time to read the
  // citations
  setState(uuid: string, zipReader: JSZip) {
    this.uuid = uuid;
    this.zipReader = zipReader;
  }

  formatCitations() {
    if (this.citationStyle === "bib") {
      this.formattedCitations = this.citations;
      this.fileContents = this.formattedCitations;
      this.fileExt = this.citationStyle;
    } else if (this.citationStyle === "ris") {
      this.formattedCitations = this.formatter.format(`${this.citationStyle}`);
      this.fileContents = this.formattedCitations;
      this.fileExt = this.citationStyle;
    } else {
      this.formattedCitations = this.formatter.format("bibliography", {
        type: "html",
        template: this.citationStyle,
        lang: "en-us",
        format: "html",
      });

      this.fileContents = this.formatter.format("bibliography", {
        type: "string",
        template: this.citationStyle,
        lang: "en-US",
      });

      this.fileExt = `${this.citationStyle}.txt`;
    }

    this.downloadableFile = this._getDownload();
    this._dirty();
  }

  _getDownload() {
    const blob = new Blob([this.fileContents], { type: "text/plain" });
    return URL.createObjectURL(blob);
  }

  getCitations() {
    this._getCitations().then((citations) => {
      // If citations === null then we don't have citaions for this result
      // which is fine
      console.log(citations)
      if (citations !== null) {
        this.citations = this._dedup(citations);
        this.formatter = new Cite(this.citations);

        this._dirty();
      }
    });
  }

  _getCitations() {
    if (this.zipReader.file(`${this.uuid}/provenance/citations.bib`) === null) {
      return Promise.resolve(null);
    }

    const promises: Array<Promise<any>> = [];
    const folder = this.zipReader.folder(`${this.uuid}/provenance`);

    if (folder === null) {
      throw new Error(`No folder found in Result matching ${this.uuid}/provenance`);
    }

    folder.forEach((relPath: string, file: JSZipObject) => {
        if (relPath.endsWith("citations.bib")) {
          promises.push(file.async("text"));
        }
      });

    return Promise.all(promises).then((array) => array.join(""));
  }

  _dedup(bibtex: string) {
    const store = {};
    const dedup = [];

    let skip = false;
    for (const line of bibtex.split("\n")) {
      if (line.startsWith("@")) {
        skip = false;
        const id = /@.*{(.*),\w*/.exec(line)[0];

        if (id in store) {
          skip = true;
        } else {
          store[id] = true;
        }
      }

      if (!skip) {
        dedup.push(line);
      }
    }
    return dedup.join("\n");
  }
}

const citationsModel = new CitationsModel();
export default citationsModel;
