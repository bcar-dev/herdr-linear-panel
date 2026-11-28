// Picking a team opens the tracker's own composer, where the issue is written; or, from an issue's page, moves that
// issue to the team: a search field, my teams, a tick on the issue's own
import { div } from "gpui-kit";
import { InputState } from "gpui-base";
import { } from "../config.js";
import { ask, dismiss, submit } from "../channel.js";
import { RequestKind } from "../enums.js";
import { chordCaps, takeKeyboard, teamMark } from "../ui.js";
import { caption, frame, item, rule, searchRow } from "./menu.js";
import { Height, Text } from "../style.js";
import { PAGE_KEYS } from "../lib/keys.js";

const CHROME_PX = 38;
const ISSUE_CHROME_PX = 52;
const TEAM_KEY_COLUMN_WIDTH_PX = 52;
const TEAM_MARK_SIZE_PX = 18;

// A row a team, and the caption or search line above them
/** @param {{ teams: MyTeam[], issue?: Issue }} props */
export const heightFor = ({ teams, issue }) =>
  teams.length * Height.MENU_ROW + (issue ? ISSUE_CHROME_PX : CHROME_PX);

export class TeamPicker {
  /**
   * @param {Opened<TeamPickerProps>} props
   * @param {Context} context
   */
  constructor(props, context) {
    this.props = props;
    this.handle = context.focus_handle();
    this.query = "";
    this.input = InputState.new({ placeholder: "Move to team…" });
    this.input.on("change", (_event, context) => { this.query = this.input.value(); context.notify(); });
    takeKeyboard(props.issue ? this.input : this.handle, context);
  }

  /** @param {MyTeam} team */
  choose(team) {
    const { issue, overlay } = this.props;
    if (!issue) { ask({ kind: RequestKind.COMPOSE, ids: [], team }); dismiss(overlay); return; }
    if (team.id === issue.team.id) { dismiss(overlay); return; }
    submit(this.props, [issue], { kind: RequestKind.UPDATE, input: { teamId: team.id } });
  }

  /** @param {Theme} theme */
  render(theme) {
    const { issue, teams } = this.props, words = this.query.trim()
      .toLowerCase();
    const shown = teams.filter((team) => `${team.name} ${team.key}`.toLowerCase()
      .includes(words));
    /** @param {MyTeam} team */
    const label = (team) => [
      ...(issue ? [teamMark(team, TEAM_MARK_SIZE_PX)] : []),
      ...(issue ? [div()
        .truncate()
        .child(team.name), div()
        .flex_none()
        .text_size(Text.CAPTION)
        .text_color(theme.dim)
        .child(team.key)]
      : [div()
        .w(TEAM_KEY_COLUMN_WIDTH_PX)
        .flex_none()
        .text_size(Text.CAPTION)
        .text_color(theme.dim)
        .child(team.key),
      div()
        .truncate()
        .child(team.name)]),
    ];
    return frame(theme, "team-picker", this.handle)
      .children(issue ? [searchRow(theme, this.input, chordCaps(PAGE_KEYS.TEAM.caps)), rule(theme)]
      : [caption(theme, "New issue in…")])
      .children(shown.map((team) =>
        item(theme, team.key, label(team), () => this.choose(team), issue ? team.id === issue.team.id : false)));
  }
}
