// Starts copies of the mod in the fake app, the way Herdr starts them.
import { host } from "./herdr.js";
import Mod from "../../mods/linear-panel/main.js";

// A stand-in for the `cx` Herdr hands every callback. A test waits for its tasks with `idle()` and runs its timers,
// which do not run by themselves, with `elapse()` and `tick()`.
export function context() {
  const cx = {
    notified: 0,
    stopped: false,
    clipboard: null,
    timers: [],
    notify() { cx.notified++; },
    stop_propagation() { cx.stopped = true; },
    write_to_clipboard(text) { cx.clipboard = text; },
    bind_keys(bindings) { host.bound.push(...bindings); return bindings.length; },
    focus_handle() {
      const handle = { focused: 0, focus() { handle.focused++; } };
      return handle;
    },
    running: 0,
    spawn(task) {
      cx.running++;
      Promise.resolve(task(cx)).finally(() => { cx.running--; });
    },
    timer: {
      after(ms, run) { cx.timers.push({ ms, run }); },
      every(ms, run) { cx.timers.push({ ms, run, repeats: true }); },
    },
    // Waits until the spawned tasks have ended. Everything the fake app answers settles within one turn of the event
    // loop, so the wait ends once two turns leave the number of running tasks as it was.
    async idle() {
      const turn = () => new Promise((resolve) => setImmediate(resolve));
      for (let before = -1; before !== cx.running;) {
        before = cx.running;
        await turn();
        await turn();
      }
    },
    // Set once Herdr has closed the copy: its timers stop, as Herdr stops them.
    closed: false,
    // Runs the one-shot timers that are waiting.
    elapse() {
      const due = cx.timers.filter((timer) => !timer.repeats);
      cx.timers = cx.timers.filter((timer) => timer.repeats);
      if (!cx.closed) for (const timer of due) timer.run(cx);
    },
    // Runs the repeating timers once.
    tick() {
      if (!cx.closed) for (const timer of cx.timers.filter((timer) => timer.repeats)) timer.run(cx);
    },
  };
  return cx;
}

// One copy of the mod with those props: { view, cx, draw() }. `draw()` renders it and answers the root element.
// `view` is there for `view.close()`, which Herdr calls when the copy goes: a test reads a copy through its drawing.
// Herdr answers `props()` with the props of the copy that is running: every way into this copy sets them first,
// and the root element remembers its copy, so that an event sent to it does the same (elements.js).
export function mount(props) {
  const cx = context(), view = new Mod(), close = view.close.bind(view);
  const mine = (run) => (...args) => { host.props = props; return run(...args); };
  view.close = mine(() => { cx.closed = true; return close(); });
  mine(() => view.init(props, cx))();
  const draw = mine(() => {
    const root = view.render(cx);
    Object.assign(root.$, { copy: props ?? null });
    return root;
  });
  return { view, cx, draw };
}

// The copy Herdr starts for an overlay the mod opened: the nth one (the latest by default), with its id in its props.
export function mountOverlay(nth = host.overlays.length - 1) {
  const overlay = host.overlays[nth];
  return { overlay, ...mount({ ...overlay.props, overlay: overlay.id }) };
}
