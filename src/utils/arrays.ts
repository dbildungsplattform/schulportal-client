/**
 * Deduplicate array
 * @param a array to deduplicate
 * @param toKey optional function to create the key that determines uniqueness
 * @returns a with all duplciate values (according to toKey) removed
 */
export function dedup<K, V>(arr: Array<V>, toKey?: (a: V) => K): Array<V> {
  if (!toKey) {
    return [...new Set(arr)];
  }
  const result: Array<V> = [];
  const keySet: Set<K> = new Set();
  arr.forEach((value: V) => {
    const key: K = toKey(value);
    if (keySet.has(key)) {
      return;
    }
    keySet.add(key);
    result.push(value);
  });
  return result;
}

/**
 * Compare values of two arrays. Ignores duplicate values,
 * @param a first array to check
 * @param b second array to check
 * @param toKey optional function to derive key for comparison
 * @returns whether all values in a are also in b and vice-versa
 */
export function sameContent<T, K>(a: Array<T>, b: Array<T>, toKey?: (arg0: T) => K): boolean {
  if (toKey) {
    const aSet: Set<K> = new Set(a.map(toKey));
    const bSet: Set<K> = new Set(b.map(toKey));
    return a.every((v: T) => bSet.has(toKey(v))) && b.every((v: T) => aSet.has(toKey(v)));
  } else {
    const aSet: Set<T> = new Set(a);
    const bSet: Set<T> = new Set(b);
    return a.every((v: T) => bSet.has(v)) && b.every((v: T) => aSet.has(v));
  }
}

/**
 * Returns an array with all values of a that are also in b.
 * @param a
 * @param b
 * @returns
 */
export function intersect<V>(a: Array<V>, b: Array<V>): Array<V> {
  const bSet: Set<V> = new Set(b);
  return dedup(a.filter((v: V) => bSet.has(v)));
}
