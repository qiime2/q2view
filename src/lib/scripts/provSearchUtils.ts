import { get_parser, Transformer } from "$lib/scripts/parser";
import { getAllObjectKeysRecursively, setUnion, setIntersection } from "./util";
import BiMap from "./biMap";

const OR = "|";
const AND = "&";

// Define anchor constants for searching
const START_ANCHOR = "^";
const ESCAPED_START_ANCHOR = "\\^";
const END_ANCHOR = "$";
const ESCAPED_END_ANCHOR = "\\$";

class MyTransformer extends Transformer {
  start(start) {
    return start;
  }

  pair(pair) {
    return pair[0];
  }

  pair_single(pair) {
    const key = pair[0];
    const value = pair[1];

    return new _Pair(key, value);
  }

  pair_group(pair_group) {
    return pair_group;
  }

  value_group(list) {
    return list;
  }

  // They key allows for the union of valid Python identifiers and valid
  // Conda package names. The Conda package names only adds . and -. We use
  // . as the key sep meaning . in the key must be escaped \.
  key(key) {
    const keyList = new _Key<string>();

    for (const child of key) {
      // Undefined is the seperators which we don't want inlcuded in here
      if (child !== undefined) {
        // There can't be any \ characters actually in the key, so kill
        // off the escape characters here
        keyList.push(child.replace("\\", ""));
      }
    }

    return keyList;
  }

  value(value) {
    return value[0];
  }

  STRING(string) {
    // slice the quotes off
    return string.value.slice(1, -1);
  }

  NUMBER(number) {
    for (const operator of ["=", ">=", ">", "<=", "<"]) {
      if (number.value.startsWith(operator)) {
        return new _Number(operator, Number(number.value.split(operator)[1]));
      }
    }

    return new _Number("=", Number(number.value));
  }

  TRUE(_) {
    return true;
  }

  FALSE(_) {
    return false;
  }

  NULL(_) {
    return null;
  }

  OR(_) {
    return OR;
  }

  AND(_) {
    return AND;
  }

  KEY_SEP(_) {
    return;
  }

  KEY_VALUE(key_value) {
    return key_value.value;
  }
}

class _Pair {
  key: _Key<string>;
  value: any;

  constructor(key: _Key<string>, value: any) {
    this.key = key;
    this.value = value;
  }
}

class _Key<T> extends Array {}

class _Number {
  operator: "=" | ">=" | ">" | "<=" | "<";
  value: number;

  constructor(operator: "=" | ">=" | ">" | "<=" | "<", value: number) {
    this.operator = operator;
    this.value = value;
  }
}

function _searchProvenanceValue(
  json: Array<any>,
  index: number,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  const elem = json[index];
  let hits = new Set<string>();

  if (elem.constructor === Array) {
    hits = _searchProvenanceValue(elem, 0, jsonMAP);
  } else if (elem.constructor === _Pair) {
    hits = _searchProvKey(elem.key, elem.value, jsonMAP);
  } else if (elem.constructor === _Key) {
    hits = searchJSONMap(elem, undefined, jsonMAP);
  } else {
    throw new Error(
      `Expected Array, Pair, or Key. Got '${elem}' of type '${typeof elem}'`,
    );
  }

  if (index < json.length - 1) {
    hits = _searchProvenanceOperator(json, index + 1, hits, jsonMAP);
  }

  return hits;
}

function _searchProvenanceOperator(
  json: Array<any>,
  index: number,
  hits: Set<string>,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  const elem = json[index];
  const next_hits = _searchProvenanceValue(json, index + 1, jsonMAP);

  if (elem === OR) {
    hits = setUnion(hits, next_hits);
  } else if (elem === AND) {
    hits = setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }

  return hits;
}

function _searchProvKey(
  key: Array<string>,
  value: any,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  let hits = new Set<string>();

  if (value === null || value.constructor !== Array) {
    // Need to check this first because null.constructor is an error
    hits = searchJSONMap(key, value, jsonMAP);
  } else {
    // value.constructor === Array
    hits = _searchProvKeyValue(key, value, 0, jsonMAP);
  }

  return hits;
}

function _searchProvKeyValue(
  key: Array<string>,
  values: Array<any>,
  index: number,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  const elem = values[index];
  let hits = new Set<string>();

  if (elem.constructor === Array) {
    hits = _searchProvKeyValue(key, elem, 0, jsonMAP);
  } else {
    hits = _searchProvKey(key, elem, jsonMAP);
  }

  if (index < values.length - 1) {
    hits = _searchProvKeyOperator(key, values, index + 1, hits, jsonMAP);
  }

  return hits;
}

function _searchProvKeyOperator(
  key: Array<string>,
  values: Array<any>,
  index: number,
  hits: Set<string>,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  const elem = values[index];
  const next_hits = _searchProvKeyValue(key, values, index + 1, jsonMAP);

  if (elem === OR) {
    hits = setUnion(hits, next_hits);
  } else if (elem === AND) {
    hits = setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }

  return hits;
}

