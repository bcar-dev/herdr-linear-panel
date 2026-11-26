// The label picker of an issue, a popup: a search field, the labels the issue's team offers (a tick on those it
// wears), and for each group a page of its labels opened beside it. Each label ticked or unticked is asked of the
// panel at once and the picker stays open, so several can be changed in one visit
import { div, svg } from "gpui-kit";
import { v_flex, InputState } from "gpui-base";
import { MENU_ROW_HEIGHT_PX, MENU_RULE_HEIGHT_PX, shipped } from "../config.js";
import { ask, dismiss, wear, wornLabels } from "../channel.js";
import { RequestKind } from "../enums.js";
import { openLabels } from "../popups.js";
import { chevron, labelMark, pillRow, takeKeyboard } from "../ui.js";
import { blocks, childrenOf, groupOf, matching, wornRows } from "../lib/labels.js";
import { FRAME_PADDING_PX, caption, frame, item, rule, searchRow } from "./menu.js";
import { SubmenuHost } from "./submenu-host.js";

const GROUP_MAX_ROWS = 10;
const LEAST_ROWS = 4;
const NO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };
const ROOT_CHROME_PX = 52;
const ROOT_EXTRA_PX = 60;
const ROOT_MAX_ROWS = 12;
const SEARCH_CHROME_PX = 55;

// What a page shows: the labels of a group, or those that are in none
/**
 * @param {AnyLabel[]} labels
 * @param {string | undefined} group
 */
export const shownLabels = (labels, group) =>
  (group ? labels.filter((label) => label.parent?.id === group) : labels.filter((label) => !label.parent));

// What the page has besides its list: the frame, and for a group opened from the issue's labels a search line
/** @param {{ group?: string, searchable: boolean }} props */
export const chromeFor = ({ group, searchable }) =>
  (group ? (searchable ? SEARCH_CHROME_PX : FRAME_PADDING_PX) : ROOT_CHROME_PX);

// The list shows its rows, or as many as `room` lets it, but never fewer than a few
/**
 * @param {{ issue: Issue, labels: AnyLabel[], frequent: string[], group?: string }} props
 * @param {number} room the height left for the list
 */
export function listHeightFor({ issue, labels, frequent, group }, room) {
  const rows = shownLabels(labels, group).length + (group || !frequent.length ? 0 : frequent.length + 1);
  const entries = group ? 0 : wornRows(labels, issue.labels.nodes.map((label) => label.id)).length;
  const worn = entries ? entries * MENU_ROW_HEIGHT_PX + MENU_RULE_HEIGHT_PX : 0;
  const wanted = Math.min(rows, group ? GROUP_MAX_ROWS : ROOT_MAX_ROWS) * MENU_ROW_HEIGHT_PX
    + (group ? 0 : ROOT_EXTRA_PX) + worn;
  return Math.max(LEAST_ROWS * MENU_ROW_HEIGHT_PX, Math.min(wanted, Math.floor(room)));
}

export class LabelPicker {
  /**
   * @param {Opened<LabelsProps>} props
   * @param {Context} cx
   */
  constructor(props, cx) {
    this.props = props;
    this.handle = cx.focus_handle();
    this.query = "";
    // The page of a group shows beside the picker
    this.pages = new SubmenuHost();
    const groupName = props.labels.find((label) => label.id === props.group)?.name;
    this.input = InputState.new({ placeholder: props.group ? `${groupName ?? "Label"}…`
      : props.issue.labels.nodes.length ? "Change or add labels…" : "Add labels…" });
    this.input.on("change", (_event, cx) => { this.query = this.input.value(); cx.notify(); });
    this.input.on("submit", () => {
      if (!this.query.trim()) return;
      const [first] = matching(this.scope(), this.query);
      if (first) this.toggle(first);
    });
    // The picker itself starts from what the issue wears; its pages go on from what the picker made it
    if (!props.group || props.searchable) wear(props.issue.id, props.issue.labels.nodes.map((label) => label.id));
    takeKeyboard(props.group && !props.searchable ? this.handle : this.input, cx);
  }

  worn() {
    return wornLabels(this.props.issue.id) ?? this.props.issue.labels.nodes.map((label) => label.id);
  }

  // The labels a search is made among: those of the group the page is of, else all
  scope() {
    const { labels, group } = this.props;
    return group ? childrenOf(labels, group) : labels;
  }

