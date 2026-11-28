import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { click, find, focuses, hover, press, send, text, texts, walk } from "../host/elements.js";
import { host } from "../host/herdr.js";
import { ask } from "../../mods/linear-panel/channel.js";
import { mountOverlay } from "../host/mount.js";
import { BACK, CYCLE, at, clickRow, issue, mr, startPanel } from "../fixtures.js";

const COMMENTS = [
  { id: "c1", body: "Seen it too", createdAt: "2026-11-21T10:00:00.000Z", parent: null, botActor: null,
    url: "https://tracker.test/c1", resolvedAt: null,
    user: { id: "ada", name: "Ada Lovelace", displayName: "ada", initials: "AL", avatarBackgroundColor: null } },
  { id: "c2", body: "Same here", createdAt: "2026-11-21T11:00:00.000Z", parent: { id: "c1" }, botActor: null,
    url: "u2", resolvedAt: null, user: null },
];
const LABELS = [
  { id: "l-okr", name: "OKR Tech", color: "#f2c94c", isGroup: false, parent: null, team: null },
  { id: "l-type", name: "Ticket type", color: "#f2c94c", isGroup: true, parent: null, team: { id: "team-back" } },
  { id: "l-spec", name: "Spec", color: "#f2c94c", isGroup: false, parent: { id: "l-type" }, team: { id: "team-back" } },
  { id: "l-disc", name: "Discovery", color: "#f4c7c3", isGroup: false, parent: { id: "l-type" },
    team: { id: "team-back" } },
];
const mine = () => [issue("BACK-1", "Fix login", BACK, "In Progress", { priority: 1, estimate: 3, cycle: CYCLE,
  attachments: { nodes: [mr("gitlab", "acme/app", 12, "open")] } })];

const slideIn = (panel) => { panel.cx.elapse(); return panel.draw(); };

// A panel with these issues, a plain click on the first one's row opening its page, with everything the page reads. The
// page is slid in when `slide` is set, and its read is not waited for when `wait` is false
async function openPage(issues, { slide = false, wait = true } = {}) {
  const panel = await startPanel({ issues });
  panel.server.comments = COMMENTS;
  panel.server.labels = LABELS;
  await clickRow(panel, "back-1", { wait });
  if (slide) slideIn(panel);
  return panel;
}
const opened = () => openPage(mine());

function clickOn(panel, id) {
  const root = panel.draw();
  click(root, find(root, id), panel.cx);
}

describe("an issue's page", () => {
  it("opens on a plain click, from the panel's right edge, and slides in a moment later", async () => {
    const panel = await opened();
    assert.deepEqual(host.ran.filter((ran) => ran.command === "open"), []);
    assert.equal(find(panel.draw(), "issue-page").$.style.left, 368);
    assert.equal(find(slideIn(panel), "issue-page").$.style.left, 0);
  });

  it("lists the merge requests, then the properties, then the labels", async () => {
    const panel = await opened();
    const page = find(slideIn(panel), "issue-page");
    assert.deepEqual(texts(page)
      .slice(0, 13), ["BACK-1", "Diffs", "Change 12", "Properties", "In Progress",
      "B", "Backend", "Urgent", "Unassigned", "3 Points", "Cycle 12", "Labels", "Add label"]);
  });

  it("reads the description and the comments, a reply under its comment", async () => {
    const panel = await opened();
    const bodies = [...walk(find(slideIn(panel), "issue-page"))].filter((node) => node.$.kind === "TextView")
      .map((node) => node.$.args[1]);
    assert.deepEqual(bodies, ["Steps to reproduce", "Seen it too", "Same here"]);
  });

  it("opens a property's choices on a click on it", async () => {
    const panel = await opened();
    clickOn(panel, "page-status");
    assert.equal(host.overlays.at(-1).props.part, "commands");
    assert.equal(host.overlays.at(-1).props.page, "status");
  });

  it("opens the label picker on Add label, with the team's labels", async () => {
    const panel = await opened();
    clickOn(panel, "page-add");
    assert.equal(host.overlays.at(-1).props.part, "labels");
    assert.deepEqual(host.overlays.at(-1).props.labels.map((label) => label.id),
      ["l-okr", "l-type", "l-spec", "l-disc"]);
  });

  it("posts a comment from the field at the bottom", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const composer = find(root, "comment-send");
    panel.view.part.detail.composer.type("Looks good", panel.cx);
    click(root, composer, panel.cx);
    await panel.cx.idle();
    const asked = panel.server.asked.find((request) => request.kind === "comment");
    assert.deepEqual(asked.variables.input, { issueId: "back-1", body: "Looks good" });
  });

  it("replies to a comment", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    panel.view.part.detail.replies.get("c1")
      .type("Thanks", panel.cx);
    click(root, find(root, "reply-c1-send"), panel.cx);
    await panel.cx.idle();
    const asked = panel.server.asked.find((request) => request.kind === "comment");
    assert.deepEqual(asked.variables.input, { issueId: "back-1", body: "Thanks", parentId: "c1" });
  });

  it("saves a new title", async () => {
    const panel = await opened();
    slideIn(panel);
    const { detail } = panel.view.part;
    detail.title.type("Fix sign-in", panel.cx);
    detail.saveTitle(panel.cx);
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-1"], input: { title: "Fix sign-in" } });
  });

  it("slides back out on its chevrons, then is gone", async () => {
    const panel = await opened();
    slideIn(panel);
    clickOn(panel, "page-back");
    assert.equal(find(panel.draw(), "issue-page").$.style.left, 368);
    panel.cx.elapse();
    assert.equal(find(panel.draw(), "issue-page"), null);
  });

  it("slides back out on Escape, but leaves Escape to a field that has the keyboard", async () => {
    const panel = await opened();
    slideIn(panel);
    panel.view.part.detail.focusedFieldCount = 1;
    press(panel.draw(), "escape", panel.cx);
    assert.equal(find(panel.draw(), "issue-page").$.style.left, 0);
    panel.view.part.detail.focusedFieldCount = 0;
    press(panel.draw(), "escape", panel.cx);
    assert.equal(find(panel.draw(), "issue-page").$.style.left, 368);
  });

  it("does not run the list's keys while it is open", async () => {
    const panel = await opened();
    slideIn(panel);
    press(panel.draw(), "r", panel.cx);
    await panel.cx.idle();
    assert.equal(panel.server.kinds()
      .filter((kind) => kind === "issues").length, 1);
  });
});

