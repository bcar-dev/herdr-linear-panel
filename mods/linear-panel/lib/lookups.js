// What the panel asks the tracker for on its own account: each thing once, with the failures forgotten so the next
// need asks again

// The answer of a lookup that was asked and has not come back
export const PENDING = null;

// Keys asked since the run began, for what is asked in one batch (teams, projects, labels)
export class Asked {
  /** @type {Set<string>} */
  #keys = new Set();

  // Runs `fetch` on the keys not asked yet, and answers its promise, or undefined when every key was asked. The keys
  // of a fetch that fails are forgotten, and the failure goes on to the caller
  /**
   * @template T
   * @param {string[]} keys
   * @param {(fresh: string[]) => Promise<T>} fetch
   * @returns {Promise<T> | undefined}
   */
  once(keys, fetch) {
    const fresh = [...new Set(keys)].filter((key) => !this.#keys.has(key));
    if (!fresh.length) return undefined;
    fresh.forEach((key) => this.#keys.add(key));
    return fetch(fresh)
      .catch((error) => {
        fresh.forEach((key) => this.#keys.delete(key));
        throw error;
      });
  }
}

// The answers to lookups by id. An id is asked once, or again once its answer is older than `since`. While asked,
// `get` answers what the last answer was, or PENDING when there was none
/** @template T */
export class Lookups {
  /** @type {Map<string, { value: T | typeof PENDING, at: number }>} */
  #entries = new Map();

  /** @param {string} id */
  get(id) {
    return this.#entries.get(id)?.value;
  }

  /** @param {string} id */
  forget(id) {
    this.#entries.delete(id);
  }

  /** @returns {IterableIterator<[string, T | typeof PENDING]>} */
  *answers() {
    for (const [id, { value }] of this.#entries) yield [id, value];
  }

  // Answers the promise of the fetch, which a failure leaves forgotten, or undefined when the answer is recent enough
  /**
   * @param {string} id
   * @param {() => Promise<T>} fetch
   * @param {number} [since]
   * @returns {Promise<void> | undefined}
   */
  ask(id, fetch, since = 0) {
    const known = this.#entries.get(id);
    if (known && known.at >= since) return undefined;
    const at = Date.now();
    this.#entries.set(id, { value: known?.value ?? PENDING, at });
    return fetch()
      .then((value) => { this.#entries.set(id, { value, at }); }, (error) => {
        this.#entries.delete(id);
        throw error;
      });
  }
}
