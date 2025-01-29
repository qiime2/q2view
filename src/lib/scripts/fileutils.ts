import yaml from "js-yaml";

import { readBlobAsText } from "$lib/scripts/util";
import extmap from "$lib/scripts/extmap";
import schema from "$lib/scripts/yaml-schema";

export function getFile(relpath, uuid, zipReader) {
  const ext = relpath.split(".").pop();
  const fp = `${uuid}/${relpath}`;
  const filehandle = zipReader.file(fp);

  let filepromise = null;
  if (filehandle === null) {
    filepromise = () => Promise.reject(`No such file: ${fp}`);
  } else {
    filepromise = () => filehandle.async("uint8array");
  }

  return filepromise().then((byteArray) => ({
    byteArray,
    type: extmap[ext] || "",
  }));
}

export function getYAML(relpath, uuid, zipReader) {
  return getFile(relpath, uuid, zipReader)
    .then((data) => new Blob([data.byteArray], { type: data.type }))
    .then(readBlobAsText)
    .then((text) => yaml.safeLoad(text, { schema }));
}
