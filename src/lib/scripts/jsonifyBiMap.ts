// Two way map class that uses JSON.stringify and JSON.parse for mapping objects
// that usually compare by reference
export default class JsonifyBiMap {
  keyToValue: Map<string, string>;
  valueToKey: Map<string, string>;

  constructor() {
    this.keyToValue = new Map();
    this.valueToKey = new Map();
  }

  set(key: any, value: any) {
    key = JSON.stringify(key);
    value = JSON.stringify(value);

    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  setValue(value: any, key: any) {
    value = JSON.stringify(value);
    key = JSON.stringify(value);

    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  get(key: any): any | undefined {
    key = JSON.stringify(key);
    const value = this.keyToValue.get(key);

    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(value);
  }

  getKey(value: any): any | undefined {
    value = JSON.stringify(value);
    const key = this.valueToKey.get(value);

    if (key === undefined) {
      return undefined;
    }

    return JSON.parse(key);
  }

  keys(): MapIterator<any> {
    return this.keyToValue.keys().map((key) => JSON.parse(key));
  }

  values(): MapIterator<any> {
    return this.keyToValue.values().map((value) => JSON.parse(value));
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
}
