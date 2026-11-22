// Picking a team opens the tracker's own composer: the issue is written there.
import { div } from "gpui-kit";
import { ask, dismiss } from "../channel.js";
import { takeKeyboard } from "../ui.js";
import { caption, frame, item } from "./menu.js";

export class TeamPicker {
  /**
   * @param {Opened<TeamPickerProps>} props
   * @param {Context} cx
   */
  constructor({ teams, overlay }, cx) {
    this.teams = teams;
    this.overlay = overlay;
    this.handle = cx.focus_handle();
    takeKeyboard(this.handle, cx);
  }

  /** @param {Theme} t */
  render(t) {
    /** @param {MyTeam} team */
    const label = (team) =>
      [div().w(52).flex_none().text_size(11).text_color(t.dim).child(team.key), div().truncate().child(team.name)];
    return frame(t, "team-picker", this.handle)
      .child(caption(t, "New issue in…"))
      .children(this.teams.map((team) =>
        item(t, team.key, label(team), () => { ask({ kind: "compose", ids: [], team }); dismiss(this.overlay); })));
  }
}
