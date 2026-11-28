// The panel's look: the bar of views and buttons, the total, the list, the strip of ticked issues, the page over
// them, the spinner and the tooltips. Drawing only: the panel holds what is shown and answers every press and key
import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import * as api from "../api.js";
import * as channel from "../channel.js";
import { HEADER_HEIGHT_PX, VIEWS, icon, logo, shipped } from "../config.js";
import { ViewKey } from "../enums.js";
import { NAME, openApp } from "../tracker.js";
import { chordCaps, zoom } from "../ui.js";
import { isDark } from "../lib/color.js";
import { points } from "../lib/listing.js";
import { textWidth } from "../lib/placement.js";
import { estimateLabel } from "../lib/teams.js";
import { carried, section, warming } from "./issue-list.js";
import { Height, Radius, Space, Text } from "../style.js";

const CLEAR_BUTTON_GLYPH_PX = 13;
const CLEAR_BUTTON_SIZE_PX = 28;
const COLUMN_CHARACTER_WIDTH_PX = 7;
const DEFAULT_PANEL_WIDTH_PX = 368;
const ISLAND_HEIGHT_PX = 58;
const ISLAND_SLIDE_MS = 180;
const NEW_ISSUE_GLYPH_PX = 15;
const SPINNER_TURN_MS = 900;

// How wide the longest of the texts is, in pixels of a style
/** @param {string[]} texts */
const widest = (texts) => textWidth(
  texts.reduce((longest, text) => (text.length > longest.length ? text : longest), ""), COLUMN_CHARACTER_WIDTH_PX);

/**
 * @param {Panel} panel
 * @param {Theme} theme
 */
function reloadButton(panel, theme) {
  return panel.iconButton(theme, { id: "reload", label: "Reload", caps: ["R"], name: "refresh",
    action: (context) => { panel.refresh(context); context.notify(); } });
}

/**
 * @param {Panel} panel
 * @param {Theme} theme
 */
function header(panel, theme) {
  const home = div()
    .id("home")
    .h(Height.ROW)
    .px(8)
    .gap(Space.S)
    .flex_none()
    .flex()
    .items_center()
    .rounded_full()
    .cursor_pointer()
    .font_semibold()
    .hover((style) => style.bg(theme.hover))
    .on_click(() => { openApp(); });
  return h_flex()
    .h(HEADER_HEIGHT_PX)
    .flex_none()
    .pl(8)
    .pr(14)
    .gap(Space.M)
    .items_center()
    .border_b(1)
    .border_color(theme.border)
    .child(panel.hints.on(home, `Open ${NAME}`)
      .child(image(logo(isDark(theme.background)))
        .size(14)
        .flex_none())
      .child(NAME))
    .child(div()
      .flex_1())
    .when(panel.loader.needsKey, (element) => element
      .child(reloadButton(panel, theme)));
}

// A click on the pill cannot reach a row behind it: it has its own strip under the list. The strip is always there,
// flat while nothing is ticked: its height is what Herdr animates, and the pill, hung from its top, rises from below
/**
 * @param {Panel} panel
 * @param {Theme} theme
 */
function island(panel, theme) {
  const strip = h_flex()
    .id("island")
    .flex_none()
    .h(panel.selection.size > 0 ? ISLAND_HEIGHT_PX : 0)
    .overflow_hidden()
    .items_start()
    .justify_center()
    .transition("height", { duration: ISLAND_SLIDE_MS, easing: "ease-out" });
  if (!panel.selection.size) return strip;
  const targets = panel.ticked(), total = points(targets, panel.store.teams);
  const actions = h_flex()
    .id("actions")
    .h(Height.ROW)
    .px(11)
    .gap(Space.S)
    .flex_none()
    .items_center()
    .rounded_full()
    .cursor_pointer()
    .bg(theme.raised)
    .border_1()
    .border_color(theme.border)
    .text_color(theme.foreground)
    .hover((style) => style.bg(theme.hover))
    .on_click(() => panel.openers.commands());
  const untick = panel.iconButton(theme, { id: "untick", name: "close", label: "Clear selected", caps: ["Esc"],
    glyph: CLEAR_BUTTON_GLYPH_PX, size: CLEAR_BUTTON_SIZE_PX, ring: false, side: "above",
    action: (context) => { panel.selection.clear(); panel.hints.clear(); context.notify(); } });
  return strip
    .child(h_flex()
      .h(42)
      .mt(8)
      .pl(16)
      .pr(7)
      .gap(Space.L)
      .items_center()
      .rounded_full()
      .bg(theme.popover)
      .border_1()
      .border_color(theme.border)
      .shadow_md()
      .text_size(Text.BODY)
      .child(div()
        .flex_none()
        .text_color(theme.foreground)
        .child(`${targets.length} selected`))
      .when(total > 0, (element) => element
        .child(div()
          .text_color(theme.dim)
          .child("·"))
        .child(h_flex()
          .flex_none()
          .gap(Space.XS)
          .items_center()
          .text_color(theme.muted)
          .child(svg(icon("estimate"))
            .size(13))
          .child(String(total))))
      .child(panel.hints.on(actions, "Open command menu", { caps: chordCaps(["K"]), side: "above" })
        .child(svg(icon("command"))
          .size(13))
        .child("Actions"))
      .child(untick));
}

