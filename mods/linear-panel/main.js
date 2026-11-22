// A side panel listing my issues from an issue tracker, with its top-bar button and its popups.
//
// Herdr runs one copy of this mod per place it shows, and tells the copies apart by their props:
//   none                       the panel
//   { part: "button" }         the panel's button, for the top bar
//   { part: <a popup>, ... }   one of the popups, opened by popups.js with the props its part needs
// This file only picks the part. Each part is a class with render(t, cx), built from (props, cx).
import { View } from "gpui-kit";
import { props, theme } from "herdr";
import { closed, giveBack, opened, unlight } from "./channel.js";
import { PanelButton } from "./parts/button.js";
import { Commands } from "./parts/commands.js";
import { DisplayOptions } from "./parts/display-options.js";
import { CopyMenu, IssueMenu } from "./parts/issue-menu.js";
import { Panel } from "./parts/panel.js";
import { StartPrompt } from "./parts/start-prompt.js";
import { TeamPicker } from "./parts/team-picker.js";

const PARTS = {
  button: PanelButton,
  "issue-menu": IssueMenu,
  "copy-menu": CopyMenu,
  start: StartPrompt,
  display: DisplayOptions,
  teams: TeamPicker,
  commands: Commands,
};

export default class IssuesPanel extends View {
  // Assigned by `init`, which Herdr runs once on a new view, before it closes or draws it.
  /** @type {Part} */ part;

  /**
   * @param {unknown} _props
   * @param {Context} cx
   */
  init(_props, cx) {
    const given = /** @type {PartProps} */ (props() ?? {});
    if (given.overlay) opened(given.overlay);
    this.part = new /** @type {PartClass} */ ((given.part && PARTS[given.part]) || Panel)(given, cx);
  }

  // Herdr calls this when a copy goes. A popup going away unlights the row it was open on and gives the keyboard
  // back to the panel, however it was closed: by a choice, or by Herdr on Escape. Two cases keep the keyboard away
  // from the panel: a press outside the popup closed it, and that press says where the keyboard goes; or the popup
  // only made way for another one (`replaced`).
  close() {
    const overlay = /** @type {PartProps} */ (props())?.overlay;
    if (!overlay) return;
    unlight(overlay);
    closed(overlay);
    if (!this.pressedBeside && !this.part.replaced) giveBack();
  }

  /** @param {Context} cx */
  render(cx) {
    const drawn = this.part.render(/** @type {Theme} */ (theme()), cx);
    if (!props()?.overlay) return drawn;
    return drawn.on_mouse_down_out(() => { this.pressedBeside = true; });
  }
}