describe("a comment on the page", () => {
  it("opens the menu of a comment from its options button, which offers Edit and Delete on mine only", async () => {
    const panel = await opened();
    slideIn(panel);
    assert.equal(find(panel.draw(), "react-c1"), null);
    clickOn(panel, "more-c1");
    assert.equal(host.overlays.at(-1).props.part, "comment-menu");
    // The comment is Ada's, not mine: neither Edit nor Delete is offered
    assert.equal(host.overlays.at(-1).props.own, false);
  });

  it("shows no reactions: they are not part of the page", async () => {
    const root = slideIn(await opened());
    assert.equal([...walk(root)].some((node) => String(node.$.id)
      .startsWith("reaction-")), false);
  });
});

describe("editing a comment", () => {
  it("opens its field from the menu's request, saves it, and reads the comments again", async () => {
    const panel = await opened();
    slideIn(panel);
    ask({ ids: ["back-1"], kind: "comment", change: "start-edit", comment: "c1" });
    panel.draw();
    panel.cx.elapse();
    const { detail } = panel.view.part;
    assert.equal(detail.edited.id, "c1");
    assert.equal(detail.edited.field.value(), "Seen it too");
    // The cursor goes after the text, once the field has the keyboard
    panel.cx.elapse();
    assert.deepEqual(detail.edited.field.selected, { start: 11, end: 11 });
    detail.edited.field.type("Seen it too, fixed", panel.cx);
    detail.saveEdit(panel.cx);
    await panel.cx.idle();
    const changed = panel.server.asked.find((request) => request.kind === "comment-change");
    assert.deepEqual(changed.variables, { id: "c1", body: "Seen it too, fixed" });
    assert.equal(panel.server.kinds()
      .at(-1), "page");
  });
});

describe("the label picker", () => {
  it("opens to the right of the control pressed, with its keys' hint", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const plus = find(root, "page-add");
    const bounds = { x: 920, y: 300, width: 80, height: 24 };
    send(root, plus, "on_mouse_down:left", { ...at(930, 310), bounds }, panel.cx);
    send(root, plus, "on_click", at(930, 310), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.part, "labels");
    assert.ok(popup.at.x >= bounds.x + bounds.width);
  });

  it("opens on L, unless a field has the keyboard", async () => {
    const panel = await opened();
    slideIn(panel);
    panel.view.part.detail.focusedFieldCount = 1;
    press(panel.draw(), "l", panel.cx);
    assert.equal(host.overlays.filter((overlay) => overlay.props.part === "labels").length, 0);
    panel.view.part.detail.focusedFieldCount = 0;
    press(panel.draw(), "l", panel.cx);
    assert.equal(host.overlays.at(-1).props.part, "labels");
  });
});

