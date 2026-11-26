// The page a menu opens beside itself when the pointer rests on one of its entries, and closes when it moves to another
import { closeOverlay } from "herdr";
import { popups } from "../channel.js";

const PAGE_DELAY_MS = 140;

export class SubmenuHost {
  /** The entry the page showing belongs to, and its overlay @type {{ of: string, overlay: string } | null} */
  page = null;
  /** @type {string | null | undefined} */
  #rested;
  /** @type {Bounds | undefined} */
  #bounds;

  // An entry that opens no page (`opens` null) only closes the one showing. `opens(bounds)` opens the page and answers
  // its overlay
  /**
   * @param {string | null} id
   * @param {Bounds} bounds
   * @param {((bounds?: Bounds) => string) | null} opens
   * @param {Context} cx
   */
  rest(id, bounds, opens, cx) {
    this.#bounds = bounds;
    if (this.#rested === id) return;
    this.#rested = id;
    cx.timer.after(PAGE_DELAY_MS, (cx) => { if (this.#rested === id) this.turnTo(id, opens, cx); });
  }

  /**
   * @param {string | null} id
   * @param {((bounds?: Bounds) => string) | null} opens
   * @param {Context} cx
   */
  turnTo(id, opens, cx) {
    // Herdr may have closed the page by itself (Escape closes the popup on top): then it is opened again
    if (this.page?.of === id && popups()
      .includes(this.page.overlay)) return;
    this.close();
    this.page = id !== null && opens ? { of: id, overlay: opens(this.#bounds) } : null;
    cx.notify();
  }

  close() {
    if (this.page) closeOverlay(this.page.overlay);
    this.page = null;
  }
}
