// A stand-in for Herdr's "gpui-base" module: the flex helpers and the text field
import { element } from "./elements.js";

export const v_flex = () => element("v_flex");
export const h_flex = () => element("h_flex");

// The state of a text field. A test types with `type(text, cx)` and presses Enter with `submit(cx)`
export const InputState = {
  new({ placeholder } = {}) {
    const listeners = {};
    const state = {
      placeholder,
      text: "",
      focused: 0,
      value: () => state.text,
      // Set `cx` on a state for its focus and blur to be told to the mod, as the host tells them
      cx: null,
      focus() { state.focused++; if (state.cx) listeners.focus?.({}, state.cx); },
      set_value(text) { state.text = text; },
      blur() { if (state.cx) listeners.blur?.({}, state.cx); },
      selected: { start: 0, end: 0 },
      set_selected_range(range) { state.selected = range; },
      release() { return true; },
      on(event, listener) { listeners[event] = listener; },
      type(text, cx) { state.text = text; listeners.change?.({}, cx); },
      submit(cx) { listeners.submit?.({}, cx); },
    };
    return state;
  },
};

export const Input = { new: (state) => element("Input", state) };

// The state of a multi-line field, as a test sees it: the same as a single line's, with the sizes it is told
export const TextareaState = {
  new(options) {
    const state = InputState.new(options);
    return Object.assign(state, { selected_range: () => state.selected, set_auto_grow() {}, set_rows() {} });
  },
};
export const Textarea = { new: (state) => element("Textarea", state) };
export const TextView = { markdown: (id, markdown) => element("TextView", id, markdown) };
