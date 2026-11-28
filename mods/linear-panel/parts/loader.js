// When the panel loads its issues, and when its spinner shows. One load runs at a time: a load asked meanwhile runs
// once that one ends. The spinner stays for at least MIN_SPIN_MS, and while a load or a change is under way. The
// panel says what a load does; this file draws nothing
import { NoKey } from "../api.js";
import { MIN_SPIN_MS } from "../config.js";
import { message } from "../lib/text.js";

export class Loader {
  queued = false;
  /** @type {string | null} */
  loadError = null;
  loadedAt = 0;
  loading = false;
  needsKey = false;
  spinning = false;
  spunAt = 0;
  changesUnderWay = 0;

  /** @param {(context: Context) => Promise<unknown>} load */
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
  /** @param {Context} context */
  unspin(context) {
    const idle = () => !this.loading && !this.changesUnderWay;
    if (!idle()) return;
    const rest = this.spunAt + MIN_SPIN_MS - Date.now();
    if (rest > 0) context.timer.after(rest, (context) => { if (idle()) { this.spinning = false; context.notify(); } });
    else this.spinning = false;
  }

  begin(quiet = false) {
    if (!quiet) this.spin();
    this.changesUnderWay++;
  }

  end() {
    this.changesUnderWay--;
  }

  // A click or a key that asks for a reload must context.notify() to show the spinner
  /** @param {Context} context */
  reload(context) {
    this.spin();
    this.#reload(context);
  }

  // For reloads nobody asked for (the timer, the read back of a change under a page): they show no spinner
  /** @param {Context} context */
  reloadQuietly(context) {
    this.#reload(context);
  }

  /** @param {Context} context */
  #reload(context) {
    if (this.loading) { this.queued = true; return; }
    this.loading = true;
    this.loadedAt = Date.now();
    context.spawn(async (context) => {
      /** @type {unknown} */
      let failure;
      try {
        await this.load(context);
      } catch (error) {
        failure = error;
      }
      this.#end(failure, context);
    });
  }

  /**
   * @param {unknown} failure undefined when the load went well
   * @param {Context} context
   */
  #end(failure, context) {
    this.needsKey = failure instanceof NoKey;
    this.loadError = failure === undefined || this.needsKey ? null : message(failure);
    this.loading = false;
    if (this.queued) { this.queued = false; this.reloadQuietly(context); }
    else if (this.spinning) this.unspin(context);
    context.notify();
  }
}