describe("a popup opened by its key on the page", () => {
  // The page notes where a control is as the pointer moves anywhere in the window, and where its scrolling part is:
  // the stand-in gives one place to every element on the way, so the scrolling part is noted last, on its own
  const VIEW = { x: 900, y: 120, width: 400, height: 620 };
  const note = (root, id, bounds, cx) => {
    send(root, find(root, id), "on_window_mouse_move", { ...at(100, 100), bounds }, cx);
    send(root, find(root, "page-scroll"), "on_window_mouse_move", { ...at(100, 100), bounds: VIEW }, cx);
  };
  // Slid in, then settled: the page notes nothing while it slides
  const settle = (panel) => { slideIn(panel); return slideIn(panel); };

  it("opens the label picker by Add label, on its left when the panel has no room on its right", async () => {
    const panel = await opened();
    const root = settle(panel);
    send(root, root, "on_mouse_move", at(950, 100), panel.cx);
    const bounds = { x: 1150, y: 300, width: 90, height: 28 };
    note(root, "page-add", bounds, panel.cx);
    press(panel.draw(), "l", panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.part, "labels");
    assert.equal(popup.at.x + popup.width, bounds.x - 6);
    assert.equal(popup.at.y, bounds.y - 6);
  });

  it("opens Move to team under the team's line on ⌘ ⇧ M", async () => {
    const panel = await opened();
    const root = settle(panel);
    const bounds = { x: 1040, y: 300, width: 100, height: 28 };
    note(root, "page-team", bounds, panel.cx);
    press(panel.draw(), "m", panel.cx, { platform: true, shift: true });
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.part, "teams");
    assert.deepEqual(popup.at, { x: bounds.x, y: bounds.y + bounds.height + 2 });
  });

  it("opens at the pointer when the line is scrolled out of sight, or the page moved since it was seen", async () => {
    const panel = await opened();
    const root = settle(panel);
    note(root, "page-priority", { x: 1040, y: 60, width: 100, height: 28 }, panel.cx);
    press(panel.draw(), "p", panel.cx);
    // At the pointer the choices name their issue
    assert.equal(host.overlays.at(-1).props.bare, false);
    note(panel.draw(), "page-priority", { x: 1040, y: 300, width: 100, height: 28 }, panel.cx);
    panel.view.part.failed = "Something went wrong";
    press(panel.draw(), "p", panel.cx);
    assert.equal(host.overlays.at(-1).props.bare, false);
  });

  it("opens a property's picker close under its line, wherever the page scrolled since", async () => {
    const panel = await opened();
    const root = settle(panel);
    const bounds = { x: 1040, y: 300, width: 100, height: 28 };
    note(root, "page-priority", bounds, panel.cx);
    panel.view.part.detail.scroll.scrolled = 50;
    press(panel.draw(), "p", panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.page, "priority");
    assert.deepEqual(popup.at, { x: bounds.x, y: bounds.y - 50 + bounds.height + 2 });
  });
});

describe("a control of the page that opened a popup", () => {
  it("stays lit while the popup is open", async () => {
    const panel = await opened();
    clickOn(panel, "page-add");
    assert.equal(find(panel.draw(), "page-add").$.style.bg, "theme.hover");
    assert.equal(find(panel.draw(), "page-priority").$.style.bg, undefined);
  });
});

describe("a press on the page", () => {
  it("gives the panel the keyboard, unless it is in a text field", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const before = focuses(root);
    send(root, find(root, "page-body"), "on_mouse_down:left", at(950, 400), panel.cx);
    assert.equal(focuses(root), before + 1);
    send(root, [...walk(root)].find((node) => node.$.kind === "Input"), "on_mouse_down:left", at(950, 120), panel.cx);
    assert.equal(focuses(root), before + 1);
    // The press, on the field or in the padding around it, gives the field the keyboard
    assert.equal(panel.view.part.detail.title.focused, 1);
  });

  it("gives the keyboard back from a comment's text to the panel on a press on a page control", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const text = [...walk(root)].find((node) => node.$.kind === "TextView" && node.$.args[0] === "body-c1");
    send(root, text, "on_mouse_down:left", at(950, 400), panel.cx);
    assert.equal(panel.view.part.detail.commentHasKeyboard, true);
    clickOn(panel, "page-status");
    assert.equal(panel.view.part.detail.commentHasKeyboard, false);
  });

  it("keeps the panel's focused look while a field or a comment's text has the keyboard", async () => {
    const panel = await opened();
    slideIn(panel);
    const border = () => find(panel.draw(), "issues-panel").$.style.border_color;
    const { composer } = panel.view.part.detail;
    assert.equal(border(), "theme.border");
    composer.cx = panel.cx;
    composer.focus();
    assert.equal(border(), "theme.accent");
    composer.blur();
    assert.equal(border(), "theme.border");
    const root = panel.draw();
    const text = [...walk(root)].find((node) => node.$.kind === "TextView" && node.$.args[0] === "body-c1");
    send(root, text, "on_mouse_down:left", at(950, 400), panel.cx);
    assert.equal(border(), "theme.accent");
    send(root, find(root, "issues-panel"), "on_mouse_down_out", at(100, 100), panel.cx);
    assert.equal(border(), "theme.border");
  });
});

describe("a property's choices from the page", () => {
  it("open on the right of the line pressed", async () => {
    const panel = await opened();
    panel.view.part.detail.columns = 1;
    const root = slideIn(panel);
    const line = find(root, "page-status");
    const bounds = { x: 920, y: 300, width: 120, height: 24 };
    send(root, line, "on_mouse_down:left", { ...at(930, 310), bounds }, panel.cx);
    send(root, line, "on_click", at(930, 310), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.part, "commands");
    assert.ok(popup.at.x >= bounds.x + bounds.width);
  });
});

describe("a long page of choices from the page", () => {
  it("starts level with the line pressed and shrinks to the room below, instead of being pulled up", async () => {
    const panel = await opened();
    panel.view.part.detail.columns = 1;
    const root = slideIn(panel);
    // Tells the panel where it is in the window
    send(root, root, "on_mouse_move", at(950, 100), panel.cx);
    const line = find(root, "page-cycle");
    const bounds = { x: 920, y: 480, width: 100, height: 24 };
    send(root, line, "on_mouse_down:left", { ...at(930, 490), bounds }, panel.cx);
    send(root, line, "on_click", at(930, 490), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.at.y, bounds.y - 6);
    assert.ok(popup.at.y + popup.height <= 740);
  });
});

