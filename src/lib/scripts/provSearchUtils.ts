import { get_parser, Transformer } from "$lib/scripts/parser";
import {
  getAllObjectKeyPathsRecursively,
  setUnion,
  setIntersection,
} from "./util";
import BiMap from "./biMap";

const OR = "|";
const AND = "&";

// Define anchor constants for searching
const START_ANCHOR = "^";
const ESCAPED_START_ANCHOR = "\\^";
const END_ANCHOR = "$";
const ESCAPED_END_ANCHOR = "\\$";

// Parse our query and transform it into something usable
export function transformQuery(searchValue: string): Array<string> {
  const parser = get_parser();
  const myTransformer = new MyTransformer();

  const ast = parser.parse(searchValue);
  return myTransformer.transform(ast);
}

// Search provenance for anything matching our query
export function searchProvenance(
  transformedQuery: Array<string>,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  return _searchProv(transformedQuery, 0, provenanceMap);
}

// Sentinel class to see that we have a pair
class _Pair {
  key: _Key<string>;
  value: any;

  constructor(key: _Key<string>, value: any) {
    this.key = key;
    this.value = value;
  }
}

// Sentinel class to see that we have akKey
class _Key<T> extends Array {}

// Class storing a number its relevant operator together
class _Number {
  operator: "=" | ">=" | ">" | "<=" | "<";
  value: number;

  constructor(operator: "=" | ">=" | ">" | "<=" | "<", value: number) {
    this.operator = operator;
    this.value = value;
  }
}

// Transform the AST produced by the lark parser into JSON we can use
class MyTransformer extends Transformer {
  // The entry point of the parser
  start(start) {
    return start;
  }

  // pair can be either pair_single or pair_group. For some reason, when the
  // lark parser sees a pair, it puts it in a list. This will always be a
  // single element list containing the pair_single or pair_group it saw. Just
  // get the element out of the list
  pair(pair) {
    return pair[0];
  }

  // Pick the pair apart into a _Pair letting us know in the final JSON that
  // this was indeed a pair
  pair_single(pair) {
    const key = pair[0];
    const value = pair[1];

    return new _Pair(key, value);
  }

  pair_group(pair_group) {
    // Every individual pair in the group will be transformed, we don't need to
    // care about the group
    return pair_group;
  }