  // A label is worn or taken off. The labels of a group are exclusive: wearing one takes off the group's other label.
  // From a label of the issue (`searchable`), the choice also closes the page
  /** @param {AnyLabel} label */
  toggle(label) {
    const { issue, labels, searchable, overlay } = this.props, worn = this.worn(), has = worn.includes(label.id);
    const siblings = label.parent ? labels.filter((other) => other.parent?.id === label.parent?.id)
      .map((other) => other.id) : [];
    const removed = has ? [label.id] : worn.filter((id) => siblings.includes(id)), added = has ? [] : [label.id];
    wear(issue.id, [...worn.filter((id) => !removed.includes(id)), ...added]);
    ask({ ids: [issue.id], kind: RequestKind.UPDATE, input: {
      ...(added.length ? { addedLabelIds: added } : {}), ...(removed.length ? { removedLabelIds: removed } : {}) } });
    if (searchable) dismiss(overlay);
  }

  // On a label it only closes the page that was showing
  /**
   * @param {string | null} group
   * @param {Bounds} bounds
   * @param {Context} cx
   */
  rest(group, bounds, cx) {
    const { issue, labels, frequent, frame, overlay } = this.props;
    const opens = group ? (/** @type {Bounds | undefined} */ beside) =>
      openLabels(issue, labels, frequent, { beside, frame }, { group, parent: overlay }) : null;
    this.pages.rest(group, bounds, opens, cx);
  }

  /**
   * @param {Theme} t
   * @param {AnyLabel} label
   * @param {AnyLabel[]} all
   * @param {boolean} noted
   */
  row(t, label, all, noted) {
    const dot = labelMark(label);
    const ticked = this.worn()
        .includes(label.id), note = noted ? groupOf(label, all) : "";
    if (label.isGroup) {
      return pillRow(t, `label-${label.id}`, MENU_ROW_HEIGHT_PX)
        .bg(this.pages.page?.of === label.id ? t.selected : t.popover)
        .on_mouse_move((event, cx) => this.rest(label.id, /** @type {Bounds} */ (event.bounds), cx))
        .child(dot)
        .child(div()
          .flex_1()
          .min_w(0)
          .truncate()
          .child(label.name))
        .child(chevron(t));
    }
    return item(t, label.id,
      [dot, div()
        .min_w(0)
        .truncate()
        .child(label.name), div()
        .flex_none()
        .text_color(t.dim)
        .text_size(11.5)
        .child(note)], () => this.toggle(label), ticked)
      .on_mouse_move((_event, cx) => this.rest(null, NO_BOUNDS, cx));
  }

  // The box takes the label off; the rest of a group's row opens its page
  /**
   * @param {Theme} t
   * @param {{ label: AnyLabel, child?: AnyLabel }} entry
   */
  wornRow(t, { label, child }) {
    const box = div()
      .id(`untick-${label.id}`)
      .size(16)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(4)
      .bg(t.accent)
      .cursor_pointer()
      .on_click((_event, cx) => { cx.stop_propagation(); this.toggle(child ?? label); })
      .child(svg(shipped("check"))
        .size(10)
        .text_color(t.accent_foreground));
    const row = pillRow(t, `worn-${label.id}`, MENU_ROW_HEIGHT_PX)
      .child(box)
      .child(labelMark(label))
      .child(div()
        .min_w(0)
        .truncate()
        .child(label.name));
    if (!child) return row.on_click(() => this.toggle(label))
      .on_mouse_move((_event, cx) =>
        this.rest(null, NO_BOUNDS, cx));
    return row.on_mouse_move((event, cx) => this.rest(label.id, /** @type {Bounds} */ (event.bounds), cx))
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_color(t.dim)
        .child(child.name))
      .child(chevron(t));
  }

  /** @param {Theme} t */
  render(t) {
    const { labels, group, searchable } = this.props;
    const list = v_flex()
      .id("label-list")
      .h(this.props.list)
      .flex_none()
      .overflow_y_scrollbar();
    if (group) {
      const found = this.query.trim() ? matching(this.scope(), this.query) : this.scope();
      const rows = found.map((label) => this.row(t, label, labels, false));
      if (!searchable) return frame(t, "label-group", this.handle)
        .child(list.children(rows));
      return frame(t, "label-group", this.handle)
        .child(searchRow(t, this.input))
        .child(rule(t))
        .child(list.children(rows));
    }
    const found = this.query.trim() ? matching(labels, this.query) : null;
    const worn = wornRows(labels, this.worn());
    return frame(t, "label-picker", this.handle)
      .child(searchRow(t, this.input, ["L"]))
      .child(rule(t))
      .child(found ? list.children(found.map((label) => this.row(t, label, labels, true)))
      : list.children([
        ...(worn.length ? [...worn.map((entry) => this.wornRow(t, entry)), rule(t)] : []),
        ...blocks(labels, this.props.frequent)
          .flatMap(({ title, labels: shown }, nth) => [
            ...(nth ? [rule(t)] : []),
            caption(t, title),
            ...shown.map((label) => this.row(t, label, labels, title === "Frequently used")),
          ])]));
  }
}
