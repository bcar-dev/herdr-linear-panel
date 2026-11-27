// The popups, each started with the props popups.js gives it: what they show and what they ask of the panel
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { click, field, find, focuses, icons, press, send, text, texts, walk } from "../host/elements.js";
import { host, reset } from "../host/herdr.js";
import { mount } from "../host/mount.js";
import { pending, shareProjects } from "../../mods/linear-panel/channel.js";
import { BACK, FRAME, WEB, sampleIssues, settled } from "../fixtures.js";

const [fixLogin, auditLog, , landingPage] = sampleIssues();
// What a popup asked of the panel, without the time it asked
function asked() {
  const { at: _at, ...request } = pending() ?? {};
  return request;
}
function clickOn(popup, id) {
  const root = popup.draw();
  click(root, find(root, id), popup.cx);
}
const pressKey = (popup, key, modifiers) => press(popup.draw(), key, popup.cx, modifiers);

beforeEach(() => reset());

describe("issue menu", () => {
  const open = (issues = [fixLogin], teams = [BACK]) =>
    mount({ part: "issue-menu", issues, teams, me: "me", agent: "Codex", frame: FRAME, overlay: "menu" });
  const bounds = { x: 905, y: 300, width: 270, height: 31 };
  const rest = (menu, id) => {
    const root = menu.draw();
    send(root, find(root, `entry-${id}`), "on_mouse_move", { bounds }, menu.cx);
  };
  // The entries lit, by id: those whose page shows beside the menu
  const lit = (menu) =>
    [...walk(menu.draw())].filter((node) => node.$.style.bg === "theme.selected")
      .map((node) => node.$.id);

  it("names its issue and lists what can be done to it", () => {
    assert.deepEqual(texts(open()
      .draw()), [
      "BACK-1 · Fix login", "Status", "S", "Priority", "P", "Assignee", "A", "Estimate", "⇧", "E", "Cycle", "⇧", "C",
      "Copy", "Open in Linear", "⌘", "Click", "Start with Codex…",
    ]);
  });

  it("offers no Start while there is no agent to start", () => {
    const props = { part: "issue-menu", issues: [fixLogin], teams: [BACK], me: "me", agent: null, overlay: "menu" };
    const menu = mount(props);
    assert.doesNotMatch(text(menu.draw()), /Start with/);
    assert.equal(find(menu.draw(), "entry-start"), null);
  });

  it("offers no estimate for a team that does not estimate, and only the priority without the team", () => {
    assert.doesNotMatch(text(open([landingPage], [WEB])
      .draw()), /Estimate/);
    assert.deepEqual(texts(open([fixLogin], [])
      .draw())
      .slice(0, 4), ["BACK-1 · Fix login", "Priority", "P", "Copy"]);
  });

  it("takes the keyboard when it opens", () => {
    const menu = open();
    assert.equal(focuses(menu.draw()), 1);
    menu.cx.elapse();
    assert.equal(focuses(menu.draw()), 2);
  });

  it("shows an entry's choices beside it once the pointer has rested there", () => {
    const menu = open();
    rest(menu, "status");
    assert.deepEqual(host.overlays, []);
    menu.cx.elapse();
    const [page] = host.overlays;
    assert.deepEqual([page.props.part, page.props.page, page.props.parent, page.props.bare],
      ["commands", "status", "menu", true]);
    // No room on the entry's right inside the panel: the page opens on its left
    assert.deepEqual(page.at, { x: 685, y: 294 });
    assert.equal(find(menu.draw(), "entry-status").$.style.bg, "theme.selected");
    assert.equal(host.shared["linear-panel.open"], undefined);
  });

  it("shows only the page of the entry the pointer ends on", () => {
    const menu = open();
    rest(menu, "status");
    rest(menu, "priority");
    menu.cx.elapse();
    assert.deepEqual(host.overlays.map((overlay) => overlay.props.page), ["priority"]);
  });

  it("closes the page showing when the pointer rests on another entry", () => {
    const menu = open();
    rest(menu, "status");
    menu.cx.elapse();
    rest(menu, "copy");
    menu.cx.elapse();
    assert.deepEqual(host.closed, ["overlay-1"]);
    assert.deepEqual([host.overlays[1].props.part, host.overlays[1].props.parent], ["copy-menu", "menu"]);
    rest(menu, "open");
    menu.cx.elapse();
    assert.deepEqual(host.closed, ["overlay-1", "overlay-2"]);
    assert.deepEqual(lit(menu), []);
  });

  it("shows an entry's page at once on a click", () => {
    const menu = open();
    rest(menu, "estimate");
    clickOn(menu, "entry-estimate");
    assert.deepEqual(host.overlays.map((overlay) => overlay.props.page), ["estimate"]);
  });

  it("gives way to a property's choices on its key, which then name the issue and light its row", () => {
    const menu = mount({ part: "issue-menu", issues: [fixLogin], teams: [BACK], me: "me", frame: FRAME,
      origin: { x: 1020, y: 600 }, overlay: "menu" });
    pressKey(menu, "s");
    const [choices] = host.overlays;
    assert.deepEqual(host.closed, ["menu"]);
    // In the menu's place: where the menu opened, pulled up so the taller list stays inside the panel
    assert.deepEqual([choices.props.page, choices.props.parent, choices.props.bare, choices.at],
      ["status", undefined, false, { x: 1020, y: 528 }]);
    assert.deepEqual(host.shared["linear-panel.open"], { issue: "back-1", owner: "overlay-1" });
  });

  it("ignores the key of a property the issue cannot have", () => {
    const menu = open([landingPage], [WEB]);
    pressKey(menu, "e", { shift: true });
    pressKey(menu, "s", { platform: true });
    assert.deepEqual([host.overlays, host.closed], [[], []]);
  });

  it("asks the panel to open the issue in the tracker, and closes with its page", () => {
    const menu = open();
    rest(menu, "status");
    menu.cx.elapse();
    clickOn(menu, "entry-open");
    assert.deepEqual(asked(), { ids: ["back-1"], kind: "open" });
    assert.deepEqual(host.closed, ["overlay-1", "menu"]);
    assert.deepEqual(host.ran, []);
  });

  it("opens an entry's page again when Herdr closed it, as Escape on the page does", () => {
    const menu = open();
    rest(menu, "status");
    clickOn(menu, "entry-status");
    host.shared["linear-panel.popups"] = [];
    clickOn(menu, "entry-status");
    assert.deepEqual(host.overlays.map((overlay) => overlay.props.page), ["status", "status"]);
  });

  it("closes its page with itself when a key makes way for another popup", () => {
    const menu = open();
    rest(menu, "copy");
    clickOn(menu, "entry-copy");
    pressKey(menu, "p");
    assert.deepEqual(host.closed, ["overlay-1", "menu"]);
  });

  it("gives way to the field that asks what the agent should do", () => {
    clickOn(open(), "entry-start");
    assert.deepEqual(host.closed, ["menu"]);
    const [field] = host.overlays;
    assert.deepEqual([field.props.part, field.props.issue.identifier, field.props.agent, field.height],
      ["start", "BACK-1", "Codex", 80]);
  });

  it("is about every issue it is given: what they share, and no opening or starting", () => {
    const menu = open([fixLogin, auditLog, landingPage], [BACK, WEB]);
    assert.deepEqual(texts(menu.draw()), ["3 issues", "Status", "S", "Priority", "P", "Assignee", "A", "Copy"]);
    rest(menu, "priority");
    menu.cx.elapse();
    assert.deepEqual(host.overlays[0].props.targets.map((issue) => issue.identifier), ["BACK-1", "BACK-2", "WEB-7"]);
    rest(menu, "copy");
    menu.cx.elapse();
    assert.deepEqual(host.overlays[1].props.issues.map((issue) => issue.identifier), ["BACK-1", "BACK-2", "WEB-7"]);
    assert.equal(host.overlays[1].height, 8 * 31 + 12);
  });

  it("gives the keyboard back to the panel when Herdr closes it, as Herdr does on Escape", () => {
    const menu = open();
    menu.draw();
    menu.view.close();
    assert.equal(typeof host.shared["linear-panel.keyboard"], "number");
    assert.deepEqual(host.shared["linear-panel.popups"], []);
    assert.throws(() => pressKey(open(), "escape"), /Escape never reaches/);
  });

  it("gives no keyboard back when it only makes way for another popup", () => {
    const menu = open();
    pressKey(menu, "s");
    menu.view.close();
    assert.equal(host.shared["linear-panel.keyboard"], undefined);
  });
});

