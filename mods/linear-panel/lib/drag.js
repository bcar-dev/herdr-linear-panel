// One drag of an issue to another group. A drag lives from a press on a row to the next release; the panel feeds it
// the pointer's events

const DRAG_THRESHOLD_PX = 5;

export class Drag {
  /** @type {string | null} */
  pressed = null;
  // The group the drag would move to, or null over the pressed issue's own group
  /** @type {string | null} */
  over = null;
  // The pointer's place in the panel once the issue is carried, or null
  /** @type {Point | null} */
  ghost = null;
  // Where the press was, in the window
  /** @type {Point | null} */
  #from = null;
  #armed = false;

  get carrying() { return this.ghost !== null; }

  /**
   * @param {string} id
   * @param {Point} at
   */
  press(id, at) {
    // A drag whose release was never seen must not leave its target or its carried issue on this one
    this.cancel();
    this.pressed = id;
    this.#from = at;
    this.#armed = true;
  }

  // A press that reached the panel. One that did not start on a row ends a drag left hanging: a drag released outside
  // the panel never saw its release, and would otherwise move its issue on a later, unrelated release
  settle() {
    if (!this.#armed) this.cancel();
    this.#armed = false;
  }

  cancel() {
    const was = this.pressed !== null;
    this.pressed = this.over = this.ghost = null;
    return was;
  }

  // Answers whether the target changed
  /**
   * @param {string} group
   * @param {boolean} isOwnGroup whether the group is the pressed issue's
   */
  aim(group, isOwnGroup) {
    const over = isOwnGroup ? null : group;
    if (this.pressed === null || over === this.over) return false;
    this.over = over;
    return true;
  }

  // Answers whether the carried issue moved
  /**
   * @param {Point} windowPoint
   * @param {Point} panelPoint
   */
  follow(windowPoint, panelPoint) {
    if (this.pressed === null) return false;
    const from = this.#from;
    if (this.ghost === null && from
      && Math.hypot(windowPoint.x - from.x, windowPoint.y - from.y) < DRAG_THRESHOLD_PX) return false;
    this.ghost = panelPoint;
    return true;
  }

  /** @param {string} id */
  clicked(id) { return this.pressed === id && this.ghost === null; }

  drop() {
    const pressed = this.pressed;
    this.cancel();
    return pressed;
  }
}
