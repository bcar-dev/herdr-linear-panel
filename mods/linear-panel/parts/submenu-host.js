// The page a menu opens beside itself when the pointer rests on one of its entries, and closes when it moves to another
import { closeOverlay } from "herdr";
import { popups } from "../channel.js";
import { zoom } from "../ui.js";

const PAGE_DELAY_MS = 140;

export class SubmenuHost {
  /** The entry the page showing belongs to, and its overlay @type {{ of: string, overlay: string } | null} */
  page = null;
  /** @type {string | null | undefined} */
  #rested;
  /** @type {Bounds | undefined} */
  #bounds;
  /** @type {Bounds | undefined} */
  menuBounds;
  #measuredAtZoom = zoom();
  #placedAtZoom = zoom();
  /** @type {((bounds?: Bounds) => string) | null} */
  #openPage = null;
  #restedOpensPage = false;

  /** @param {{ bounds: Bounds }} event */
  noteMenuBounds = (event) => { this.menuBounds = event.bounds; this.#measuredAtZoom = zoom(); };

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
    this.#measuredAtZoom = zoom();
    if (this.#rested === id) return;
    this.#rested = id;
    this.#restedOpensPage = opens !== null;
    cx.notify();
    cx.timer.after(PAGE_DELAY_MS, (cx) => { if (this.#rested === id) this.turnTo(id, opens, cx); });
  }

  // An entry that opens a page stays lit: the pointer leaving the menu is on its way to that page
  /** @param {Context} cx */
  leave(cx) {
    if (this.page || this.#rested === undefined || this.#restedOpensPage) return;
    this.#rested = undefined;
    cx.notify();
  }

  get lit() {
    return this.#rested === undefined ? this.page?.of ?? null : this.#rested;
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
    this.#openPage = opens;
    this.#placedAtZoom = zoom();
    this.page = id !== null && opens ? { of: id, overlay: opens(this.#entryAcrossMenu()) } : null;
    cx.notify();
  }

  // On a zoom change, Herdr keeps a popup where it opened and scales it from its top left corner: the page drifts from
  // the menu, so it opens again against it. A moment later, as no popup opens while one is laid out
  /** @param {Context} cx */
  followZoom(cx) {
    if (this.page && zoom() !== this.#placedAtZoom) cx.timer.after(0, (cx) => this.#reopenAgainstMenu(cx));
  }

  /** @param {Context} cx */
  #reopenAgainstMenu(cx) {
    const now = zoom(), ratio = now / this.#measuredAtZoom, { menuBounds: menu, page } = this;
    if (!page || now === this.#placedAtZoom) return;
    if (menu && ratio !== 1) {
      /** @param {Bounds} inside */
      const scaled = (inside) => ({ x: menu.x + (inside.x - menu.x) * ratio, y: menu.y + (inside.y - menu.y) * ratio,
        width: inside.width * ratio, height: inside.height * ratio });
      if (this.#bounds) this.#bounds = scaled(this.#bounds);
      this.menuBounds = scaled(menu);
      this.#measuredAtZoom = now;
    }
    this.close();
    this.turnTo(page.of, this.#openPage, cx);
  }

  #entryAcrossMenu() {
    const entry = this.#bounds, menu = this.menuBounds;
    return entry && menu ? { ...entry, x: menu.x, width: menu.width } : entry;
  }

  close() {
    if (this.page) closeOverlay(this.page.overlay);
    this.page = null;
  }
}