describe("copy menu", () => {
  const open = (issues = [fixLogin]) => mount({ part: "copy-menu", issues, parent: "menu", overlay: "copies" });

  it("lists what can be copied, with the shortcuts of this platform", () => {
    assert.match(text(open()
      .draw()), /^Copy ID ⌘ \. Copy URL ⌘ ⇧ , .* Copy as prompt ⌘ ⌥ P$/);
    reset({ platform: "linux" });
    assert.match(text(open()
      .draw()), /Copy as prompt Ctrl Alt P$/);
    assert.deepEqual(icons(open()
      .draw())
      .slice(0, 2), ["copy-id", "copy-url"]);
  });

  it("asks the panel for the copy and closes itself and the menu", () => {
    clickOn(open(), "entry-branch");
    assert.deepEqual(asked(), { ids: ["back-1"], kind: "copy", what: "branch" });
    assert.deepEqual(host.closed, ["copies", "menu"]);
  });

  it("copies on an entry's shortcut", () => {
    pressKey(open(), ",", { platform: true, shift: true });
    assert.deepEqual(asked(), { ids: ["back-1"], kind: "copy", what: "url" });
  });
});

describe("copy menu on several issues", () => {
  const open = () => mount({ part: "copy-menu", issues: [fixLogin, auditLog], parent: "menu", overlay: "copies" });

  it("words its entries for several issues and offers no prompt", () => {
    assert.deepEqual(texts(open()
      .draw())
      .filter((piece) => piece.startsWith("Copy")), [
      "Copy IDs", "Copy URLs", "Copy titles", "Copy titles as links", "Copy issues as Markdown",
      "Copy everything as Markdown", "Copy git branch name", "Copy diff links",
    ]);
  });

  it("asks the panel to copy them all", () => {
    const menu = open(), root = menu.draw();
    click(root, find(root, "entry-title"), menu.cx);
    assert.deepEqual(asked(), { ids: ["back-1", "back-2"], kind: "copy", what: "title" });
  });

  it("ignores the shortcut of the entry it does not offer", () => {
    pressKey(open(), "p", { platform: true, alt: true });
    assert.deepEqual([asked(), host.closed], [{}, []]);
  });
});