describe("the label picker low in the panel", () => {
  it("starts level with the control while its list fits below", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    send(root, root, "on_mouse_move", at(950, 100), panel.cx);
    const plus = find(root, "page-add");
    const bounds = { x: 920, y: 560, width: 80, height: 24 };
    send(root, plus, "on_mouse_down:left", { ...at(930, 570), bounds }, panel.cx);
    send(root, plus, "on_click", at(930, 570), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.at.y, bounds.y - 6);
    assert.ok(popup.at.y + popup.height <= 740);
  });
});

describe("moving the issue to another team", () => {
  it("lists my teams on a click on the team, and updates the issue to the one picked", async () => {
    const panel = await opened();
    clickOn(panel, "page-team");
    const picker = host.overlays.at(-1);
    assert.equal(picker.props.part, "teams");
    assert.deepEqual(picker.props.teams.map((team) => team.key), ["BACK", "WEB"]);
    assert.equal(picker.props.issue.id, "back-1");
    const menu = mountOverlay();
    const drawn = menu.draw();
    click(drawn, find(drawn, "item-WEB"), menu.cx);
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-1"], input: { teamId: "team-web" } });
  });
});

describe("the pickers of the properties", () => {
  it("open at one place whichever line was pressed, past the longest line", async () => {
    const xs = [];
    for (const [id, width] of [["page-status", 100], ["page-priority", 70]]) {
      const panel = await opened();
      panel.view.part.detail.columns = 1;
      const root = slideIn(panel);
      const line = find(root, id);
      const bounds = { x: 920, y: 300, width, height: 24 };
      send(root, line, "on_mouse_down:left", { ...at(930, 310), bounds }, panel.cx);
      send(root, line, "on_click", at(930, 310), panel.cx);
      xs.push(host.overlays.at(-1).at.x);
    }
    assert.equal(xs[0], xs[1]);
    assert.ok(xs[0] > 920 + 100);
  });
});

describe("the properties in a grid", () => {
  const LINES = ["page-status", "page-team", "page-priority", "page-assign", "page-estimate", "page-cycle"];
  // The ids of the property lines in each vertical column of the drawing, in order
  const columnsOf = (root) => [...walk(find(root, "issue-page"))]
    .filter((node) => node.$.kind === "v_flex" && node.$.children.some((child) => LINES.includes(child.$.id)))
    .map((node) => node.$.children.map((child) => child.$.id)
      .filter((id) => LINES.includes(id)));

  for (const [columns, expected] of [[1, [LINES]], [2, [LINES.slice(0, 3), LINES.slice(3)]],
    [3, [LINES.slice(0, 2), LINES.slice(2, 4), LINES.slice(4)]]]) {
    it(`sets the six properties in ${columns} column${columns > 1 ? "s" : ""}`, async () => {
      const panel = await opened();
      panel.view.part.detail.columns = columns;
      assert.deepEqual(columnsOf(slideIn(panel)), expected);
    });
  }

  it("is 2 rows of 3 columns by default, with every line still clickable", async () => {
    const panel = await opened();
    assert.equal(columnsOf(slideIn(panel)).length, 3);
    clickOn(panel, "page-cycle");
    assert.equal(host.overlays.at(-1).props.page, "cycle");
  });

  it("opens a property's picker under its line when there are columns, left-aligned with it", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const line = find(root, "page-priority");
    const bounds = { x: 1040, y: 300, width: 100, height: 24 };
    send(root, line, "on_mouse_down:left", { ...at(1050, 310), bounds }, panel.cx);
    send(root, line, "on_click", at(1050, 310), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.at.y, bounds.y + bounds.height + 2);
    assert.ok(popup.at.x <= bounds.x && popup.at.x >= 900);
  });
});

describe("the addresses the page opens", () => {
  const body = (panel) => [...walk(find(slideIn(panel), "issue-page"))].find((node) => node.$.kind === "TextView");

  it("opens the issue in the tracker's app from the button at the top right, before the browser", async () => {
    const panel = await opened();
    slideIn(panel);
    clickOn(panel, "page-open");
    await panel.cx.idle();
    assert.deepEqual(host.ran.at(-1).args, ["linear://tracker.test/issue/BACK-1"]);
  });

  it("opens a page of the tracker in its app first, from a link in the text", async () => {
    const panel = await opened();
    const link = "https://linear.app/acme/issue/BACK-2";
    for (const handler of body(panel).$.handlers.on_link_click) handler(link, panel.cx);
    await panel.cx.idle();
    assert.deepEqual(host.ran.at(-1).args, ["linear://linear.app/acme/issue/BACK-2"]);
  });

  it("opens any other address, a merge request included, in the browser", async () => {
    const panel = await opened();
    for (const handler of body(panel).$.handlers.on_link_click) handler("https://example.com/x", panel.cx);
    clickOn(panel, "page-merge-https://gitlab.com/acme/app/-/merge_requests/12");
    await panel.cx.idle();
    const opened_ = host.ran.filter((ran) => ran.command === "open")
      .map((ran) => ran.args[0]);
    assert.deepEqual(opened_, ["https://example.com/x", "https://gitlab.com/acme/app/-/merge_requests/12"]);
  });
});

