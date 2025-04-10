// Two way map class minimal implementation for what is currently needed
export default class BiMap<T, P> {
  keyToValue: Map<T, P>;
  valueToKey: Map<P, T>;

  constructor(keyToValue: Map<T, P> | undefined = undefined) {
    if (keyToValue === undefined) {
      this.keyToValue = new Map();
      this.valueToKey = new Map();
    } else {
      this.keyToValue = keyToValue;
      this.valueToKey = this._reverseMap(keyToValue);
    }
  }

  _reverseMap(map: Map<T, P>) {
    const reversedMap: Map<P, T> = new Map();

    for (const key of map.keys()) {
      const value = map.get(key);

      if (value !== undefined) {
        reversedMap.set(value, key);
      }
    }

    return reversedMap;
  }

  set(key: T, value: P) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  get(key: T): P | undefined {
    return this.keyToValue.get(key);
  }

  getKey(value: P): T | undefined {
    return this.valueToKey.get(value);
  }

  values(): MapIterator<P> {
    return this.keyToValue.values();
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
}