describe("start prompt", () => {
  const open = () => mount({ part: "start", issue: auditLog, agent: "Codex", overlay: "start" });

  it("puts the keyboard in its field", () => {
    const prompt = open();
    assert.equal(field(prompt.draw()).focused, 1);
    assert.match(text(prompt.draw()), /Start BACK-2 with Codex/);
  });

  it("asks the panel to start with what was typed, on Enter or on its button", () => {
    for (const submit of [(prompt) => field(prompt.draw())
      .submit(prompt.cx), (prompt) => clickOn(prompt, "submit")]) {
      reset();
      const prompt = open();
      field(prompt.draw())
        .type("Keep it small", prompt.cx);
      submit(prompt);
      assert.deepEqual(asked(), { ids: ["back-2"], kind: "start", text: "Keep it small" });
      assert.deepEqual(host.closed, ["start"]);
    }
  });
});

describe("display options", () => {
  const open = () =>
    mount({ part: "display", display: { by: "priority", reversed: false, recency: true, completed: "week" },
      overlay: "display" });

  it("shows the options as they are", () => {
    const root = open()
      .draw();
    assert.deepEqual(texts(root),
      ["Ordering", "Priority", "Order completed by recency", "Completed issues", "Past week"]);
    assert.ok(icons(root)
      .includes("sort-down"));
    assert.equal(find(root, "recency").$.style.bg, "theme.accent");
  });

  it("asks the panel for each change and stays open", () => {
    const options = open();
    clickOn(options, "direction");
    assert.deepEqual(asked(), { kind: "display", ids: [], change: { reversed: true } });
    assert.ok(icons(options.draw())
      .includes("sort-up"));
    clickOn(options, "recency");
    assert.deepEqual(asked().change, { recency: false });
    assert.equal(find(options.draw(), "recency").$.style.bg, "theme.input");
    assert.deepEqual(host.closed, []);
  });

  it("shows a dropdown's choices in place of the popup's content, the current one checked, until one is picked", () => {
    const options = open();
    clickOn(options, "option-completed");
    assert.deepEqual(texts(options.draw()), ["All", "Past day", "Past week", "Past month", "Current cycle", "None"]);
    assert.deepEqual(icons(find(options.draw(), "item-week")), ["check"]);
    clickOn(options, "item-month");
    assert.deepEqual(asked().change, { completed: "month" });
    assert.deepEqual(texts(options.draw())
      .slice(-2), ["Completed issues", "Past month"]);
  });

  it("does not change the panel's own options before the panel is asked", () => {
    const display = { by: "priority", reversed: false, recency: true, completed: "week" };
    const options = mount({ part: "display", display, overlay: "display" });
    clickOn(options, "direction");
    assert.equal(display.reversed, false);
  });
});