/**
 * @param {Panel} panel
 * @param {Theme} theme
 * @param {import("./issue-page.js").IssuePage} page
 */
function pageOf(panel, theme, page) {
  const width = panel.frame ? panel.frame.width / zoom() : DEFAULT_PANEL_WIDTH_PX;
  const issue = panel.store.index()
    .get(page.issue.id) ?? page.issue;
  return page.render(theme, issue, width, (context) => panel.closeDetail(context));
}

// The total of the view, in the mode the groups' totals are in: the number of issues, or their estimates. Like
// theirs, it brightens under the pointer, and a click switches the mode of all of them
/**
 * @param {Panel} panel
 * @param {Theme} theme
 * @param {Issue[]} issues
 */
function totalButton(panel, theme, issues) {
  const counting = panel.totals === "count", cut = panel.store.more[panel.view];
  return panel.control(warming(panel, h_flex()
    .h(22)
    .px(5)
    .flex_none()
    .gap(Space.XS)
    .items_center()
    .rounded(Radius.CHIP)
    .cursor_pointer()
    .text_size(Text.SMALL), "total-view", theme.muted, theme.foreground), (context) => panel.switchTotals(context))
    .when(!counting, (element) => element.child(svg(icon("estimate"))
      .size(14)))
    .child(counting ? `${issues.length}${cut ? "+" : ""} ${issues.length === 1 && !cut ? "issue" : "issues"}`
    : String(points(issues, panel.store.teams)));
}

/**
 * @param {Panel} panel
 * @param {Theme} theme
 * @param {Group[]} sections
 */
