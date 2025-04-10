import { expect, test } from "vitest";
import BiMap from "$lib/scripts/biMap";
import { searchProvenance, transformQuery } from "$lib/scripts/provSearchUtils";

const stringJSON = {
  uuid: "string",
  key: "42",
  keyNum: 40,
};

const altStringJSON = {
  uuid: "altString",
  key: "135",
  keyNum: 42,
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

const containsAnchorsJSON = {
  uuid: "containsAnchors",
  anchorKey: "^start and end$",
};

const containsStartJSON = {
  uuid: "containsStart",
  anchorKey: "^start and end",
};

const containsEndJSON = {
  uuid: "containsEnd",
  anchorKey: "start and end$",
};

const reversedAnchorsJSON = {
  uuid: "reversedAnchors",
  anchorKey: "end and start",
};

const quoteInStringJSON = {
  uuid: "quoteInString",
  key: 'qu"ote',
};

const escapeInStringJSON = {
  uuid: "escapeInString",
  key: "esca\\ped",
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
    ["containsAnchors", containsAnchorsJSON],
    ["containsStart", containsStartJSON],
    ["containsEnd", containsEndJSON],
    ["reversedAnchors", reversedAnchorsJSON],
    ["quoteInString", quoteInStringJSON],
    ["escapeInString", escapeInStringJSON],
  ]),
);

test("test string", () => {
  const searchQuery = transformQuery(
    'key: "42" OR key: "true" OR key: "false" OR key: "null"',
  );
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string");
});

test("test number", () => {
  const searchQuery = transformQuery("key: 42");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("number");
});

test("test true", () => {
  const searchQuery = transformQuery("key: true");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("true");
});

test("test false", () => {
  const searchQuery = transformQuery("key: false");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("false");
});

test("test null", () => {
  const searchQuery = transformQuery("key: null");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("null");
});

test("test nested key", () => {
  const searchQuery = transformQuery('nested.key: "nested"');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("nested");
});

test("test escaped key", () => {
  const searchQuery = transformQuery('escap\\.ed.key: "escaped"');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("escaped");
});

test("test value list", () => {
  const searchQuery = transformQuery('key: (("4" AND "2") OR "3")');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string,altString");
});

test("test query list", () => {
  const searchQuery = transformQuery(
    '(key: "42" AND keyNum: 40) OR nested.key: "nested"',
  );
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string,nested");
});

test("test start anchor", () => {
  const searchQuery = transformQuery('anchorKey: ^"start"');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("anchor,containsEnd");
});

test("test end anchor", () => {
  const searchQuery = transformQuery('anchorKey: "end"$');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("anchor,containsStart");
});

test("test both anchors", () => {
  const searchQuery = transformQuery('anchorKey: ^"start and end"$');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("anchor");
});

test("test escaped anchors", () => {
  const searchQuery = transformQuery('anchorKey: "^start and end$"');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("containsAnchors");
});

test("test escaped start", () => {
  const searchQuery = transformQuery('anchorKey: "^start and end"$');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("containsStart");
});

test("test escaped end", () => {
  const searchQuery = transformQuery('anchorKey: ^"start and end$"');
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("containsEnd");
});

test("test get key", () => {
  const searchQuery = transformQuery("anchorKey");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe(
    "anchor,containsAnchors,containsStart,containsEnd,reversedAnchors",
  );
});

test("test get >", () => {
  const searchQuery = transformQuery("keyNum: >40");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("altString");
});

test("test get >=", () => {
  const searchQuery = transformQuery("keyNum: >=40");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string,altString");
});

test("test get <", () => {
  const searchQuery = transformQuery("keyNum: <42");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string");
});

test("test get <=", () => {
  const searchQuery = transformQuery("keyNum: <=42");
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("string,altString");
});

test('test get "', () => {
  const searchQuery = transformQuery(String.raw`key: "\""`);
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("quoteInString");
});

test("test get \\", () => {
  const searchQuery = transformQuery(String.raw`key: "\\"`);
  const hits = Array.from(searchProvenance(searchQuery, testMap));

  expect(hits.toString()).toBe("escapeInString");
});

test("no hits", () => {
  const searchQuery = transformQuery("notAKey");
  expect(() => searchProvenance(searchQuery, testMap)).toThrowError(
    "No search hits found",
  );
});
