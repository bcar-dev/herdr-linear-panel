// Loaded before the tests (node --import): answers the modules Herdr gives a mod with the stand-ins beside this file,
// and gives node the globals a mod finds in Herdr
import { registerHooks } from "node:module";
import { host } from "./herdr.js";

const STAND_INS = { herdr: "./herdr.js", "gpui-kit": "./gpui-kit.js", "gpui-base": "./gpui-base.js" };

registerHooks({
  resolve(specifier, context, next) {
    const file = STAND_INS[specifier];
    return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : next(specifier, context);
  },
});

const storage = {
  getItem: (key) => host.stored[key] ?? null,
  setItem: (key, value) => { host.stored[key] = String(value); },
};
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
globalThis.fetch = (url, options) => host.fetch(url, options);
