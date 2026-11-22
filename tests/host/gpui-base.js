// A stand-in for Herdr's "gpui-base" module: the flex helpers and the text field.
import { element } from "./elements.js";

export const v_flex = () => element("v_flex");
export const h_flex = () => element("h_flex");

// The state of a text field. A test types with `type(text, cx)` and presses Enter with `submit(cx)`.
export const InputState = {
  new({ placeholder } = {}) {
    const listeners = {};
    const state = {
      placeholder,
      text: "",
      focused: 0,
      value: () => state.text,
      focus() { state.focused++; },
      on(event, listener) { listeners[event] = listener; },
      type(text, cx) { state.text = text; listeners.change?.({}, cx); },
      submit(cx) { listeners.submit?.({}, cx); },
    };
    return state;
  },
};

export const Input = { new: (state) => element("Input", state) };
