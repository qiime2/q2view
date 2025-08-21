import { Transformer } from "./parser";

// Define constants for AND and OR
export const OR = "|";
export const AND = "&";

// Define anchor constants for searching
const START_ANCHOR = "^";
const END_ANCHOR = "$";

// Sentinel class to see that we have a pair
export class _Pair {
  key: _Key<string>;
  value: any;

  constructor(key: _Key<string>, value: any) {
    this.key = key;
    this.value = value;
  }
}

// Sentinel class to see that we have akKey
export class _Key<T> extends Array {}

// Class storing a number its relevant operator together
export class _Number {
  operator: "=" | ">=" | ">" | "<=" | "<";
  value: number;

  constructor(operator: "=" | ">=" | ">" | "<=" | "<", value: number) {
    this.operator = operator;
    this.value = value;
  }
}

// Class storing a string value and any anchors it contains together
export class _String {
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
export class QueryTransformer extends Transformer {
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