describe("the top of the page", () => {
  it("shows the identifier as plain text, which does nothing when clicked", async () => {
    const panel = await opened();
    slideIn(panel);
    assert.equal(find(panel.draw(), "page-id").$.style.bg, undefined);
    assert.equal(find(panel.draw(), "page-id").$.style.border_color, undefined);
    clickOn(panel, "page-id");
    assert.equal(panel.cx.clipboard, null);
  });

  it("has four copy buttons at the top right, each with its shortcut in its tooltip", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const ids = ["url", "id", "branch", "prompt"].map((what) => `page-copy-${what}`);
    assert.deepEqual(ids.map((id) => find(root, id) !== null), [true, true, true, true]);
    const tip = (id) => {
      const bounds = { x: 1200, y: 90, width: 30, height: 30 };
      send(root, find(root, id), "on_mouse_move", { ...at(1200, 100), bounds }, panel.cx);
      panel.cx.elapse();
      return texts(find(panel.draw(), "tooltip"));
    };
    assert.deepEqual(tip(ids[0]), ["Copy issue URL", "⌘", "⇧", ","]);
    assert.deepEqual(tip(ids[3]), ["Copy as prompt", "⌘", "⌥", "P"]);
  });

  it("copies the URL, the identifier and the branch of the issue, one line of toast each", async () => {
    const panel = await opened();
    slideIn(panel);
    for (const [what, copied, title] of [["url", "https://tracker.test/issue/BACK-1", "Copied URL · BACK-1"],
      ["id", "BACK-1", "Copied ID · BACK-1"], ["branch", "me/back-1", "Copied git branch name · BACK-1"]]) {
      clickOn(panel, `page-copy-${what}`);
      await panel.cx.idle();
      assert.equal(panel.cx.clipboard, copied);
      assert.deepEqual(host.notes.at(-1), { title, timeout: 1500 });
    }
  });

  it("copies on the same shortcuts as the buttons, unless a field has the keyboard", async () => {
    const panel = await opened();
    slideIn(panel);
    panel.view.part.detail.focusedFieldCount = 1;
    press(panel.draw(), ".", panel.cx, { platform: true });
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard, null);
    panel.view.part.detail.focusedFieldCount = 0;
    press(panel.draw(), ".", panel.cx, { platform: true });
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard, "BACK-1");
    press(panel.draw(), ">", panel.cx, { platform: true, shift: true });
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard, "me/back-1");
  });
});

describe("the keys of a tooltip while they are held", () => {
  it("are drawn brighter as the modifiers of its shortcut are pressed, and back when they are let go", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    const bounds = { x: 1200, y: 90, width: 24, height: 24 };
    send(root, find(root, "page-copy-url"), "on_mouse_move", { ...at(1200, 100), bounds }, panel.cx);
    panel.cx.elapse();
    // A key held shows in the color of text that is lit (the stand-in theme's colors are not mixable)
    const colors = () => [...walk(find(panel.draw(), "tooltip"))].filter((node) => node.$.style.min_w === 20)
      .map((node) => node.$.style.text_color);
    const rest = colors();
    assert.deepEqual(rest, ["theme.muted", "theme.muted", "theme.muted"]);
    const before = panel.cx.notified;
    const modifiers = { shift: true, control: false, alt: false, platform: true, function: false };
    const drawn = panel.draw();
    send(drawn, drawn, "on_modifiers_changed", { modifiers }, panel.cx);
    assert.ok(panel.cx.notified > before);
    // The command and shift keys are lit; the comma is not yet
    assert.deepEqual(colors(), ["theme.foreground", "theme.foreground", "theme.muted"]);
    send(drawn, drawn, "on_modifiers_changed", { modifiers: { ...modifiers, shift: false, platform: false } },
      panel.cx);
    assert.deepEqual(colors(), rest);
  });
});

describe("the brightness of the top of the page", () => {
  it("dims the identifier, the same under the pointer, and lights only a copy button's icon under it", async () => {
    const panel = await opened();
    const id = find(slideIn(panel), "page-id").$;
    assert.equal(id.style.text_color, "theme.muted");
    assert.equal(id.hover, null);
    const style = () => find(panel.draw(), "page-copy-id").$.style;
    const icon = () => find(panel.draw(), "page-copy-id").$.children[0].$.style.text_color;
    assert.deepEqual([style().border_color, style().bg, icon()], ["theme.border", undefined, "theme.muted"]);
    hover(find(panel.draw(), "page-copy-id"), true, panel.cx);
    // Only the icon is lit: the circle stays
    assert.deepEqual([style().border_color, style().bg, icon()], ["theme.border", undefined, "theme.foreground"]);
    hover(find(panel.draw(), "page-copy-id"), false, panel.cx);
    assert.equal(style().border_color, "theme.border");
  });
});

describe("the top of the panel while a page is open", () => {
  it("has no header, and the page starts at the top", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    assert.equal(find(root, "home"), null);
    assert.equal(find(root, "issue-page").$.style.top, 0);
  });

  it("has none of the list's buttons or count, which go with the list", async () => {
    const panel = await opened();
    for (const id of ["new-issue", "display-options", "reload"]) assert.notEqual(find(panel.draw(), id), null);
    slideIn(panel);
    panel.cx.elapse();
    const root = panel.draw();
    for (const id of ["new-issue", "display-options", "reload"]) assert.equal(find(root, id), null);
    assert.doesNotMatch(text(root), /issues?$/m);
  });
});