export function drawPanel(panel, theme, sections) {
  // A page that has slid in covers the list, which is then not drawn: it would still answer the pointer
  const covered = Boolean(panel.detail?.settled);
  const { store } = panel, issues = store.issues[panel.view];
  const look = {
    theme,
    identifierWidth: widest(issues.map((issue) => issue.identifier)),
    estimateWidth: widest(issues.map((issue) => estimateLabel(store.teams.get(issue.team.id), issue.estimate) ?? "")),
    lit: channel.lit(),
  };
  const empty = panel.loader.loading ? "Loading issues…"
    : panel.view === ViewKey.CYCLE ? "No issues in the current cycle" : "No assigned issues";
  /**
   * @param {string} text
   * @param {Color} color
   */
  const note = (text, color) => div()
    .flex_none()
    .px(16)
    .text_size(Text.SMALL)
    .text_color(color)
    .child(text);
  /**
   * @param {typeof VIEWS[number]} entry
   * @param {number} nth
   */
  const pill = ({ id: view, label, icon: name }, nth) => panel.hints.on(
    h_flex()
      .id(`view-${view}`)
      .h(Height.ROW)
      .px(11)
      .gap(Space.S)
      .flex_none()
      .items_center()
      .rounded(Radius.CONTROL)
      .cursor_pointer()
      .text_size(Text.BODY)
      .bg(panel.view === view ? theme.selected : theme.background)
      .text_color(panel.view === view ? theme.foreground : theme.muted)
      .when(panel.view !== view, (element) => element.hover((style) => style.bg(theme.hover)))
      .on_click((_event, context) => panel.show(view, context))
      .child(svg(icon(name))
        .size(14)
        .flex_none())
      .child(label),
    label, { caps: [String(nth + 1)] });
  /**
   * @param {MouseButtonEvent} _event
   * @param {Context} context
   */
  const endDrag = (_event, context) => { if (panel.drag.cancel()) context.notify(); };
  return v_flex()
    .id("issues-panel")
    .relative()
    .track_focus(panel.handle)
    .focus((style) => style.border_color(theme.accent))
    .on_key_down((event, context) => {
      panel.hints.keys(event.modifiers, event.key, context);
      panel.key(event, context);
    })
    .on_key_up((event, context) => panel.hints.keys(event.modifiers, null, context))
    .on_modifiers_changed((event, context) => panel.hints.keys(event.modifiers, null, context))
    .size_full()
    .min_h(0)
    .rounded(Radius.BOX)
    .overflow_hidden()
    .bg(theme.background)
    .border_1()
    .border_color(theme.border)
    .text_color(theme.foreground)
    .text_size(Text.BODY)
    // A popup opened from the panel has the keyboard for a moment: the panel keeps its focused look meanwhile, and
    // while it takes the keyboard back
    .when(channel.popups().length > 0 || panel.retaking || panel.pageHasKeyboard(),
      (element) => element.border_color(theme.accent))
    .on_mouse_up("left", endDrag)
    .on_mouse_down_out(endDrag)
    .on_mouse_down_out((_event, context) => {
      if (!panel.detail?.commentHasKeyboard) return;
      panel.detail.commentHasKeyboard = false;
      context.notify();
    })
    .on_mouse_down("left", () => { panel.handle.focus(); panel.drag.settle(); })
    .on_mouse_down("right", () => panel.handle.focus())
    .on_mouse_move((event, context) => {
      panel.frame = event.bounds;
      panel.pointer = event.position;
      panel.hints.pointerMoved(event.modifiers, context);
      if (panel.drag.follow(event.position, event.local_position)) context.notify();
    })
    .when(panel.loader.needsKey, (element) => element.child(header(panel, theme)))
    .when(panel.loader.needsKey, (element) => element.child(panel.setup.render(theme)))
    .when(!panel.loader.needsKey && !covered, (element) => element
      .child(h_flex()
        .flex_none()
        .px(8)
        .pt(8)
        .pb(6)
        .gap(Space.XS)
        .items_center()
        .children(VIEWS.map(pill))
        .child(div()
          .flex_1())
        .child(panel.iconButton(theme, { id: "new-issue", label: "Create new issue", caps: ["C"], name: "create",
          glyph: NEW_ISSUE_GLYPH_PX, action: () => panel.openers.compose() }))
        .child(panel.iconButton(theme, { id: "display-options", label: "Show display options", caps: ["⇧", "V"],
          name: "display", action: () => panel.openers.displayOptions() }))
        .child(reloadButton(panel, theme)))
      .child(h_flex()
        .flex_none()
        .px(11)
        .items_center()
        .child(totalButton(panel, theme, issues)))
      .children(panel.loader.loadError ? [note(panel.loader.loadError, theme.danger)] : [])
      .children(panel.requests.failed ? [note(panel.requests.failed, theme.danger)
        .id("failed")
        .cursor_pointer()
        .on_click((_event, context) => { panel.requests.failed = null; context.notify(); })] : [])
      .child(v_flex()
        .id("issues")
        .flex_1()
        .min_h(0)
        .overflow_y_scrollbar()
        .track_scroll(panel.scroll)
        .px(6)
        .pb(6)
        .children(sections.map((group) => section(panel, group, look)))
        .when(!issues.length && !panel.loader.loadError, (element) =>
          element.child(div()
            .p(8)
            .text_size(Text.SMALL)
            .text_color(theme.dim)
            .child(empty)))
        .when(Boolean(store.more[panel.view]), (element) => element.child(div()
          .p(8)
          .text_size(Text.CAPTION)
          .text_color(theme.dim)
          .child(`Showing the first ${api.ISSUES_PER_VIEW} issues`))))
      .child(island(panel, theme)))
    .children(panel.detail ? [pageOf(panel, theme, panel.detail)] : [])
    .when(panel.loader.spinning, (element) => element
      .child(div()
        .absolute()
        .inset_0()
        .flex()
        .items_center()
        .justify_center()
        .child(div()
          .size(40)
          .flex()
          .items_center()
          .justify_center()
          .rounded_full()
          .bg(theme.popover)
          .border_1()
          .border_color(theme.border)
          .shadow_md()
          .child(svg(shipped("spinner"))
            .size(18)
            .text_color(theme.muted)
            .spin(SPINNER_TURN_MS)))))
    .children(panel.hints.showing() && panel.frame ? [panel.hints.draw(theme, panel.frame)] : [])
    .when(panel.drag.carrying, (element) => element.child(carried(panel, theme)));
}
