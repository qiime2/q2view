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
const END_ANCHOR = "$";

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
): Array<string> {
  const searchHits = Array.from(
    _searchProv(transformedQuery, 0, provenanceMap),
  );

  if (searchHits.length === 0) {
    throw new Error("No search hits found");
  }

  return searchHits;
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

// Class storing a string value and any anchors it contains together
class _String {
  value: string;
  startAnchor: boolean;
  endAnchor: boolean;

  constructor(value: string, startAnchor: boolean, endAnchor: boolean) {
    this.value = value;
    this.startAnchor = startAnchor;
    this.endAnchor = endAnchor;
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
    let stringValue = string.value;
    let startAnchor = false;
    let endAnchor = false;

    // Handle the start anchor and end anchor if either was provided
    if (stringValue.startsWith(START_ANCHOR)) {
      startAnchor = true;
      stringValue = stringValue.slice(1);
    }

    if (stringValue.endsWith(END_ANCHOR)) {
      endAnchor = true;
      stringValue = stringValue.slice(0, -1);
    }

    // The string will have the start and end quotes they entered. Remove those
    const unquotedStringValue = stringValue.slice(1, -1);

    // If they had any quotes they needed to escape mid string, we need to
    // unescape those so we don't have the \ in our final search query
    const unescapedQuotes = unquotedStringValue.replace('\\"', '"');

    // Finally, if they had any \ mid string they needed to escape, we want to
    // unescape those so we only have one \ in our final query not \\.
    const unescapedSlashes = unescapedQuotes.replace("\\\\", "\\");

    return new _String(unescapedSlashes, startAnchor, endAnchor);
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

/**
 * Handles the top level of search queries. Standalone keys, pairs, and arrays
 * of the above.
 *
 * @param {Array<any>} transformedQuery - The query the user originally entered
 * after being parsed and transformed
 * @param {number} queryIndex - The index into the transformed query array of
 * the element in the query we are currently handling
 * @param {BiMap<string, {}>} provenanceMap - A mapping of all node uuids in
 * the DAG to their provenance as json
 *
 * @returns {Set<string>} - A set of all node UUIDS hit by this search query.
 * For nested queries, this set is built up by recursing through the query and
 * intersecting/unioning together the results of any sub queries.
 */
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

  // We know we must start and end with queries and all queries must be
  // seperated by operators, so if we aren't at the end yet the next value
  // must be an operator
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

/**
 * Handles the operators seperating different top level query elements from one
 * another.
 *
 * @param {Array<any>} transformedQuery - The query the user originally entered
 * after being parsed and transformed
 * @param {number} queryIndex - The index into the transformed query array of
 * the element in the query we are currently handling
 * @param {BiMap<string, {}>} provenanceMap - A mapping of all node uuids in
 * the DAG to their provenance as json
 * @param {Set<string>} hits - The hits we have seen so far from prior sub
 * queries
 * @param {BiMap<string, {}>} provenanceMap - A mapping of all node uuids in
 * the DAG to their provenance as json
 *
 * @returns {Set<string>} - The set of all uuids hit by sub queries so far
 * combined via the specified operator with future sub queries
 */
function _searchProvOperator(
  transformedQuery: Array<any>,
  queryIndex: number,
  hits: Set<string>,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const elem = transformedQuery[queryIndex];
  // Get the results of the next sub query to combine via our operator with
  // our current results
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

/**
 * Handles a pair or pair group. A pair is just a key: value pair, a pair_group
 * is key: value1 OR value2
 *
 * @param {Array<string>} key - The key we are searching represented as a list
 * of the different levels of key in the json
 * @param {any} value - The value we are trying to match this key against or
 * the array of values connected by logical AND or OR
 * @param {number} queryIndex - The index into the value array we are currently
 * looking at, this is irrelevant if value is not an array.
 * @param {BiMap<string, {}>} provenanceMap - A mapping of all node uuids in
 * the DAG to their provenance as json
 *
 * @returns {Set<string>} - The set of all uuids hit by sub queries so far
 */
function _searchProvPair(
  key: Array<string>,
  value: any,
  queryIndex: number,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  let hits = new Set<string>();

  // We have a terminal key: value pair, so return the hits from it
  if (value === null || value.constructor !== Array) {
    return searchJSONMap(key, value, provenanceMap);
  }

  // We have a pair_group array, so recurse through it
  const elem = value[queryIndex];
  hits = _searchProvPair(key, elem, 0, provenanceMap);

  // We know we must start and end with queries and all queries must be
  // seperated by operators, so if we aren't at the end yet the next value
  // must be an operator
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

/**
 * Handles operators seperating pairs in a pair group.
 *
 * @param {Array<string>} key - The key we are searching represented as a list
 * of the different levels of key in the json
 * @param {any} value - The value we are trying to match this key against or
 * the array of values connected by logical AND or OR
 * @param {number} queryIndex - The index into the value array we are currently
 * looking at, this is irrelevant if value is not an array.
 * @param {BiMap<string, {}>} provenanceMap - A mapping of all node uuids in
 * the DAG to their provenance as json
 * @param {Set<string>} hits - The set of all uuids hit by sub queries so far
 *
 * @returns {Set<string>} - The set of all uuids hit by sub queries so far
 * combined via the specified operator with future sub queries
 */
function _searchProvPairOperator(
  key: Array<string>,
  value: Array<any>,
  queryIndex: number,
  hits: Set<string>,
  provenanceMap: BiMap<string, {}>,
): Set<string> {
  const elem = value[queryIndex];
  // Get the results of the next sub query to combine via our operator with
  // our current results
  const next_hits = _searchProvPair(key, value, queryIndex + 1, provenanceMap);

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

    // NOTE: This works fast enough that we can just do it on demand, but it
    // may be worth it to memoize it.
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

          if (
            typeof value === "string" &&
            searchValue !== null &&
            searchValue.constructor === _String
          ) {
            hit = _matchString(searchValue, value, json, provenanceMap);
          } else if (
            typeof value === "number" &&
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
  searchValue: _String,
  value: string,
  json: {},
  provenanceMap: BiMap<string, {}>,
): string | undefined {
  if (searchValue.startAnchor && searchValue.endAnchor) {
    // Both anchors, match on equality
    if (value === searchValue.value) {
      return provenanceMap.getKey(json);
    }
  } else if (searchValue.startAnchor) {
    // Start anchor, match on starts with
    if (value.startsWith(searchValue.value)) {
      return provenanceMap.getKey(json);
    }
  } else if (searchValue.endAnchor) {
    // End anchor, match on ends with
    if (value.endsWith(searchValue.value)) {
      return provenanceMap.getKey(json);
    }
  } else {
    // No anchors, match on includes
    if (value.includes(searchValue.value)) {
      return provenanceMap.getKey(json);
    }
  }
}

function _matchNumber(
  searchValue: _Number,
  value: number,
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