const OKR = { id: "l-okr", name: "OKR Tech", color: "#f2c94c", parent: null };
const SPEC = { id: "l-spec", name: "Spec", color: "#f2c94c", parent: { id: "l-type" } };
// The page of an issue that wears these labels, slid in
const wearing = (...labels) => openPage([issue("BACK-1", "Fix login", BACK, "In Progress",
  { cycle: CYCLE, labels: { nodes: labels } })], { slide: true });
// Presses a label of the issue's page, as a click with the control's place
function pressLabel(panel, id) {
  const root = panel.draw(), chip = find(root, `page-label-${id}`);
  send(root, chip, "on_mouse_down:left", { ...at(950, 410), bounds: { x: 940, y: 400, width: 90, height: 24 } },
    panel.cx);
  send(root, chip, "on_click", at(950, 410), panel.cx);
}

describe("the labels of the issue", () => {
  it("shows a label of a group with a small arrow, any other without, and lights it under the pointer", async () => {
    const root = (await wearing(SPEC, OKR)).draw();
    const parts = (id) => find(root, `page-label-${id}`).$.children.length;
    assert.deepEqual([parts("l-spec"), parts("l-okr")], [3, 2]);
    assert.deepEqual(find(root, "page-label-l-okr").$.hover, { bg: "theme.hover" });
  });

  it("opens the group's labels beside a label of a group, with a search named after the group", async () => {
    const panel = await wearing(SPEC, OKR);
    pressLabel(panel, "l-spec");
    const popup = host.overlays.at(-1);
    assert.deepEqual([popup.props.part, popup.props.group, popup.props.searchable], ["labels", "l-type", true]);
    assert.deepEqual(popup.at, { x: 940 + 90 + 6, y: 400 - 6 });
    assert.equal(find(panel.draw(), "page-label-l-spec").$.style.bg, "theme.hover");
    const input = [...walk(mountOverlay()
      .draw())].find((node) => node.$.kind === "Input").$.args[0];
    assert.equal(input.placeholder, "Ticket type…");
  });

  it("lights the plus's circle under the pointer and while the picker it opened is open", async () => {
    const panel = await wearing(SPEC, OKR);
    const plus = () => find(panel.draw(), "page-add-label");
    assert.deepEqual(plus().$.hover, { bg: "theme.hover" });
    assert.equal(plus().$.style.bg, undefined);
    clickOn(panel, "page-add-label");
    assert.equal(host.overlays.at(-1).props.part, "labels");
    assert.equal(plus().$.style.bg, "theme.hover");
  });

  it("opens the picker for any other label, which lists what is worn first, ticked", async () => {
    const panel = await wearing(SPEC, OKR);
    pressLabel(panel, "l-okr");
    const drawn = mountOverlay()
      .draw();
    assert.deepEqual(texts(find(drawn, "worn-l-type")), ["Ticket type", "Spec"]);
    assert.notEqual(find(drawn, "worn-l-okr"), null);
    assert.equal([...walk(drawn)].find((node) => node.$.kind === "Input").$.args[0].placeholder,
      "Change or add labels…");
  });

  it("takes a worn label off from its box in that first block", async () => {
    const panel = await wearing(SPEC, OKR);
    clickOn(panel, "page-add-label");
    const picker = mountOverlay();
    const drawn = picker.draw();
    click(drawn, find(drawn, "untick-l-okr"), picker.cx);
    await panel.cx.idle();
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-1"], input: { removedLabelIds: ["l-okr"] } });
  });
});

describe("the labels of a group", () => {
  it("are exclusive: one worn is replaced by the one picked, which closes the page", async () => {
    const panel = await wearing(SPEC);
    pressLabel(panel, "l-spec");
    const group = mountOverlay();
    const drawn = group.draw();
    click(drawn, find(drawn, "item-l-disc"), group.cx);
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-1"], input: { addedLabelIds: ["l-disc"], removedLabelIds: ["l-spec"] } });
    assert.ok(host.closed.includes(group.overlay.id));
  });

  it("take the worn one off when it is picked again", async () => {
    const panel = await wearing(SPEC);
    pressLabel(panel, "l-spec");
    const group = mountOverlay();
    const drawn = group.draw();
    click(drawn, find(drawn, "item-l-spec"), group.cx);
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-1"], input: { removedLabelIds: ["l-spec"] } });
  });
});

describe("the merge requests of the page", () => {
  const many = (count) => [issue("BACK-1", "Fix login", BACK, "In Progress", { cycle: CYCLE,
    attachments: { nodes: Array.from({ length: count }, (_, nth) => mr("gitlab", "acme/app", nth + 1, "open")) } })];
  const open = (count) => openPage(many(count), { slide: true });
  const listed = (panel) => [...walk(find(panel.draw(), "issue-page"))]
    .filter((node) => String(node.$.id)
      .startsWith("page-merge-")).length;

  it("lists three at most, then a line that says how many are left", async () => {
    const panel = await open(8);
    assert.equal(listed(panel), 3);
    assert.equal(text(find(panel.draw(), "page-diffs-more")), "Show 5 more");
  });

  it("lists them all on a click on that line, which then offers to show fewer", async () => {
    const panel = await open(8);
    clickOn(panel, "page-diffs-more");
    assert.equal(listed(panel), 8);
    assert.equal(text(find(panel.draw(), "page-diffs-more")), "Show less");
    clickOn(panel, "page-diffs-more");
    assert.equal(listed(panel), 3);
  });

  it("has no such line for three or fewer", async () => {
    const panel = await open(3);
    assert.equal(listed(panel), 3);
    assert.equal(find(panel.draw(), "page-diffs-more"), null);
  });
});

