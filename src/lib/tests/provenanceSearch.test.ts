import { expect, test } from "vitest";
import BiMap from "$lib/scripts/biMap";
import { searchProvenance } from "$lib/scripts/provSearchUtils";
import provenanceModel from "$lib/models/provenanceModel";

const stringJSON = {
  uuid: "string",
  key: "42",
  keyNum: 42,
};

const altStringJSON = {
  uuid: "altString",
  key: "135",
};

const numberJSON = {
  uuid: "number",
  key: 42,
};

const trueJSON = {
  uuid: "true",
  key: true,
};

const falseJSON = {
  uuid: "false",
  key: false,
};

const nullJSON = {
  uuid: "null",
  key: null,
};

const nestedJSON = {
  uuid: "nested",
  nested: {
    key: "nested",
  },
};

const escapedJSON = {
  uuid: "escaped",
  "escap.ed": {
    key: "escaped",
  },
};

const anchorJSON = {
  uuid: "anchor",
  anchorKey: "start and end",
};

const escapedAnchorsJSON = {
  uuid: "escapedAnchors",
  anchorKey: "^start and end$",
};

const reversedAnchorsJSON = {
  uuid: "reversedAnchors",
  anchorKey: "end and start",
};

// TS screams about this as if the Map doesn't have a constructor matching this
// but it's wrong the Map instantiates fine.
const testMap = new BiMap(
  new Map([
    ["string", stringJSON],
    ["altString", altStringJSON],
    ["number", numberJSON],
    ["true", trueJSON],
    ["false", falseJSON],
    ["null", nullJSON],
    ["nested", nestedJSON],
    ["escaped", escapedJSON],
    ["anchor", anchorJSON],
    ["escapedAnchors", escapedAnchorsJSON],
    ["reversedAnchors", reversedAnchorsJSON],
  ]),
);
provenanceModel.nodeIDToJSON = testMap;

test("test string", () => {
  const hits = searchProvenance(
    'key: "42" OR key: "true" OR key: "false" OR key: "null"',
  );
  expect(hits.toString() === '["string"]');
});

test("test number", () => {
  const hits = searchProvenance("key: 42");
  expect(hits.toString() === '["number"]');
});

test("test true", () => {
  const hits = searchProvenance("key: true");
  expect(hits.toString() === '["true"]');
});

test("test false", () => {
  const hits = searchProvenance("key: false");
  expect(hits.toString() === '["false"]');
});

test("test null", () => {
  const hits = searchProvenance("key: null");
  expect(hits.toString() === '["null"]');
});

test("test nested key", () => {
  const hits = searchProvenance('nested.key: "nested"');
  expect(hits.toString() === '["nested"]');
});

test("test escaped key", () => {
  const hits = searchProvenance('escap\.ed.key: "escaped"');
  expect(hits.toString() === '["escaoed"]');
});

test("test value list", () => {
  const hits = searchProvenance('key: (("4" AND "2") OR "3")');
  expect(hits.toString() === '["string", "altString"]');
});

test("test query list", () => {
  const hits = searchProvenance(
    '(key: "42" AND keyNum: 42) OR nested.key: "nested"',
  );
  expect(hits.toString() === '["string", "nested"]');
});

test("test start anchor", () => {
  const hits = searchProvenance('anchorKey: "^start"');
  expect(hits.toString() === '["anchor"]');
});

test("test end anchor", () => {
  const hits = searchProvenance('anchorKey: "end$"');
  expect(hits.toString() === '["anchor"]');
});

test("test both anchors", () => {
  const hits = searchProvenance('anchorKey: "^start and end$"');
  expect(hits.toString() === '["anchor"]');
});

test("test escaped anchors", () => {
  const hits = searchProvenance('anchorKey: "\^start and end\$"');
  expect(hits.toString() === '["escapedAnchors"]');
});
