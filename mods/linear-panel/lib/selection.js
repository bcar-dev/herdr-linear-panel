// The ticked issues. Pure state with no calls to Herdr, so node can test it (tests/unit).

// The ids from one to another in the order shown, both included, whichever comes first. Only `to` when either is
// not shown.
/**
 * @param {string[]} order
 * @param {string} from
 * @param {string} to
 */
export function span(order, from, to) {
  const a = order.indexOf(from), b = order.indexOf(to);
  return a < 0 || b < 0 ? [to] : order.slice(Math.min(a, b), Math.max(a, b) + 1);
}

export class Selection {
  /** @type {Set<string>} */
  #ids = new Set();
  // The issue whose box was clicked last: where a Shift+click starts from.
  /** @type {string | null} */
  #anchor = null;

  get size() { return this.#ids.size; }
  /** @param {string} id */
  has(id) { return this.#ids.has(id); }
  list() { return [...this.#ids]; }

  // A click on an issue's box: ticks or unticks it. With `extend` (Shift), ticks every issue from the last one clicked
  // to this one in `order`, the ids as the list shows them, whatever their groups. A range needs a tick to start
  // from: while nothing is ticked, the last box clicked is ignored.
  /**
   * @param {string} id
   * @param {boolean} extend
   * @param {string[]} order
   */
  click(id, extend, order) {
    if (extend && this.#anchor &&
      this.#ids.size > 0) for (const other of span(order, this.#anchor, id)) this.#ids.add(other);
    else if (this.#ids.has(id)) this.#ids.delete(id);
    else this.#ids.add(id);
    this.#anchor = id;
  }

  clear() { this.#ids.clear(); }

  /** @param {string[]} ids */
  untick(ids) {
    for (const id of ids) this.#ids.delete(id);
  }

  // Drops the ticks of issues that are no longer loaded.
  /** @param {{ has(id: string): boolean }} loaded */
  keep(loaded) {
    for (const id of this.#ids) if (!loaded.has(id)) this.#ids.delete(id);
  }
}
