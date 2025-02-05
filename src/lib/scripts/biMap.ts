// Two way map class minimal implementation for what is currently needed
export default class BiMap {
  keyToValue;
  valueToKey;

  constructor() {
    this.keyToValue = new Map();
    this.valueToKey = new Map();
  }

  set(key: any, value: any) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  get(key: any): any {
    return this.keyToValue.get(key);
  }

  getKey(value: any): any {
    return this.valueToKey.get(value);
  }

  values(): any {
    return this.keyToValue.values();
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
}