describe("team picker", () => {
  it("opens the tracker's composer for the team picked, and closes", async () => {
    const picker = mount({ part: "teams", teams: [{ key: "BACK", name: "Backend" }, { key: "WEB", name: "Website" }],
      overlay: "teams" });
    assert.deepEqual(texts(picker.draw()), ["New issue in…", "BACK", "Backend", "WEB", "Website"]);
    clickOn(picker, "item-WEB");
    await settled();
    assert.deepEqual(asked(), { kind: "compose", ids: [], team: { key: "WEB", name: "Website" } });
    assert.deepEqual([host.closed, host.ran], [["teams"], []]);
  });
});

const commandWindow = (props = {}) =>
  mount({ part: "commands", targets: [fixLogin, auditLog], teams: [BACK], page: "actions", me: "me",
    overlay: "commands", ...props });

describe("command window", () => {
  const open = commandWindow;
  const rows = (commands) => [...walk(commands.draw())].filter((node) => /^command-\d+$/.test(node.$.id ?? ""));
  const labels = (commands) => rows(commands)
    .map((row) => text(row.$.children[1]));
  // What each row shows beside its value: a check when all the issues have it, a dash when only some do
  const marks = (commands) => rows(commands)
    .map((row) => (icons(row)
      .includes("check") ? "all" : texts(row)
      .includes("–") ? "some" : null));
  const lit = (commands) => rows(commands)
    .map((row) => row.$.style.bg === "theme.selected");
  // Escape as the window gets it: through its own binding
  const escape = (commands) => { const root = commands.draw(); send(root, root, "on_action:linear_panel_escape", {},
    commands.cx); };

  it("lists the actions on the issues it names", () => {
    const commands = open();
    assert.deepEqual(labels(commands),
      ["Assign to…", "Un-assign from me", "Change status…", "Change priority…", "Change estimate…",
        "Move to cycle…"]);
    assert.match(text(commands.draw()), /^2 issues Actions/);
  });

  it("says Set where no issue has a value yet, and names a single issue", () => {
    const commands = open({ targets: [{ ...auditLog, priority: 0 }] });
    assert.deepEqual(labels(commands)
      .slice(3), ["Set priority…", "Set estimate…", "Move to cycle…"]);
    assert.match(text(commands.draw()), /^BACK-2 · Add audit log Actions/);
  });

  it("offers no estimate when the teams share none", () => {
    assert.deepEqual(labels(open({ targets: [fixLogin, landingPage], teams: [BACK, WEB] }))
      .at(-1), "Change priority…");
  });

  it("opens a page on its key and comes back to the actions on Escape, then closes", () => {
    const commands = open();
    pressKey(commands, "s");
    assert.deepEqual(labels(commands), ["Backlog", "Todo", "In Progress", "In Review", "Done"]);
    assert.deepEqual([...walk(commands.draw())].find((node) => node.$.kind === "Input").$.args[0].placeholder,
      "Change status…");
    escape(commands);
    assert.match(text(commands.draw()), /^2 issues Actions /);
    assert.deepEqual(host.closed, []);
    escape(commands);
    assert.deepEqual(host.closed, ["commands"]);
  });

  it("binds Escape for itself, in a context only it declares, so the key reaches it before Herdr closes the window",
    () => {
      const commands = open();
      assert.deepEqual(host.bound, [{ keystroke: "escape", action: "linear_panel_escape", context: "IssueCommands" }]);
      assert.equal(commands.draw().$.style.key_context, "IssueCommands");
    });

  it("closes on Escape when it was opened straight at a page", () => {
    const commands = open({ page: "status", compact: true });
    escape(commands);
    assert.deepEqual(host.closed, ["commands"]);
  });

  it("marks the value all the issues have, and the values only some have", () => {
    const commands = open({ page: "status" });
    assert.deepEqual(marks(commands), [null, "some", "some", null, null]);
    assert.deepEqual(icons(find(commands.draw(), "commands-list")),
      ["status-backlog", "status-unstarted", "status-started-4", "status-started-6", "status-completed"]);
    const priorities = open({ targets: [fixLogin], page: "priority" });
    assert.deepEqual(marks(priorities), [null, "all", null, null, null]);
    assert.deepEqual(icons(find(priorities.draw(), "command-1")), ["priority-1", "check"]);
  });

  it("asks for a status on its digit", () => {
    const commands = open({ page: "status" });
    pressKey(commands, "3");
    assert.deepEqual(asked(), { ids: ["back-1", "back-2"], kind: "status", name: "In Progress" });
    assert.deepEqual(host.closed, ["commands"]);
  });

  it("asks for a priority on its digit and for no assignee on i", () => {
    pressKey(open({ page: "priority" }), "0");
    assert.deepEqual(asked(), { ids: ["back-1", "back-2"], kind: "update", input: { priority: 0 } });
    pressKey(open(), "i");
    assert.deepEqual(asked().input, { assigneeId: null });
  });

  it("offers the team's estimates and none, in the scale's words", () => {
    const commands = open({ page: "estimate" });
    assert.deepEqual(labels(commands),
      ["No estimate", "1 Point", "2 Points", "3 Points", "5 Points", "8 Points"]);
    clickOn(commands, "command-0");
    assert.deepEqual(asked().input, { estimate: null });
    clickOn(open({ page: "estimate" }), "command-4");
    assert.deepEqual(asked().input, { estimate: 5 });
  });

  it("moves along the rows with the arrows and runs the one it is on with Enter", () => {
    const commands = open({ page: "priority" });
    pressKey(commands, "up");
    assert.deepEqual(lit(commands), [false, false, false, false, true]);
    pressKey(commands, "down");
    pressKey(commands, "down");
    pressKey(commands, "enter");
    assert.deepEqual(asked().input, { priority: 1 });
  });

  it("starts on no row as a popup, on the first row as the window, and the arrows take it from there", () => {
    const popup = open({ page: "priority", compact: true, bare: true });
    assert.deepEqual(lit(popup), [false, false, false, false, false]);
    pressKey(popup, "enter");
    assert.deepEqual(asked(), {});
    pressKey(popup, "down");
    assert.deepEqual(lit(popup), [true, false, false, false, false]);
    const other = open({ page: "priority", compact: true, bare: true });
    pressKey(other, "up");
    assert.deepEqual(lit(other), [false, false, false, false, true]);
    assert.deepEqual(lit(open()), [true, false, false, false, false, false]);
  });

  it("filters the people by what is typed, and assigns the first on Enter", () => {
    const commands = open({ page: "assign" });
    assert.equal(field(commands.draw()).focused > 0, true);
    assert.deepEqual(labels(commands), ["No assignee", "me", "ada"]);
    assert.deepEqual(marks(commands), ["all", null, null]);
    field(commands.draw())
      .type("love", commands.cx);
    assert.deepEqual(labels(commands), ["ada"]);
    field(commands.draw())
      .submit(commands.cx);
    assert.deepEqual(asked().input, { assigneeId: "ada" });
  });

  it("filters the statuses, priorities and estimates by what is typed, and picks the first on Enter", () => {
    for (const [page, typed, expected] of [["status", "prog", ["In Progress"]], ["priority", "urg", ["Urgent"]],
      ["estimate", "no", ["No estimate"]]]) {
      const commands = open({ page });
      assert.equal(field(commands.draw()).focused > 0, true);
      field(commands.draw())
        .type(typed, commands.cx);
      assert.deepEqual(labels(commands), expected);
    }
  });

  it("still picks a status by its digit, in a page that has a field", () => {
    const commands = open({ page: "status" });
    pressKey(commands, "3");
    assert.equal(asked().name, "In Progress");
  });

  it("takes the letters typed in the assign page as text, not as shortcuts", () => {
    const commands = open({ page: "assign" });
    pressKey(commands, "s");
    assert.deepEqual(labels(commands), ["No assignee", "me", "ada"]);
    field(commands.draw())
      .type("nobody", commands.cx);
    assert.match(text(commands.draw()), /No one matches/);
  });

  it("offers No assignee first, which unassigns, by its 0 key as well as a click", () => {
    const commands = open({ page: "assign" });
    pressKey(commands, "0");
    assert.deepEqual(asked().input, { assigneeId: null });
  });

  it("sets the previous cycle apart at the bottom, under a rule, and picks No cycle with 0", () => {
    const commands = open({ page: "cycle" });
    const drawn = commands.draw();
    const list = find(drawn, "commands-list").$.children;
    // The rule sits between the last cycle to come and the previous one
    const rules = list.map((child, nth) => (child.$.style.h === 1 ? nth : null))
      .filter((nth) => nth !== null);
    assert.deepEqual(rules, [4]);
    pressKey(commands, "0");
    assert.deepEqual(asked().input, { cycleId: null });
  });

  it("shows as many rows as it was given room for, and scrolls past them", () => {
    const commands = open({ page: "cycle", compact: true, bare: true, visible: 3 });
    // Three rows, and the room of the rule above the previous cycle
    assert.equal(find(commands.draw(), "commands-list").$.style.h, 3 * 28 + 9);
    assert.equal(find(commands.draw(), "commands-list").$.style.overflow_y_scrollbar, true);
  });

  it("moves the issues to their team's current cycle or one to come, else the previous one, from its key", () => {
    const commands = open();
    pressKey(commands, "c", { shift: true });
    assert.equal(field(commands.draw()).focused > 0, true);
    const names = labels(commands)
      .map((label) => label.split(" ")
        .slice(0, 2)
        .join(" "));
    assert.deepEqual(names, ["No cycle", "Cycle 12", "Cycle 13", "Cycle 14", "Cycle 11"]);
    // Each cycle's days follow its name, then where it stands, when it has a word
    assert.deepEqual(labels(commands)
      .map((label) => label.match(/ · (\w+)$/)?.[1] ?? null),
    [null, "Current", "Upcoming", null, "Previous"]);
    assert.deepEqual(marks(commands), [null, "all", null, null, null]);
    assert.deepEqual(icons(find(commands.draw(), "commands-list")),
      ["cycle-none", "view-cycle", "check", "cycle", "cycle-future", "cycle-past"]);
    clickOn(commands, "command-2");
    assert.deepEqual(asked(), { ids: ["back-1", "back-2"], kind: "update", input: { cycleId: "cycle-13" } });
    clickOn(open({ page: "cycle" }), "command-0");
    assert.deepEqual(asked().input, { cycleId: null });
  });

  it("filters the cycles by what is typed", () => {
    const commands = open({ page: "cycle" });
    field(commands.draw())
      .type("cycle 13", commands.cx);
    assert.deepEqual(labels(commands)
      .map((label) => label.split(" ")
        .slice(0, 2)
        .join(" ")), ["Cycle 13"]);
    field(commands.draw())
      .type("previous", commands.cx);
    assert.deepEqual(labels(commands)
      .map((label) => label.split(" ")
        .slice(0, 2)
        .join(" ")), ["Cycle 11"]);
    field(commands.draw())
      .type("nothing", commands.cx);
    assert.match(text(commands.draw()), /No cycle matches/);
  });

  it("is as tall as its rows as a popup, and leaves out the issue's name when bare", () => {
    const popup = open({ page: "status", compact: true, bare: true });
    assert.equal(find(popup.draw(), "commands-list").$.style.h, 140);
    assert.doesNotMatch(text(popup.draw()), /2 issues/);
    assert.equal(find(open()
      .draw(), "commands-list").$.style.flex_1, true);
  });

  it("closes the menu it was opened beside when a choice is made", () => {
    clickOn(open({ page: "priority", parent: "menu", compact: true, bare: true }), "command-2");
    assert.deepEqual(host.closed, ["commands", "menu"]);
  });
});