describe("the title of a merge request on the page", () => {
  const LONG = "feat!: enable SQLAlchemy 2.0 strict mode in every service of the monorepo [BACK-5609]";
  const open = () => openPage([issue("BACK-1", "Fix login", BACK, "In Progress", { cycle: CYCLE,
    attachments: { nodes: [mr("gitlab", "acme/app", 12, "open", { title: LONG })] } })], { slide: true });
  const line = (panel) => find(panel.draw(), "page-merge-https://gitlab.com/acme/app/-/merge_requests/12");

  it("is cut to exactly 48 characters, and under the pointer shows more, on one line, cut by the width", async () => {
    const panel = await open();
    assert.deepEqual(texts(line(panel)), ["feat!: enable SQLAlchemy 2.0 strict mode in e..."]);
    assert.equal(line(panel).$.style.h, 28);
    hover(line(panel), true, panel.cx);
    assert.deepEqual(texts(line(panel)), [LONG]);
    assert.equal(line(panel).$.style.h, 28);
    assert.equal(line(panel).$.children[1].$.style.truncate, true);
    hover(line(panel), false, panel.cx);
    assert.equal(texts(line(panel))[0].length, 48);
  });
});

describe("a draft merge request on the page", () => {
  it("shows a grey icon, where an open one has a green one", async () => {
    const panel = await openPage([issue("BACK-1", "Fix login", BACK, "In Progress", { cycle: CYCLE,
      attachments: { nodes: [mr("gitlab", "acme/app", 12, "draft"), mr("gitlab", "acme/app", 13, "open")] } })]);
    const page = slideIn(panel);
    const color = (number) => [...walk(find(page, `page-merge-https://gitlab.com/acme/app/-/merge_requests/${number}`))]
      .find((node) => node.$.kind === "svg").$.style.text_color;
    assert.deepEqual([color(12), color(13)], ["#8a8f98", "#4cb782"]);
  });
});

describe("a change made from the page", () => {
  const change = (panel) => {
    ask({ ids: ["back-1"], kind: "update", input: { priority: 2 } });
    return panel.draw();
  };
  const spinning = (root) =>
    [...walk(root)].some((node) => node.$.kind === "svg" && node.$.args[0].endsWith("/spinner.svg"));

  it("reloads in the background: no spinner, and the issue is read again", async () => {
    const panel = await opened();
    slideIn(panel);
    assert.equal(spinning(change(panel)), false);
    await panel.cx.idle();
    assert.equal(spinning(panel.draw()), false);
    assert.deepEqual(panel.server.kinds()
      .slice(-2), ["update", "issues"]);
  });

  it("shows the spinner from the list, as before", async () => {
    const panel = await startPanel({ issues: mine() });
    assert.equal(spinning(change(panel)), true);
  });

  it("does the same for the labels, which are changes too", async () => {
    const panel = await opened();
    slideIn(panel);
    ask({ ids: ["back-1"], kind: "update", input: { addedLabelIds: ["l-okr"] } });
    assert.equal(spinning(panel.draw()), false);
    await panel.cx.idle();
    assert.deepEqual(panel.server.kinds()
      .slice(-2), ["update", "issues"]);
  });
});

