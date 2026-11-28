// When the panel loads its issues, and when its spinner shows. One load runs at a time: a load asked meanwhile runs
// once that one ends. The spinner stays for at least MIN_SPIN_MS, and while a load or a change is under way. The
// panel says what a load does; this file draws nothing
import { NoKey } from "../api.js";
import { MIN_SPIN_MS } from "../config.js";
import { message } from "../lib/text.js";

export class Loader {
  again = false;
  /** @type {string | null} what the last load that failed said */
  error = null;
  loadedAt = 0;
  loading = false;
  needsKey = false;
  spinning = false;
  spunAt = 0;
  // The changes under way: the spinner stays while there is one
  working = 0;

  /** @param {(cx: Context) => Promise<unknown>} load one load, which answers once it is done */
  constructor(load) {
    this.load = load;
  }

  spin() {
    if (this.spinning) return;
    this.spinning = true;
    this.spunAt = Date.now();
  }

  // Stops the spinner once it has shown long enough, unless a load or a change is still under way: a quiet reload
  // that ends must not hide the spinner of a change that has not
  /** @param {Context} cx */
  unspin(cx) {
    const idle = () => !this.loading && !this.working;
    if (!idle()) return;
    const rest = this.spunAt + MIN_SPIN_MS - Date.now();
    if (rest > 0) cx.timer.after(rest, (cx) => { if (idle()) { this.spinning = false; cx.notify(); } });
    else this.spinning = false;
  }

  // A change under way keeps the spinner, which it shows unless it is `quiet`
  begin(quiet = false) {
    if (!quiet) this.spin();
    this.working++;
  }

  end() {
    this.working--;
  }

  // A click or a key that asks for a reload must cx.notify() to show the spinner
  /** @param {Context} cx */
  reload(cx) {
    this.spin();
    this.#reload(cx);
  }

  // For reloads nobody asked for (the timer, the read back of a change under a page): they show no spinner
  /** @param {Context} cx */
  reloadQuietly(cx) {
    this.#reload(cx);
  }

  /** @param {Context} cx */
  #reload(cx) {
    if (this.loading) { this.again = true; return; }
    this.loading = true;
    this.loadedAt = Date.now();
    cx.spawn(async (cx) => {
      /** @type {unknown} */
      let failure;
      try {
        await this.load(cx);
      } catch (error) {
        failure = error;
      }
      this.#end(failure, cx);
    });
  }

  /**
   * @param {unknown} failure undefined when the load went well
   * @param {Context} cx
   */
  #end(failure, cx) {
    this.needsKey = failure instanceof NoKey;
    this.error = failure === undefined || this.needsKey ? null : message(failure);
    this.loading = false;
    if (this.again) { this.again = false; this.reloadQuietly(cx); }
    else if (this.spinning) this.unspin(cx);
    cx.notify();
  }
}
