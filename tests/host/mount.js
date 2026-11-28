// Starts copies of the mod in the fake app, the way Herdr starts them
import { host } from "./herdr.js";
import Mod from "../../mods/linear-panel/main.js";

// A stand-in for the context Herdr hands every callback. A test waits for its tasks with `idle()` and runs its
// timers, which do not run by themselves, with `elapse()` and `tick()`
export function fakeContext() {
  const context = {
    notified: 0,
    stopped: false,
    clipboard: null,
    timers: [],
    notify() { context.notified++; },
    stop_propagation() { context.stopped = true; },
    write_to_clipboard(text) { context.clipboard = text; },
    bind_keys(bindings) { host.bound.push(...bindings); return bindings.length; },
    focus_handle() {
      const handle = { focused: 0, focus() { handle.focused++; } };
      return handle;
    },
    running: 0,
    spawn(task) {
      context.running++;
      Promise.resolve(task(context))
        .finally(() => { context.running--; });
    },
    timer: {
      after(ms, run) { context.timers.push({ ms, run }); },
      every(ms, run) { context.timers.push({ ms, run, repeats: true }); },
    },
    // Waits until the spawned tasks have ended. Everything the fake app answers settles within one turn of the event
    // loop, so the wait ends once two turns leave the number of running tasks as it was
    async idle() {
      const turn = () => new Promise((resolve) => setImmediate(resolve));
      for (let before = -1; before !== context.running;) {
        before = context.running;
        await turn();
        await turn();
      }
    },
    // Set once Herdr has closed the copy: its timers stop, as Herdr stops them
    closed: false,
    // Runs the one-shot timers that are waiting, or only those due within `ms`
    elapse(ms = Infinity) {
      const due = context.timers.filter((timer) => !timer.repeats && timer.ms <= ms);
      context.timers = context.timers.filter((timer) => !due.includes(timer));
      if (!context.closed) for (const timer of due) timer.run(context);
    },
    // Runs the repeating timers once
    tick() {
      if (!context.closed) for (const timer of context.timers.filter((timer) => timer.repeats)) timer.run(context);
    },
  };
  return context;
}

// One copy of the mod with those props: { view, context, draw() }. `draw()` renders it and answers the root element.
// `view` is there for `view.close()`, which Herdr calls when the copy goes: a test reads a copy through its drawing.
// Herdr answers `props()` with the props of the copy that is running: every way into this copy sets them first,
// and the root element remembers its copy, so that an event sent to it does the same (elements.js)
export function mount(props) {
  const context = fakeContext(), view = new Mod(), close = view.close.bind(view);
  const mine = (run) => (...args) => { host.props = props; return run(...args); };
  view.close = mine(() => { context.closed = true; return close(); });
  mine(() => view.init(props, context))();
  const draw = mine(() => {
    const root = view.render(context);
    Object.assign(root.$, { copy: props ?? null });
    return root;
  });
  return { view, context, draw };
}

// The copy Herdr starts for an overlay the mod opened: the nth one (the latest by default), with its id in its props
export function mountOverlay(nth = host.overlays.length - 1) {
  const overlay = host.overlays[nth];
  return { overlay, ...mount({ ...overlay.props, overlay: overlay.id }) };
}