describe("the assignee page in blocks", () => {
  it("sets apart nobody and the assignee, the project's members and the team's, each block by a rule", () => {
    shareProjects({ "project-1": [{ id: "ada", name: "Ada Lovelace", displayName: "ada", initials: "AL",
      avatarBackgroundColor: null }] });
    const inProject = { ...fixLogin, project: { id: "project-1", name: "Payroll" },
      assignee: { id: "me", name: "Me Myself", displayName: "me", initials: "MM", avatarBackgroundColor: null } };
    const commands = mount({ part: "commands", targets: [inProject], teams: [BACK], page: "assign", me: "me",
      compact: true, bare: true, overlay: "commands" });
    const drawn = commands.draw();
    assert.deepEqual(texts(drawn)
      .filter((piece) => ["No assignee", "me", "ada"].includes(piece)),
    ["No assignee", "me", "ada"]);
    const separators = [...walk(drawn)].filter((node) => node.$.style.h === 1);
    // The team's members are both listed already: no third block
    assert.equal(separators.length, 1);
  });
});

describe("a popup list that matches nothing", () => {
  it("keeps the room of its message in every page, whatever the number of blocks", () => {
    for (const page of ["status", "priority", "estimate", "assign", "cycle"]) {
      const commands = commandWindow({ page, compact: true, bare: true });
      field(commands.draw())
        .type("zzzzzz", commands.cx);
      assert.ok(find(commands.draw(), "commands-list").$.style.h >= 28, page);
    }
  });
});