/**
 * Searches the values of the provided jsonMAP for json with keys matching the
 * key param with a value matching the searchValue param then returns a set of
 * their keys in the jsonMAP
 *
 * @param {Array<string>} key - The key, or nested sequence of keys, to check
 * for our value
 * @param {any} searchValue - The value we are searching for in the JSON
 * @param {BiMap<string, {}>} jsonMAP - A mapping of node IDs in the graph to
 * the provenane that goes along with that node
 *
 * @returns {Set<string>} - A set of the uuids of all actions/results that
 * were hit by the search
 */
function searchJSONMap(
  key: Array<string>,
  searchValue: any,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  const hits = new Set<string>();
  let hit: string | undefined;

  for (const json of jsonMAP.values()) {
    const jsonKeys: Array<Array<string>> = [];

    getAllObjectKeysRecursively(json, [], jsonKeys);
    for (const jsonKey of jsonKeys) {
      const terminal = jsonKey.slice(-key.length);

      // If the end of the key path matches the provided key
      if (JSON.stringify(terminal) === JSON.stringify(key)) {
        if (searchValue === undefined) {
          // We had a key with no value, so we only search the key
          hit = jsonMAP.getKey(json);
        } else {
          // Dig through the json to get the actual value at the end of the key
          // path
          let value = json[jsonKey[0]];

          for (let i = 1; i < jsonKey.length; i++) {
            value = value[jsonKey[i]];
          }

          if (typeof value == "string" && typeof searchValue === "string") {
            hit = _matchString(searchValue, value, json, jsonMAP);
          } else if (
            searchValue !== null &&
            searchValue.constructor === _Number
          ) {
            hit = _matchNumber(searchValue, value, json, jsonMAP);
          } else if (value === searchValue) {
            // For bools and nulls match on equality
            hit = jsonMAP.getKey(json);
          }
        }

        if (hit !== undefined) {
          hits.add(hit);
        }
      }
    }
  }

  return hits;
}

function _matchString(
  searchValue: any,
  value: string,
  json: {},
  jsonMAP: BiMap<string, {}>,
): string | undefined {
  let unescapedStart = searchValue;
  let unescapedEnd = searchValue;
  let unescapedSearchValue = searchValue;

  // Unescape any escaped anchors
  if (searchValue.startsWith(ESCAPED_START_ANCHOR)) {
    unescapedStart = "^" + searchValue.slice(2);
    unescapedSearchValue = "^" + unescapedSearchValue.slice(2);
  }

  if (searchValue.endsWith(ESCAPED_END_ANCHOR)) {
    unescapedEnd = searchValue.slice(0, -2) + "$";
    unescapedSearchValue = unescapedSearchValue.slice(0, -2) + "$";
  }

  // For strings, we need to get fiddly with the matching
  if (
    searchValue.startsWith(START_ANCHOR) &&
    searchValue.endsWith(END_ANCHOR) &&
    !searchValue.endsWith(ESCAPED_END_ANCHOR)
  ) {
    // Start anchor and end anchor match on equality
    if (value === searchValue.slice(1, -1)) {
      return jsonMAP.getKey(json);
    }
  } else if (unescapedEnd.startsWith(START_ANCHOR)) {
    // Start anchor match on starts with
    if (value.startsWith(unescapedEnd.slice(1))) {
      return jsonMAP.getKey(json);
    }
  } else if (
    unescapedStart.endsWith(END_ANCHOR) &&
    !unescapedStart.endsWith(ESCAPED_END_ANCHOR)
  ) {
    // End anchor match on ends with
    if (value.endsWith(unescapedStart.slice(0, -1))) {
      return jsonMAP.getKey(json);
    }
  } else if (value.includes(unescapedSearchValue)) {
    // No anchor match on includes
    return jsonMAP.getKey(json);
  }
}

function _matchNumber(
  searchValue: any,
  value: string,
  json: {},
  jsonMAP: BiMap<string, {}>,
): string | undefined {
  // For numbers match based on value and operator
  switch (searchValue.operator) {
    case "=":
      if (value === searchValue.value) {
        return jsonMAP.getKey(json);
      }
      break;
    case ">":
      if (value > searchValue.value) {
        return jsonMAP.getKey(json);
      }
      break;
    case ">=":
      if (value >= searchValue.value) {
        return jsonMAP.getKey(json);
      }
      break;
    case "<":
      if (value < searchValue.value) {
        return jsonMAP.getKey(json);
      }
      break;
    case "<=":
      if (value <= searchValue.value) {
        return jsonMAP.getKey(json);
      }
      break;
  }
}

export function transformQuery(searchValue: string): Array<string> {
  const parser = get_parser();
  const myTransformer = new MyTransformer();

  const ast = parser.parse(searchValue);
  return myTransformer.transform(ast);
}

export function searchProvenance(
  searchQuery: Array<string>,
  jsonMAP: BiMap<string, {}>,
): Set<string> {
  return _searchProvenanceValue(searchQuery, 0, jsonMAP);
}
