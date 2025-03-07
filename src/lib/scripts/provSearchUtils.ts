import { get_parser, Transformer } from "$lib/scripts/parser";
import provenanceModel from "$lib/models/provenanceModel";

const OR = "|";
const AND = "&";

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
    const keyList = [];

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
    return string.value.slice(1, -1);
  }

  NUMBER(number) {
    return Number(number.value);
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
  key: Array<string>;
  value: any;

  constructor(key: Array<string>, value: any) {
    this.key = key;
    this.value = value;
  }
}

//*****************************************************************************
// Unbelievably Set.Union and Set.Intersection were only added to the
// ECMAScript standard in 2024, so I'm going to implement them here in ways
// that will work on older js.
//****************************************************************************/
function _setUnion(setA: Set<string>, setB: Set<string>) {
  return new Set([...setA, ...setB]);
}

function _setIntersection(setA: Set<string>, setB: Set<string>) {
  return new Set([...setA].filter((elem) => setB.has(elem)));
}

function _searchProvenanceValue(json: Array<any>, index: number): Set<string> {
  const elem = json[index];
  let hits = new Set<string>();

  if (elem.constructor === Array) {
    hits = _searchProvenanceValue(elem, 0);
  } else if (elem.constructor === _Pair) {
    hits = _searchProvKey(elem.key, elem.value);
  } else {
    throw new Error(`Expected Array or Pair got '${elem}'`);
  }

  if (index < json.length - 1) {
    hits = _searchProvenanceOperator(json, index + 1, hits);
  }

  return hits;
}

function _searchProvenanceOperator(
  json: Array<any>,
  index: number,
  hits: Set<string>,
): Set<string> {
  const elem = json[index];
  const next_hits = _searchProvenanceValue(json, index + 1);

  if (elem === OR) {
    hits = _setUnion(hits, next_hits);
  } else if (elem === AND) {
    hits = _setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }

  return hits;
}

function _searchProvKey(key: Array<string>, value: any): Set<string> {
  let hits = new Set<string>();

  if (value === null || value.constructor !== Array) {
    // Need to check this first because null.constructor is an error
    hits = provenanceModel.searchJSON(key, value);
  } else {
    // value.constructor === Array
    hits = _searchProvKeyValue(key, value, 0);
  }

  return hits;
}

function _searchProvKeyValue(
  key: Array<string>,
  values: Array<any>,
  index: number,
): Set<string> {
  const elem = values[index];
  let hits = new Set<string>();

  if (elem.constructor === Array) {
    hits = _searchProvKeyValue(key, elem, 0);
  } else {
    hits = _searchProvKey(key, elem);
  }

  if (index < values.length - 1) {
    hits = _searchProvKeyOperator(key, values, index + 1, hits);
  }

  return hits;
}

function _searchProvKeyOperator(
  key: Array<string>,
  values: Array<any>,
  index: number,
  hits: Set<string>,
): Set<string> {
  const elem = values[index];
  const next_hits = _searchProvKeyValue(key, values, index + 1);

  if (elem === OR) {
    hits = _setUnion(hits, next_hits);
  } else if (elem === AND) {
    hits = _setIntersection(hits, next_hits);
  } else {
    throw new Error(`Expected '${AND}' or '${OR}' got '${elem}'`);
  }

  return hits;
}

export function searchProvenance(searchValue: string) {
  const parser = get_parser();
  const myTransformer = new MyTransformer();

  const ast = parser.parse(searchValue);
  const json = myTransformer.transform(ast);
  return Array.from(_searchProvenanceValue(json, 0));
}
