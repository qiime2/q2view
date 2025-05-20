// Two way map class
export default class BiMap<T, P> {
  keyToValue: Map<T, P>;
  valueToKey: Map<P, T>;

  // jsonify if true will jsonify objects passed to get and set and rehydrate
  // objects returned from set
  constructor(keyToValue: Map<T, P> | undefined = undefined, jsonify=false) {
    if (keyToValue === undefined) {
      this.keyToValue = new Map();
      this.valueToKey = new Map();
    } else {
      this.keyToValue = keyToValue;
      this.valueToKey = this._reverseMap(keyToValue);
    }

    if (jsonify) {
      this.set = this._setJSON;
      this.get = this._getJSON;
      this.getKey = this._getKeyJSON;
      this.keys
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

  setValue(value: P, key: T) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  get(key: T): P | undefined {
    return this.keyToValue.get(key);
  }

  getKey(value: P): T | undefined {
    return this.valueToKey.get(value);
  }

  keys(): MapIterator<T> {
    return this.keyToValue.keys();
  }

  values(): MapIterator<P> {
    return this.keyToValue.values();
  }

  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }

  _setJSON(key: T, value: P) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  _getJSON(key: T): P | undefined {
    return this.keyToValue.get(key);
  }

  _getKeyJSON(value: P): T | undefined {
    return this.valueToKey.get(value);
  }

  _keysJSON(): MapIterator<T> {
    return this.keyToValue.keys();
  }

  _valuesJSON(): MapIterator<P> {
    return this.keyToValue.values();
  }
}
