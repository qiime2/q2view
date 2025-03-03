// Two way map class minimal implementation for what is currently needed
export default class BiMap {
  keyToValue: Map<any, any>;
  valueToKey: Map<any, any>;

  constructor(keyToValue: Map<any, any> | undefined = undefined) {
    if (keyToValue === undefined) {
      this.keyToValue = new Map();
      this.valueToKey = new Map();
    } else {
      this.keyToValue = keyToValue;
      this.valueToKey = this._reverseMap(keyToValue);
    }
  }

  _reverseMap(map: Map<any, any>) {
    const reversedMap: Map<any, any> = new Map();

    for (const key of map.keys()) {
      const value = map.get(key);
      reversedMap.set(value, key);
    }

    return reversedMap;
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
