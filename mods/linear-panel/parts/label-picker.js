// The label picker of an issue, a popup: a search field, the labels the issue's team offers (a tick on those it
// wears), and for each group a page of its labels opened beside it. Each label ticked or unticked is asked of the
// panel at once and the picker stays open, so several can be changed in one visit
import { div, svg } from "gpui-kit";
import { v_flex, InputState } from "gpui-base";
import { shipped } from "../config.js";
import { ask, dismiss, wear, wornLabels } from "../channel.js";
import { RequestKind } from "../enums.js";
import { openLabels } from "../popups.js";
import { chevron, labelMark, pillRow, takeKeyboard } from "../ui.js";
import { blocks, childrenOf, groupOf, matching, placeholderFor, wornRows } from "../lib/labels.js";
import { caption, frame, item, rule, searchRow } from "./menu.js";
import { SubmenuHost } from "./submenu-host.js";
import { Height, Radius, Text } from "../style.js";

const NO_BOUNDS = { x: 0, y: 0, width: 0, height: 0 };

export class LabelPicker {
  /**
   * @param {Opened<LabelsProps>} props
   * @param {Context} context
   */
  constructor(props, context) {
    this.props = props;
    this.handle = context.focus_handle();
    this.query = "";
    // The page of a group shows beside the picker
    this.pages = new SubmenuHost();
    this.input = InputState.new({ placeholder: placeholderFor(props.issue, props.labels, props.group) });
    this.input.on("change", (_event, context) => { this.query = this.input.value(); context.notify(); });
    this.input.on("submit", () => {
      if (!this.query.trim()) return;
      const [first] = matching(this.scope(), this.query);
      if (first) this.toggle(first);
    });
    // The picker itself starts from what the issue wears; its pages go on from what the picker made it
    if (!props.group || props.searchable) wear(props.issue.id, props.issue.labels.nodes.map((label) => label.id));
    takeKeyboard(props.group && !props.searchable ? this.handle : this.input, context);
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
   * @param {Context} context
   */
  rest(group, bounds, context) {
    const { issue, labels, frequent, frame, overlay } = this.props;
    const opens = group ? (/** @type {Bounds | undefined} */ beside) =>
      openLabels(issue, labels, frequent, { beside, frame, gap: 0 }, { group, parent: overlay }) : null;
    this.pages.rest(group, bounds, opens, context);
  }

  /**
   * @param {Theme} theme
   * @param {AnyLabel} label
   * @param {AnyLabel[]} all
   * @param {boolean} noted
   */
  row(theme, label, all, noted) {
    const dot = labelMark(label);
    const ticked = this.worn()
        .includes(label.id), note = noted ? groupOf(label, all) : "";
    if (label.isGroup) {
      return pillRow(theme, `label-${label.id}`, Height.MENU_ROW)
        .rounded(Radius.ROW)
        .bg(this.pages.lit === label.id ? theme.selected : theme.popover)
        .on_mouse_move((event, context) => this.rest(label.id, /** @type {Bounds} */ (event.bounds), context))
        .child(dot)
        .child(div()
          .flex_1()
          .min_w(0)
          .truncate()
          .child(label.name))
        .child(chevron(theme));
    }
    return item(theme, label.id,
      [dot, div()
        .min_w(0)
        .truncate()
        .child(label.name), div()
        .flex_none()
        .text_color(theme.dim)
        .text_size(Text.SMALL)
        .child(note)], () => this.toggle(label), ticked)
      .on_mouse_move((_event, context) => this.rest(null, NO_BOUNDS, context));
  }

  // The box takes the label off; the rest of a group's row opens its page
  /**
   * @param {Theme} theme
   * @param {{ label: AnyLabel, child?: AnyLabel }} entry
   */
  wornRow(theme, { label, child }) {
    const box = div()
      .id(`untick-${label.id}`)
      .size(16)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(Radius.MARK)
      .bg(theme.accent)
      .cursor_pointer()
      .on_click((_event, context) => { context.stop_propagation(); this.toggle(child ?? label); })
      .child(svg(shipped("check"))
        .size(10)
        .text_color(theme.accent_foreground));
    const row = pillRow(theme, `worn-${label.id}`, Height.MENU_ROW)
      .rounded(Radius.ROW)
      .child(box)
      .child(labelMark(label))
      .child(div()
        .min_w(0)
        .truncate()
        .child(label.name));
    if (!child) return row.on_click(() => this.toggle(label))
      .on_mouse_move((_event, context) =>
        this.rest(null, NO_BOUNDS, context));
    return row.on_mouse_move((event, context) => this.rest(label.id, /** @type {Bounds} */ (event.bounds), context))
      .child(div()
        .flex_1()
        .min_w(0)
        .truncate()
        .text_color(theme.dim)
        .child(child.name))
      .child(chevron(theme));
  }

  /** @param {Theme} theme */
  render(theme) {
    const { labels, group, searchable } = this.props;
    const list = v_flex()
      .id("label-list")
      .h(this.props.list)
      .flex_none()
      .overflow_y_scroll();
    if (group) {
      const found = this.query.trim() ? matching(this.scope(), this.query) : this.scope();
      const rows = found.map((label) => this.row(theme, label, labels, false));
      if (!searchable) return frame(theme, "label-group", this.handle)
        .child(list.children(rows));
      return frame(theme, "label-group", this.handle)
        .child(searchRow(theme, this.input))
        .child(rule(theme))
        .child(list.children(rows));
    }
    const found = this.query.trim() ? matching(labels, this.query) : null;
    const worn = wornRows(labels, this.worn());
    return frame(theme, "label-picker", this.handle)
      .on_mouse_move(this.pages.noteMenuBounds)
      .on_size_change((_size, context) => this.pages.followZoom(context))
      .child(searchRow(theme, this.input, ["L"]))
      .child(rule(theme))
      .child(found ? list.children(found.map((label) => this.row(theme, label, labels, true)))
      : list.children([
        ...(worn.length ? [...worn.map((entry) => this.wornRow(theme, entry)), rule(theme)] : []),
        ...blocks(labels, this.props.frequent)
          .flatMap(({ title, labels: shown }, nth) => [
            ...(nth ? [rule(theme)] : []),
            caption(theme, title),
            ...shown.map((label) => this.row(theme, label, labels, title === "Frequently used")),
          ])]));
  }
}
