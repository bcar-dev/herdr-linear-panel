// One drag of an issue to another group. Pure state with no calls to Herdr, so node can test it (tests/unit).
//
// A drag lives from a press on a row to the next release. The panel feeds it the pointer's events and asks it what
// to draw: nothing for a plain click, the carried issue and the target group once the pointer has moved.

// How far the pointer must travel from the press before the issue is carried, in pixels.
const SLACK = 5;

export class Drag {
  /** @type {string | null} */
  pressed = null;
  // The group the drag would move to, or null over the pressed issue's own group.
  /** @type {string | null} */
  over = null;
  // The pointer's place in the panel once the issue is carried, or null.
  /** @type {Point | null} */
  ghost = null;
  // Where the press was, in the window. Read only while an issue is pressed: this first value never is.
  /** @type {Point} */
  #from = { x: 0, y: 0 };
  #armed = false;

  get carrying() { return this.ghost !== null; }

  /**
   * @param {string} id
   * @param {Point} at
   */
  press(id, at) {
    // A drag whose release was never seen must not leave its target or its carried issue on this one.
    this.cancel();
    this.pressed = id;
    this.#from = at;
    this.#armed = true;
  }

  // A press that reached the panel. One that did not start on a row ends a drag left hanging: a drag released outside
  // the panel never saw its release, and would otherwise move its issue on a later, unrelated release.
  settle() {
    if (!this.#armed) this.cancel();
    this.#armed = false;
  }

  // Answers whether there was a drag.
  cancel() {
    const was = this.pressed !== null;
    this.pressed = this.over = this.ghost = null;
    return was;
  }

  // The pointer is over a group; `own` says whether it is the pressed issue's. Answers whether the target changed.
  /**
   * @param {string} group
   * @param {boolean} own
   */
  aim(group, own) {
    const over = own ? null : group;
    if (this.pressed === null || over === this.over) return false;
    this.over = over;
    return true;
  }

  // The pointer moved: `at` in the window, `local` in the panel. Answers whether the carried issue moved.
  /**
   * @param {Point} at
   * @param {Point} local
   */
  follow(at, local) {
    if (this.pressed === null) return false;
    if (this.ghost === null && Math.hypot(at.x - this.#from.x, at.y - this.#from.y) < SLACK) return false;
    this.ghost = local;
    return true;
  }

  // Whether a release on that issue ends a plain click: pressed there and never carried.
  /** @param {string} id */
  clicked(id) { return this.pressed === id && this.ghost === null; }

  // A release on a group: ends the drag and answers the id of the issue that was pressed, or null.
  drop() {
    const pressed = this.pressed;
    this.cancel();
    return pressed;
  }
}