  value_group(value_group) {
    return value_group;
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

  KEY_COMPONENT(key_component) {
    return key_component.value;
  }
}

function _searchProv(
  transformedQuery: Array<any>,
  queryIndex: number,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const elem = transformedQuery[queryIndex];
  let hits = new Set<string>();

  if (elem.constructor === Array) {
    // If we see an Array here, then we have multiple search clauses anded or
    // ored together
    hits = _searchProv(elem, 0, provenanceMap);
  } else if (elem.constructor === _Pair) {
    // If we see a _Pair here, we could have a single pair, or a pair_group
    hits = _searchProvPair(elem.key, elem.value, 0, provenanceMap);
  } else if (elem.constructor === _Key) {
    // We have a bare key that we are searching for
    hits = searchJSONMap(elem, undefined, provenanceMap);
  } else {
    throw new Error(
      `Expected Array, Pair, or Key. Got '${elem}' of type '${typeof elem}'`,
    );
  }

  if (queryIndex < transformedQuery.length - 1) {
    hits = _searchProvOperator(
      transformedQuery,
      queryIndex + 1,
      hits,
      provenanceMap,
    );
  }

  return hits;
}

function _searchProvOperator(
  transformedQuery: Array<any>,
  queryIndex: number,
  hits: Set<string>,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const elem = transformedQuery[queryIndex];
  const next_hits = _searchProv(
    transformedQuery,
    queryIndex + 1,
    provenanceMap,
  );

  if (elem === OR) {
    return setUnion(hits, next_hits);
  } else if (elem === AND) {
    return setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }
}

function _searchProvPair(
  key: Array<string>,
  value: any,
  queryIndex: number,
  provenanceMap: BiMap<string, {}>,
): Set<string> {

  let hits = new Set<string>();

  if (value === null || value.constructor !== Array) {
    return searchJSONMap(key, value, provenanceMap);
  }

  const elem = value[queryIndex];
  hits = _searchProvPair(key, elem, 0, provenanceMap);

  if (queryIndex < value.length - 1) {
    hits = _searchProvPairOperator(
      key,
      value,
      queryIndex + 1,
      hits,
      provenanceMap,
    );
  }

  return hits;
}

function _searchProvPairOperator(
  key: Array<string>,
  values: Array<any>,
  queryIndex: number,
  hits: Set<string>,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const elem = values[queryIndex];
  const next_hits = _searchProvPair(
    key,
    values,
    queryIndex + 1,
    provenanceMap,
  );

  if (elem === OR) {
    return setUnion(hits, next_hits);
  } else if (elem === AND) {
    return setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }
}

/**
 * Searches the values of the provided jsonMAP for json with keys matching the
 * key param with a value matching the searchValue param then returns a set of
 * their keys in the jsonMAP
 *
 * @param {Array<string>} key - The key, or nested sequence of keys, to check
 * for our value
 * @param {any} searchValue - The value we are searching for in the JSON
 * @param {BiMap<string, {}>} provenanceMap - A mapping of node IDs in the graph to
 * the provenane that goes along with that node
 *
 * @returns {Set<string>} - A set of the uuids of all actions/results that
 * were hit by the search
 */
function searchJSONMap(
  key: Array<string>,
  searchValue: any,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const hits = new Set<string>();
  let hit: string | undefined;

  for (const json of provenanceMap.values()) {
    const jsonKeys: Array<Array<string>> = [];

    getAllObjectKeyPathsRecursively(json, [], jsonKeys);
    for (const jsonKey of jsonKeys) {
      const terminal = jsonKey.slice(-key.length);

      // If the end of the key path matches the provided key
      if (JSON.stringify(terminal) === JSON.stringify(key)) {
        if (searchValue === undefined) {
          // We had a key with no value, so we only search the key
          hit = provenanceMap.getKey(json);
        } else {
          // Dig through the json to get the actual value at the end of the key
          // path
          let value = json[jsonKey[0]];

          for (let i = 1; i < jsonKey.length; i++) {
            value = value[jsonKey[i]];
          }

          if (typeof value == "string" && typeof searchValue === "string") {
            hit = _matchString(searchValue, value, json, provenanceMap);
          } else if (
            searchValue !== null &&
            searchValue.constructor === _Number
          ) {
            hit = _matchNumber(searchValue, value, json, provenanceMap);
          } else if (value === searchValue) {
            // For bools and nulls match on equality
            hit = provenanceMap.getKey(json);
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
  provenanceMap: BiMap<string, {}>,
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
      return provenanceMap.getKey(json);
    }
  } else if (unescapedEnd.startsWith(START_ANCHOR)) {
    // Start anchor match on starts with
    if (value.startsWith(unescapedEnd.slice(1))) {
      return provenanceMap.getKey(json);
    }
  } else if (
    unescapedStart.endsWith(END_ANCHOR) &&
    !unescapedStart.endsWith(ESCAPED_END_ANCHOR)
  ) {
    // End anchor match on ends with
    if (value.endsWith(unescapedStart.slice(0, -1))) {
      return provenanceMap.getKey(json);
    }
  } else if (value.includes(unescapedSearchValue)) {
    // No anchor match on includes
    return provenanceMap.getKey(json);
  }
}

function _matchNumber(
  searchValue: any,
  value: string,
  json: {},
  provenanceMap: BiMap<string, {}>,
): string | undefined {
  // For numbers match based on value and operator
  switch (searchValue.operator) {
    case "=":
      if (value === searchValue.value) {
        return provenanceMap.getKey(json);
      }
      break;
    case ">":
      if (value > searchValue.value) {
        return provenanceMap.getKey(json);
      }
      break;
    case ">=":
      if (value >= searchValue.value) {
        return provenanceMap.getKey(json);
      }
      break;
    case "<":
      if (value < searchValue.value) {
        return provenanceMap.getKey(json);
      }
      break;
    case "<=":
      if (value <= searchValue.value) {
        return provenanceMap.getKey(json);
      }
      break;
  }
}