describe("a group's page of labels", () => {
  it("scrolls, with its rows inside a list of its own", () => {
    const labels = [{ id: "g", name: "G", color: "#fff", isGroup: true, parent: null, team: null },
      ...Array.from({ length: 14 }, (_, nth) => ({ id: `c${nth}`, name: `Label ${nth}`, color: "#fff",
        isGroup: false, parent: { id: "g" }, team: null }))];
    const page = mount({ part: "labels", issue: fixLogin, labels, frequent: [], group: "g", parent: "picker",
      list: 310, overlay: "page" });
    assert.equal(find(page.draw(), "label-list").$.style.overflow_y_scrollbar, true);
  });
});

describe("a popup that opens over its control", () => {
  it("is as narrow as when it opens under it: the room of the panel still limits its width", async () => {
    const { openChoices } = await import("../../mods/linear-panel/popups.js");
    const frame = { x: 900, y: 40, width: 200, height: 700 };
    for (const y of [100, 700]) {
      openChoices([fixLogin], [BACK], "status", "me", { below: { x: 920, y, width: 40, height: 20 }, frame });
    }
    const [under, over] = host.overlays;
    assert.equal(over.width, under.width);
    assert.ok(over.width <= 200 - 8);
  });
});

describe("a team without a color", () => {
  it("is drawn in a neutral grey, not an error", async () => {
    const { drawnColor } = await import("../../mods/linear-panel/tracker.js");
    assert.equal(drawnColor(null), "#8a8f98");
  });
});