describe("what the page keeps from being lost", () => {
  const typed = (panel, field, text) => { field.cx = panel.cx; field.type(text, panel.cx); };
  const updates = (panel) => panel.server.asked.filter((request) => request.kind === "update");

  it("still does what is asked of an issue that has left the list, from its page", async () => {
    const panel = await opened();
    slideIn(panel);
    panel.server.issues.length = 0;
    panel.view.part.reload(panel.cx);
    await panel.cx.idle();
    ask({ ids: ["back-1"], kind: "update", input: { priority: 2 } });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel)
      .map((request) => request.variables), [{ ids: ["back-1"], input: { priority: 2 } }]);
  });

  it("keeps a comment in its field until it is posted, and puts it back when the tracker refuses it", async () => {
    const panel = await opened();
    const root = slideIn(panel);
    typed(panel, panel.view.part.detail.composer, "A long comment");
    panel.server.error = "Rate limited";
    click(root, find(root, "comment-send"), panel.cx);
    assert.equal(panel.view.part.detail.composer.value(), "A long comment");
    await panel.cx.idle();
    assert.equal(panel.view.part.detail.composer.value(), "A long comment");
    assert.match(panel.view.part.failed, /Rate limited/);
    panel.server.error = null;
    clickOn(panel, "comment-send");
    await panel.cx.idle();
    assert.equal(panel.view.part.detail.composer.value(), "");
  });

  it("hands the keyboard back when an edit ends, so that Escape and the shortcuts work again", async () => {
    const panel = await opened();
    slideIn(panel);
    const { detail } = panel.view.part;
    detail.startEdit("c1", panel.cx);
    detail.edited.field.cx = panel.cx;
    detail.edited.field.focus();
    assert.equal(detail.focusedFieldCount, 1);
    detail.stopEdit(panel.cx);
    assert.equal(detail.focusedFieldCount, 0);
  });

  it("saves the comment being edited before another one is edited", async () => {
    const panel = await opened();
    slideIn(panel);
    const { detail } = panel.view.part;
    detail.startEdit("c1", panel.cx);
    typed(panel, detail.edited.field, "Seen it too, fixed");
    detail.startEdit("c2", panel.cx);
    await panel.cx.idle();
    assert.equal(detail.edited.id, "c2");
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "comment-change").variables,
      { id: "c1", body: "Seen it too, fixed" });
  });

  it("sends a new title once, whether Enter or the loss of the keyboard ended it", async () => {
    const panel = await opened();
    slideIn(panel);
    const { detail } = panel.view.part;
    detail.title.cx = panel.cx;
    typed(panel, detail.title, "Fix sign-in");
    detail.title.submit(panel.cx);
    detail.title.blur();
    await panel.cx.idle();
    assert.equal(updates(panel).length, 1);
  });

  it("sends a title again after the tracker refused it", async () => {
    const panel = await opened();
    slideIn(panel);
    const { detail } = panel.view.part;
    detail.title.cx = panel.cx;
    typed(panel, detail.title, "Fix sign-in");
    panel.server.error = "Rate limited";
    detail.saveTitle(panel.cx);
    await panel.cx.idle();
    panel.server.error = null;
    detail.saveTitle(panel.cx);
    await panel.cx.idle();
    assert.equal(updates(panel).length, 2);
  });

  it("does nothing on Enter in the label search when nothing was typed", async () => {
    const panel = await opened();
    clickOn(panel, "page-add");
    const picker = mountOverlay();
    picker.draw();
    picker.view.part.input.submit(picker.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel), []);
  });

  it("opens the keys of the properties on the page, for its issue", async () => {
    const panel = await opened();
    slideIn(panel);
    press(panel.draw(), "p", panel.cx);
    assert.deepEqual([host.overlays.at(-1).props.part, host.overlays.at(-1).props.page], ["commands", "priority"]);
  });

  it("starts a group's page from what the issue wears now, not from what an earlier visit left", async () => {
    const panel = await wearing(SPEC);
    ask({ ids: ["back-1"], kind: "update", input: {} });
    const { wear } = await import("../../mods/linear-panel/channel.js");
    wear("back-1", ["l-disc"]);
    pressLabel(panel, "l-spec");
    const group = mountOverlay();
    assert.deepEqual(group.view.part.worn(), ["l-spec"]);
  });
});

describe("a change to a comment that the tracker refuses without an error", () => {
  it("is reported, not taken for done", async () => {
    const { changeComment } = await import("../../mods/linear-panel/api.js");
    const panel = await opened();
    panel.server.refuse = true;
    await assert.rejects(() => changeComment("delete", "c1"), /refused/);
  });
});

describe("a list the tracker answers a page at a time", () => {
  it("is read to its last page", async () => {
    const { labels } = await import("../../mods/linear-panel/api.js");
    const panel = await opened();
    panel.server.labels = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id }));
    panel.server.labelsPerPage = 2;
    assert.deepEqual((await labels("team-back")).map((label) => label.id), ["a", "b", "c", "d", "e"]);
  });
});

// Four blocks: a heading splits the text, a blank line does not
const DESCRIPTION = "# Title\n\nfirst line\nsecond line\n\n## Next\n\nlast";

const views = (panel) => [...walk(find(slideIn(panel), "issue-page"))]
  .filter((node) => node.$.kind === "TextView" && String(node.$.args[0])
    .startsWith("description"));
const described = async (description = DESCRIPTION) => {
  const panel = await opened();
  panel.view.part.detail.description = description;
  return panel;
};

describe("the description", () => {
  it("is drawn as Markdown, each heading at its own size, and read-only", async () => {
    const panel = await described();
    assert.deepEqual(views(panel)
      .map((node) => [node.$.args[0], node.$.args[1], node.$.style.text_size]),
    [["description", "Title", 22], ["description-1", "first line\nsecond line", 13],
      ["description-2", "Next", 19], ["description-3", "last", 13]]);
    assert.equal([...walk(find(slideIn(panel), "issue-page"))].some((node) => node.$.kind === "Editor"), false);
  });

  it("does nothing on a click: no editor, no text cursor, no request", async () => {
    const panel = await described();
    const page = find(slideIn(panel), "issue-page");
    const nodes = [...walk(find(page, "page-body"))];
    // Nothing in the description listens to a press
    assert.deepEqual(nodes.filter((node) => Object.keys(node.$.handlers)
      .some((event) => event.startsWith("on_mouse_down") || event === "on_click")), []);
    send(page, find(page, "page-body"), "on_click", { click_count: 1 }, panel.cx);
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.filter((request) => request.kind === "update"), []);
    assert.equal([...walk(find(slideIn(panel), "issue-page"))].some((node) => node.$.kind === "Editor"), false);
  });

  it("shows nothing for an issue with none", async () => {
    const panel = await described("");
    assert.deepEqual(views(panel), []);
    assert.equal(texts(find(slideIn(panel), "page-body")).length, 0);
  });
});
