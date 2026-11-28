import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { click, find, focuses, hover, icons, press, send, text, texts, walk } from "../host/elements.js";
import { host } from "../host/herdr.js";
import { ask, closed, opened } from "../../mods/linear-panel/channel.js";
import { mountOverlay } from "../host/mount.js";
import { BACK, FRAME, NEXT, WEB, at, clickRow, detail, mr, sampleIssues, settled, startPanel,
  tracker } from "../fixtures.js";

const REQUESTS = "linear-panel.requests";
// Longer than a spinner's shortest turn, shorter than a request's timeout
const SPIN_MS = 1000;
const row = (root, id) => find(root, `issue-${id}`);
const iconOf = (node, name) => [...walk(node)]
  .find((child) => child.$.kind === "svg" && child.$.args[0].endsWith(`/${name}.svg`));
const identifiers = (root) => texts(find(root, "issues"))
  .filter((piece) => /^[A-Z]+-\d+$/.test(piece));
const updates = (server) => server.asked.filter((request) => request.kind === "update")
  .map((request) => request.variables);
// Tells the panel where it is in the window, as the first move of the pointer over it does
function enter(panel) {
  const root = panel.draw();
  send(root, root, "on_mouse_move", at(950, 100), panel.cx);
}
// A click on the element of that id, in a fresh drawing
function clickOn(panel, id, modifiers) {
  const root = panel.draw();
  click(root, find(root, id), panel.cx, modifiers);
}
// A panel that has no key yet: it shows the header (the name of the tracker and Reload) over the setup
async function withoutKey(options) {
  const panel = await startPanel({ ...options, load: false, key: "" });
  panel.draw();
  await panel.cx.idle();
  return panel;
}
// The issues a drag carries: each shows a second time, beside the pointer
const carried = (root) => texts(root)
  .filter((piece, nth, all) => /^[A-Z]+-\d+$/.test(piece) && all.indexOf(piece) < nth);
// What is carried once the pointer has moved on: nothing, unless an issue is still pressed
function carriedOnMove(panel) {
  const root = panel.draw();
  send(root, root, "on_mouse_move", at(950, 300), panel.cx);
  return carried(panel.draw());
}

describe("loading", () => {
  it("asks the address the settings name instead of the tracker's API, for a demo or a test", async () => {
    const stand = await startPanel({ settings: { api: "http://localhost:4747/graphql" } });
    assert.deepEqual([...new Set(stand.server.asked.map((request) => request.url))], ["http://localhost:4747/graphql"]);
    const real = await startPanel();
    assert.deepEqual([...new Set(real.server.asked.map((request) => request.url))], ["https://api.linear.app/graphql"]);
  });

  it("asks for my issues with the stored key, then for the teams of those issues", async () => {
    const { server } = await startPanel();
    assert.deepEqual(server.kinds(), ["issues", "teams"]);
    assert.equal(server.asked[0].url, "https://api.linear.app/graphql");
    assert.equal(server.asked[0].authorization, "test-key");
    assert.deepEqual(server.asked[1].variables, { ids: ["team-back", "team-web"] });
    assert.deepEqual(host.ran[0], {
      command: "sh",
      args: ["-c", 'printf %s "${LINEAR_API_KEY:-$(security find-generic-password -s herdr-linear -w 2>/dev/null)}"'],
      options: {},
    });
  });

  it("asks for the issues completed in the past week by default", async () => {
    const { server } = await startPanel();
    const { cycle, mine } = server.asked[0].variables;
    assert.deepEqual(cycle.and[0], { cycle: { isActive: { eq: true } } });
    assert.deepEqual(Object.keys(mine.or[1]), ["completedAt"]);
  });

  it("counts one issue in the singular", async () => {
    const [only] = sampleIssues();
    const panel = await startPanel({ issues: [only], app: { stored: { totals: "count" } } });
    assert.match(text(panel.draw()), /1 issue(?!s)/);
  });

  it("lists the current cycle's issues by status, with their number", async () => {
    const root = (await startPanel({ app: { stored: { totals: "count" } } })).draw();
    assert.deepEqual(identifiers(root), ["BACK-1", "BACK-2", "BACK-3"]);
    assert.deepEqual(texts(find(root, "issues"))
      .filter((piece) => ["In Progress", "Todo", "Done"].includes(piece)),
    ["In Progress", "Todo", "Done"]);
    assert.match(text(root), /3 issues/);
    assert.doesNotMatch(text(root), /ends 20/);
  });

  it("shows a spinner for the first load, for at least a moment after the answer", async () => {
    const panel = await startPanel({ load: false });
    assert.match(text(panel.draw()), /Loading issues…/);
    assert.ok(icons(panel.draw())
      .includes("spinner"));
    await panel.cx.idle();
    assert.ok(icons(panel.draw())
      .includes("spinner"));
    panel.cx.elapse();
    assert.ok(!icons(panel.draw())
      .includes("spinner"));
  });

  it("shows how to add a key when there is none, and copies the command that stores one", async () => {
    const panel = await startPanel({ load: false, key: "" });
    panel.draw();
    await panel.cx.idle();
    const root = panel.draw();
    assert.match(text(root), /Connect Linear/);
    assert.match(text(root), /Export it as LINEAR_API_KEY/);
    assert.deepEqual([find(root, "view-cycle"), find(root, "new-issue"), find(root, "display-options")],
      [null, null, null]);
    assert.ok(find(root, "reload"));
    click(root, find(root, "copy-command"), panel.cx);
    assert.equal(panel.cx.clipboard, 'security add-generic-password -U -a "$USER" -s herdr-linear -w');
    assert.match(text(panel.draw()), /Copied/);
  });

  it("names the HTTP status of an answer that holds no data", async () => {
    const panel = await startPanel({ load: false });
    host.fetch = async () =>
      ({ ok: false, status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } });
    panel.draw();
    await panel.cx.idle();
    assert.match(text(panel.draw()), /Linear answered 502 with no data/);
  });

  it("shows the API's error in the panel", async () => {
    const panel = await startPanel({ load: false, error: "Rate limited" });
    panel.draw();
    await panel.cx.idle();
    assert.match(text(panel.draw()), /Rate limited/);
    assert.doesNotMatch(text(panel.draw()), /No issues in the current cycle/);
  });

  it("says so when a view holds more issues than it loaded", async () => {
    const panel = await startPanel({ load: false, app: { stored: { totals: "count" } }, more: true });
    panel.draw();
    await panel.cx.idle();
    assert.match(text(panel.draw()), /3\+ issues/);
    assert.match(text(panel.draw()), /Showing the first 100 issues/);
  });

  it("starts its first load without waiting for a drawing", async () => {
    const panel = await startPanel({ load: false });
    await panel.cx.idle();
    assert.deepEqual(panel.server.kinds(), ["issues", "teams"]);
  });

  it("gives up a load that does not answer, says so, and loads again on a reload", async () => {
    const panel = await startPanel({ load: false, app: { fetch: () => new Promise(() => {}) } });
    await panel.cx.idle();
    panel.cx.elapse();
    await panel.cx.idle();
    assert.match(text(panel.draw()), /Linear did not answer in time/);
    assert.ok(!panel.view.part.loader.loading);
    host.fetch = panel.server.fetch;
    clickOn(panel, "reload");
    await panel.cx.idle();
    assert.doesNotMatch(text(panel.draw()), /did not answer/);
    assert.match(text(panel.draw()), /BACK-1/);
  });

  it("starts, and changes its view and display options, when its storage fails", async () => {
    const failing = new Proxy({}, {
      get() { throw new Error("No storage"); },
      set() { throw new Error("Storage full"); },
    });
    const panel = await startPanel({ app: { stored: failing } });
    press(panel.draw(), "2", panel.cx);
    ask({ ids: [], kind: "display", change: { reversed: true } });
    assert.match(text(panel.draw()), /BACK-10/);
  });

  it("asks for the teams again on a reload the person asks for, not on the timer's", async () => {
    const panel = await startPanel();
    const teams = () => panel.server.kinds()
      .filter((kind) => kind === "teams").length;
    panel.cx.tick();
    await panel.cx.idle();
    assert.equal(teams(), 1);
    press(panel.draw(), "r", panel.cx);
    await panel.cx.idle();
    assert.equal(teams(), 2);
    clickOn(panel, "reload");
    await panel.cx.idle();
    assert.equal(teams(), 3);
  });

  it("reloads by itself on the timer while it is shown, without a spinner", async () => {
    const panel = await startPanel();
    panel.cx.elapse();
    panel.cx.tick();
    await panel.cx.idle();
    assert.deepEqual(panel.server.kinds(), ["issues", "teams", "issues"]);
    assert.ok(!icons(panel.draw())
      .includes("spinner"));
  });

  it("does not reload on the timer while another panel shows", async () => {
    const panel = await startPanel();
    host.layout.children[0].children[0].active = "files";
    panel.cx.tick();
    await panel.cx.idle();
    assert.deepEqual(panel.server.kinds(), ["issues", "teams"]);
  });
});

describe("on Linux and Windows", () => {
  const openRow = async (panel, id) => {
    await clickRow(panel, id, { held: { control: true }, wait: false });
    await settled();
    return host.ran.filter((ran) => !["sh", "cmd"].includes(ran.command))
      .map((ran) => [ran.command, ...ran.args]);
  };

  it("reads the key from the variable or the keyring on Linux", async () => {
    const { server } = await startPanel({ app: { platform: "linux" } });
    assert.deepEqual(host.ran[0].args,
      ["-c", 'printf %s "${LINEAR_API_KEY:-$(secret-tool lookup service herdr-linear 2>/dev/null)}"']);
    assert.equal(server.asked[0].authorization, "test-key");
  });

  it("reads the key from the variable on Windows, and takes an unset variable for no key", async () => {
    const { server } = await startPanel({ app: { platform: "windows" } });
    assert.deepEqual([host.ran[0].command, host.ran[0].args], ["cmd", ["/c", "echo", "%LINEAR_API_KEY%"]]);
    assert.equal(server.asked[0].authorization, "test-key");
    const panel = await startPanel({ load: false, app: { platform: "windows" }, key: "" });
    panel.draw();
    await panel.cx.idle();
    assert.match(text(panel.draw()),
      /Set it as LINEAR_API_KEY from a terminal, with your key in place of KEY, then restart Herdr:/);
    assert.match(text(panel.draw()), /setx LINEAR_API_KEY KEY/);
    assert.deepEqual(panel.server.asked, []);
  });

  it("explains the keyring on Linux", async () => {
    const panel = await startPanel({ load: false, app: { platform: "linux" }, key: "" });
    panel.draw();
    await panel.cx.idle();
    assert.match(text(panel.draw()), /store it in your keyring from a terminal/);
    clickOn(panel, "copy-command");
    assert.equal(panel.cx.clipboard, 'secret-tool store --label="Linear API key" service herdr-linear');
    clickOn(panel, "key-page");
    // The tracker's page: its app is tried first
    assert.deepEqual(host.ran.at(-1).args, ["linear://linear.app/settings/account/security"]);
    assert.equal(host.ran.at(-1).command, "xdg-open");
  });

  it("opens an issue with xdg-open on Linux, in the browser when nothing takes the app's address", async () => {
    const panel = await startPanel({ app: { platform: "linux" } });
    host.exec = (command, args) => (command === "xdg-open" && args[0].startsWith("linear://") ? { code: 3 } : {});
    assert.deepEqual(await openRow(panel, "back-1"),
      [["xdg-open", "linear://tracker.test/issue/BACK-1"], ["xdg-open", "https://tracker.test/issue/BACK-1"]]);
  });

  it("opens an issue in the app on Windows when the registry knows the app", async () => {
    const panel = await startPanel({ app: { platform: "windows" } });
    assert.deepEqual(await openRow(panel, "back-1"), [
      ["reg", "query", "HKCR\\linear", "/ve"],
      ["rundll32", "url.dll,FileProtocolHandler", "linear://tracker.test/issue/BACK-1"],
    ]);
  });

  it("opens an issue in the browser on Windows when the app is not installed", async () => {
    const panel = await startPanel({ app: { platform: "windows" } });
    host.exec = (command) => (command === "reg" ? { code: 1 } : {});
    assert.deepEqual((await openRow(panel, "back-1")).at(-1),
      ["rundll32", "url.dll,FileProtocolHandler", "https://tracker.test/issue/BACK-1"]);
  });

  it("opens the tracker itself the same way off macOS, and treats a missing program as a failure", async () => {
    const panel = await withoutKey({ app: { platform: "linux" } });
    host.exec = (command,
      args) => { if (args[0].startsWith("linear://")) throw new Error("spawn xdg-open ENOENT"); return {}; };
    clickOn(panel, "home");
    await settled();
    assert.deepEqual(host.ran.slice(-2)
      .map((ran) => ran.args), [["linear://linear.app/"], ["https://linear.app/"]]);
  });
});

describe("views", () => {
  it("switches to all my issues on a click, and remembers it", async () => {
    const panel = await startPanel();
    clickOn(panel, "view-all");
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "BACK-2", "WEB-7", "BACK-10", "BACK-3"]);
    assert.equal(host.stored.view, "all");
  });

  it("switches on the digit of a view's place", async () => {
    const panel = await startPanel({ app: { stored: { totals: "count" } } });
    press(panel.draw(), "2", panel.cx);
    assert.match(text(panel.draw()), /5 issues/);
    press(panel.draw(), "1", panel.cx);
    assert.match(text(panel.draw()), /3 issues/);
  });

  it("gives each view its icon", async () => {
    const root = (await startPanel()).draw();
    assert.deepEqual([icons(find(root, "view-cycle")), icons(find(root, "view-all"))], [["view-cycle"], ["view-all"]]);
  });

  it("starts on the view it was left on", async () => {
    const panel = await startPanel({ app: { stored: { view: "all", totals: "count" } } });
    assert.match(text(panel.draw()), /5 issues/);
  });
});

describe("rows", () => {
  it("marks an urgent issue in orange until it is finished", async () => {
    const root = (await startPanel()).draw();
    assert.equal(find(root, "priority-back-1").$.style.text_color, "#f2793a");
    assert.equal(find(root, "priority-back-3").$.style.text_color, "theme.muted");
  });

  it("draws each status as the icon of its type, in its own color, on the rows and on the headings", async () => {
    const root = (await startPanel()).draw();
    const marks = [...walk(find(root, "issues"))]
      .filter((node) => node.$.kind === "svg" && node.$.args[0].includes("/status-"));
    assert.deepEqual(marks.map((node) => node.$.args[0].split("/")
      .pop()), [
      "status-started-4.svg", "status-started-4.svg", "status-unstarted.svg", "status-unstarted.svg",
      "status-completed.svg", "status-completed.svg",
    ]);
    assert.ok(iconOf(find(root, "status-back-1"), "status-started-4"));
    assert.equal(find(root, "status-back-1").$.style.text_color, "#started");
  });

  it("opens the priorities from the row's priority mark, as its estimate opens the estimates", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw();
    click(root, find(root, "priority-back-2"), panel.cx, {}, { x: 940, y: 240 });
    const [priorities] = host.overlays;
    assert.deepEqual([priorities.props.page, priorities.props.bare, priorities.props.targets.map((target) => target.id),
      priorities.at],
    ["priority", true, ["back-2"], { x: 940, y: 240 }]);
    assert.deepEqual(carriedOnMove(panel), []);
    assert.deepEqual(updates(panel.server), []);
  });

  it("brightens the priority, the estimate, the fold arrow and the group figure under the pointer, with no background",
    async () => {
      const panel = await startPanel();
      const color = (id) => find(panel.draw(), id).$.style.text_color;
      for (const [id, plain] of [["priority-back-2", "theme.muted"], ["estimate-back-1", "theme.muted"],
        ["fold-back-todo", "theme.dim"], ["total-back-todo", "theme.muted"]]) {
        assert.equal(color(id), plain);
        hover(find(panel.draw(), id), true, panel.cx);
        assert.equal(color(id), "theme.foreground");
        assert.deepEqual([find(panel.draw(), id).$.hover, find(panel.draw(), id).$.style.bg], [null, undefined]);
        hover(find(panel.draw(), id), false, panel.cx);
        assert.equal(color(id), plain);
      }
    });

  it("brightens a row's status under the pointer, in its own color and with no background", async () => {
    const issues = sampleIssues();
    issues[0].state = { ...issues[0].state, color: "#336699" };
    const panel = await startPanel({ issues });
    assert.equal(find(panel.draw(), "status-back-1").$.style.text_color, "#336699");
    hover(find(panel.draw(), "status-back-1"), true, panel.cx);
    const { style, hover: hovered } = find(panel.draw(), "status-back-1").$;
    assert.deepEqual([style.text_color, style.bg, hovered], ["#4387ca", undefined, null]);
  });

  it("draws the tracker's default green as its own app does, on the rows and on the headings", async () => {
    const issues = sampleIssues();
    issues[2].state = { ...issues[2].state, color: "#0f783c" };
    const root = (await startPanel({ issues })).draw();
    const heading = [...walk(find(root, "issues"))]
      .filter((node) => node.$.kind === "svg" && node.$.args[0].endsWith("/status-completed.svg"))[0];
    assert.deepEqual([find(root, "status-back-3").$.style.text_color, heading.$.style.text_color],
      ["#27a644", "#27a644"]);
  });

  it("keeps an urgent mark orange under the pointer, and brightens no mark while a popup is open", async () => {
    const panel = await startPanel();
    hover(find(panel.draw(), "priority-back-1"), true, panel.cx);
    assert.equal(find(panel.draw(), "priority-back-1").$.style.text_color, "#f2793a");
    assert.equal(find(panel.draw(), "priority-back-3").$.style.text_color, "theme.muted");
    host.shared["linear-panel.open"] = { issue: "back-1", owner: "overlay-1" };
    hover(find(panel.draw(), "estimate-back-1"), true, panel.cx);
    assert.equal(find(panel.draw(), "estimate-back-1").$.style.text_color, "theme.muted");
  });

  it("gives every estimate the width of the longest one, each figure centered in it, so triangles and figures line up",
    async () => {
      const issues = sampleIssues();
      issues[0].estimate = 13;
      const root = (await startPanel({ issues, app: { stored: { view: "all" } } })).draw();
      const figures = ["back-1", "back-3", "back-10"].map((id) => find(root, `estimate-${id}`).$.children[1].$.style);
      assert.deepEqual(figures.map((style) => [style.w, style.text_center]), [[14, true], [14, true], [14, true]]);
    });

  it("shows an estimate only on the issues that have one", async () => {
    const root = (await startPanel()).draw();
    assert.equal(text(find(root, "estimate-back-1")), "3");
    assert.equal(find(root, "estimate-back-2"), null);
  });

  it("opens the issue in the tracker's app on a command-click", async () => {
    const panel = await startPanel();
    await clickRow(panel, "back-1", { held: { platform: true } });
    assert.deepEqual(host.ran.at(-1), { command: "open", args: ["linear://tracker.test/issue/BACK-1"], options: {} });
    assert.deepEqual(updates(panel.server), []);
  });

  it("opens the issue in the browser when no app takes it", async () => {
    const panel = await startPanel();
    host.exec = (command, args) => (command === "open" && args[0].startsWith("linear://") ? { code: 1 } : {});
    await clickRow(panel, "back-1", { held: { platform: true }, wait: false });
    await settled();
    assert.deepEqual(host.ran.at(-1).args, ["https://tracker.test/issue/BACK-1"]);
  });

  it("opens the issue's menu on a right-click, inside the panel, and keeps that row lit", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw();
    send(root, row(root, "back-1"), "on_mouse_down:right", at(1250, 700), panel.cx);
    const [menu] = host.overlays;
    // It draws its own box: Herdr's frame is left out
    assert.deepEqual({ mod: menu.mod, kind: menu.kind, frame: menu.frame, width: menu.width, height: menu.height,
      at: menu.at },
    { mod: "linear-panel", kind: "popup", frame: "none", width: 228, height: 304, at: { x: 1072, y: 436 } });
    assert.equal(menu.props.part, "issue-menu");
    assert.deepEqual(menu.props.issues.map((issue) => issue.identifier), ["BACK-1"]);
    assert.deepEqual(menu.props.teams.map((team) => team.id), [BACK.id]);
    assert.deepEqual(menu.props.frame, FRAME);
    assert.equal(focuses(panel.draw()), 1);
    const lit = panel.draw();
    assert.equal(row(lit, "back-1").$.style.bg, "theme.hover");
    hover(row(lit, "back-2"), true, panel.cx);
    assert.equal(row(panel.draw(), "back-2").$.style.bg, undefined);
  });

  it("names in the menu the agent Start will run: the one most picked, or the one the settings name", async () => {
    const menuOf = async (given) => {
      const panel = await startPanel(given);
      const root = panel.draw();
      send(root, row(root, "back-1"), "on_mouse_down:right", at(950, 200), panel.cx);
      return host.overlays[0];
    };
    assert.equal((await menuOf()).props.agent, "Claude Code");
    assert.equal((await menuOf({ settings: { agent: "codex" } })).props.agent, "Codex");
    // No agent: no Start, and a menu shorter by that entry and its rule
    const bare = await menuOf({ app: { agents: [] } });
    assert.deepEqual([bare.props.agent, bare.height], [null, 304 - 31 - 9]);
  });

  it("opens the menu on every ticked issue when one of them is right-clicked, in the order of the list", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    clickOn(panel, "tick-web-7");
    clickOn(panel, "tick-back-1");
    const root = panel.draw();
    send(root, row(root, "web-7"), "on_mouse_down:right", at(950, 300), panel.cx);
    send(root, row(root, "back-2"), "on_mouse_down:right", at(950, 300), panel.cx);
    const [together, alone] = host.overlays;
    assert.deepEqual(together.props.issues.map((issue) => issue.identifier), ["BACK-1", "WEB-7"]);
    assert.deepEqual(together.props.teams.map((team) => team.key), ["BACK", "WEB"]);
    assert.equal(together.height, 4 * 31 + 47);
    assert.deepEqual(alone.props.issues.map((issue) => issue.identifier), ["BACK-2"]);
  });

  it("answers the pointer again once the popup has closed", async () => {
    const panel = await startPanel();
    const root = panel.draw();
    send(root, row(root, "back-1"), "on_mouse_down:right", at(950, 200), panel.cx);
    mountOverlay().view.close();
    hover(row(panel.draw(), "back-2"), true, panel.cx);
    assert.equal(row(panel.draw(), "back-2").$.style.bg, "theme.hover");
  });

  it("takes clicks on a row's status over 24 px, and keeps its 18 px slot", async () => {
    const panel = await startPanel();
    const { style } = find(panel.draw(), "status-back-1").$;
    assert.deepEqual([style.size, style.mx], [24, -3]);
  });

  it("moves one light through the rows with the arrow keys and the pointer, and opens the lit issue on Enter",
    async () => {
      const panel = await startPanel();
      const litRows = () => identifiers(panel.draw())
        .filter((id) => row(panel.draw(), id.toLowerCase()).$.style.bg === "theme.hover");
      press(panel.draw(), "down", panel.cx);
      assert.deepEqual(litRows(), ["BACK-1"]);
      press(panel.draw(), "down", panel.cx);
      press(panel.draw(), "down", panel.cx);
      assert.deepEqual(litRows(), ["BACK-3"]);
      // The group the row is in is brought into view
      assert.equal(panel.view.part.scroll.revealed, 2);
      press(panel.draw(), "up", panel.cx);
      assert.deepEqual(litRows(), ["BACK-2"]);
      const root = panel.draw();
      send(root, row(root, "back-1"), "on_mouse_move", at(950, 200), panel.cx);
      assert.deepEqual(litRows(), ["BACK-1"]);
      press(panel.draw(), "enter", panel.cx);
      assert.equal(panel.view.part.detail?.issue.id, "back-1");
    });

  it("opens the statuses from the row's status mark and the estimates from its estimate, without naming the issue",
    async () => {
      const panel = await startPanel();
      enter(panel);
      const root = panel.draw();
      click(root, find(root, "status-back-1"), panel.cx, {}, { x: 960, y: 210 });
      click(root, find(root, "estimate-back-1"), panel.cx, {}, { x: 960, y: 210 });
      const [statuses, sizes] = host.overlays;
      assert.deepEqual({ ...statuses.props, targets: statuses.props.targets.map((target) => target.id),
        teams: statuses.props.teams.map((team) => team.id) },
      { part: "commands", targets: ["back-1"], teams: ["team-back"], page: "status", me: "me", compact: true,
        bare: true, parent: undefined, visible: 5 });
      assert.deepEqual([statuses.width, statuses.height, statuses.at], [208, 51 + 5 * 31, { x: 960, y: 210 }]);
      assert.deepEqual([sizes.props.page, sizes.height], ["estimate", 51 + 6 * 31]);
    });
});

describe("a property's choices from a row", () => {
  it("open right below the control pressed, and at the pointer on a right-click", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), control = find(root, "estimate-back-1");
    const bounds = { x: 1262, y: 190, width: 30, height: 20 };
    send(root, control, "on_mouse_down:left", { ...at(1270, 200), bounds }, panel.cx);
    send(root, control, "on_click", at(1270, 200), panel.cx);
    const popup = host.overlays.at(-1);
    assert.equal(popup.props.page, "estimate");
    assert.equal(popup.at.y, bounds.y + bounds.height + 6);
    assert.ok(popup.at.x <= bounds.x);
  });
});

describe("folding a group", () => {
  it("hides the issues of a group on its arrow, keeps its heading, and shows them again", async () => {
    const panel = await startPanel();
    assert.deepEqual(icons(find(panel.draw(), "fold-back-todo")), ["caret-down"]);
    clickOn(panel, "fold-back-todo");
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "BACK-3"]);
    assert.match(text(find(panel.draw(), "issues")), /Todo/);
    assert.deepEqual(icons(find(panel.draw(), "fold-back-todo")), ["caret-right"]);
    clickOn(panel, "fold-back-todo");
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "BACK-2", "BACK-3"]);
  });

  it("remembers the folded groups", async () => {
    const panel = await startPanel();
    clickOn(panel, "fold-back-done");
    assert.equal(host.stored.folded, '["Done"]');
    const again = await startPanel({ app: { stored: { folded: '["Done"]' } } });
    assert.deepEqual(identifiers(again.draw()), ["BACK-1", "BACK-2"]);
    const broken = await startPanel({ app: { stored: { folded: "not a list" } } });
    assert.deepEqual(identifiers(broken.draw()), ["BACK-1", "BACK-2", "BACK-3"]);
  });

  it("leaves the issues of a folded group out of a range of ticks", async () => {
    const panel = await startPanel();
    clickOn(panel, "fold-back-todo");
    clickOn(panel, "tick-back-1");
    clickOn(panel, "tick-back-3", { shift: true });
    assert.match(text(panel.draw()), /2 selected/);
  });

  it("still takes a drop on its heading while folded", async () => {
    const panel = await startPanel();
    clickOn(panel, "fold-back-done");
    const root = panel.draw();
    send(root, row(root, "back-2"), "on_mouse_down:left", at(950, 200), panel.cx);
    send(root, root, "on_mouse_move", at(950, 260), panel.cx);
    const heading = [...walk(find(root, "issues"))]
      .find((node) => node.$.handlers["on_mouse_up:left"] && node.$.children.includes(find(root, "fold-back-done")));
    send(root, heading, "on_mouse_up:left", at(950, 400), panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-2"], input: { stateId: "back-done" } }]);
  });
});

describe("ticking", () => {
  it("shows how many issues are ticked and their points, counting the team's default for an unestimated one",
    async () => {
      const panel = await startPanel();
      clickOn(panel, "tick-back-1");
      clickOn(panel, "tick-back-2");
      const root = panel.draw();
      assert.match(text(root), /2 selected · 4 Actions/);
      assert.equal(row(root, "back-1").$.style.bg, "theme.accent");
    });

  it("shows a row's box only under the pointer or when it is ticked, and never moves the row for it", async () => {
    const panel = await startPanel();
    const hidden = (id) => find(panel.draw(), `tick-${id}`).$.style.invisible === true;
    assert.deepEqual([hidden("back-1"), hidden("back-2")], [true, true]);
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    assert.deepEqual([hidden("back-1"), hidden("back-2")], [false, true]);
    // Shown, the box is outlined in gray, in the accent only under the pointer itself, and filled once ticked
    const box = find(panel.draw(), "tick-back-1").$;
    assert.deepEqual([box.style.border_color, box.hover, box.style.bg],
      ["theme.input", { border_color: "theme.accent" }, "theme.background"]);
    clickOn(panel, "tick-back-1");
    hover(row(panel.draw(), "back-1"), false, panel.cx);
    assert.deepEqual([hidden("back-1"), hidden("back-2")], [false, true]);
  });

  it("ticks and unticks the issue under the pointer on x", async () => {
    const panel = await startPanel();
    hover(row(panel.draw(), "back-2"), true, panel.cx);
    press(panel.draw(), "x", panel.cx);
    assert.match(text(panel.draw()), /1 selected/);
    press(panel.draw(), "x", panel.cx);
    assert.equal(find(panel.draw(), "actions"), null);
  });

  it("ticks every issue from the last one ticked to the one under the pointer on Shift+x, across groups", async () => {
    const panel = await startPanel();
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), "x", panel.cx);
    hover(row(panel.draw(), "back-1"), false, panel.cx);
    hover(row(panel.draw(), "back-3"), true, panel.cx);
    press(panel.draw(), "x", panel.cx, { shift: true });
    assert.match(text(panel.draw()), /3 selected/);
  });

  it("starts a new range after Escape: Shift+x then ticks only the issue under the pointer", async () => {
    const panel = await startPanel();
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), "x", panel.cx, { shift: true });
    press(panel.draw(), "escape", panel.cx);
    hover(row(panel.draw(), "back-1"), false, panel.cx);
    hover(row(panel.draw(), "back-3"), true, panel.cx);
    press(panel.draw(), "x", panel.cx, { shift: true });
    assert.match(text(panel.draw()), /1 selected/);
  });

  it("names the box and its key while the pointer is on it, one box at a time", async () => {
    const panel = await startPanel();
    enter(panel);
    const bounds = (y) => ({ ...at(915, y), bounds: { x: 908, y, width: 14, height: 14 } });
    const root = panel.draw();
    send(root, find(root, "tick-back-1"), "on_mouse_move", bounds(150), panel.cx);
    panel.cx.elapse();
    assert.match(text(panel.draw()), /Select issue X$/);
    hover(find(root, "tick-back-1"), false, panel.cx);
    send(root, find(root, "tick-back-2"), "on_mouse_move", bounds(220), panel.cx);
    panel.cx.elapse();
    // The fake app handed the box's bounds to the panel as its own. Told its own again, it can place the tooltip
    enter(panel);
    assert.equal(find(panel.draw(), "tooltip").$.style.top, 220 - FRAME.y + 14 + 6);
  });

  it("draws ticked rows that follow each other as one block, square where they meet", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    clickOn(panel, "tick-back-2");
    const corners = (id) => { const { rounded_t, rounded_b } = row(panel.draw(), id).$.style; return [rounded_t,
      rounded_b]; };
    assert.deepEqual([corners("back-2"), corners("web-7")], [[7, 7], [7, 7]]);
    clickOn(panel, "tick-web-7");
    assert.deepEqual([corners("back-2"), corners("web-7"), corners("back-1")], [[7, 0], [0, 7], [7, 7]]);
  });

  it("ticks every issue between two boxes with Shift, across groups", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    clickOn(panel, "tick-back-3", { shift: true });
    assert.match(text(panel.draw()), /3 selected · 9/);
  });

  it("raises the pill from below: its strip is flat until an issue is ticked, and Herdr animates its height",
    async () => {
      const panel = await startPanel();
      assert.equal(find(panel.draw(), "island").$.style.h, 0);
      clickOn(panel, "tick-back-1");
      const { h, transition } = find(panel.draw(), "island").$.style;
      assert.deepEqual([h, transition], [58, ["height", { duration: 180, easing: "ease-out" }]]);
    });

  it("unticks everything on Escape and from the pill's cross", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    press(panel.draw(), "escape", panel.cx);
    assert.equal(find(panel.draw(), "actions"), null);
    clickOn(panel, "tick-back-1");
    clickOn(panel, "untick");
    assert.equal(find(panel.draw(), "actions"), null);
  });

  it("unticks an issue that left the view, and the issues of a group that is folded", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-2");
    clickOn(panel, "tick-back-3");
    panel.server.issues.find((issue) => issue.id === "back-2").cycle = null;
    press(panel.draw(), "r", panel.cx);
    await panel.cx.idle();
    assert.match(text(panel.draw()), /1 selected/);
    clickOn(panel, "fold-back-done");
    assert.equal(find(panel.draw(), "actions"), null);
  });

  it("drops a tooltip whose control went away", async () => {
    const panel = await startPanel();
    enter(panel);
    clickOn(panel, "tick-back-1");
    const root = panel.draw();
    send(root, find(root, "untick"), "on_mouse_move",
      { ...at(1100, 700), bounds: { x: 1090, y: 690, width: 28, height: 28 } }, panel.cx);
    panel.cx.elapse();
    assert.match(text(panel.draw()), /Clear selected Esc$/);
    press(panel.draw(), "escape", panel.cx);
    assert.doesNotMatch(text(panel.draw()), /Clear selected/);
    // Dropped, not only hidden: the control coming back does not bring it back
    clickOn(panel, "tick-back-1");
    assert.equal(find(panel.draw(), "tooltip"), null);
  });

  it("unticks everything when the view changes", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    press(panel.draw(), "2", panel.cx);
    assert.equal(find(panel.draw(), "actions"), null);
  });

  it("does not start a drag from a box", async () => {
    const panel = await startPanel();
    const root = panel.draw();
    send(root, find(root, "tick-back-1"), "on_mouse_down:left", at(920, 200), panel.cx);
    assert.deepEqual(carriedOnMove(panel), []);
    assert.equal(focuses(panel.draw()), 1);
  });
});

describe("drag and drop", () => {
  // Presses the row of `id`, carries it a little, and brings it over the row of `over`
  function carry(panel, id, over) {
    const root = panel.draw();
    send(root, row(root, id), "on_mouse_down:left", at(950, 200), panel.cx);
    send(root, root, "on_mouse_move", at(950, 260), panel.cx);
    send(root, row(root, over), "on_mouse_move", at(950, 260), panel.cx);
    return panel.draw();
  }
  // The groups outlined in the theme's accent, by name: the one a drag is over
  const outlined = (root) => find(root, "issues").$.children
    .filter((group) => group.$.style.border_color === "theme.accent")
    .map((group) => texts(group)[0]);

  it("carries the issue beside the pointer and fades its row", async () => {
    const panel = await startPanel();
    const root = carry(panel, "back-2", "back-1");
    assert.deepEqual(carried(root), ["BACK-2"]);
    assert.equal(row(root, "back-2").$.style.opacity, 0.5);
    assert.deepEqual(outlined(root), ["In Progress"]);
  });

  it("keeps the carried issue beside the pointer whatever the person's zoom", async () => {
    // The pointer is 50 by 220 window pixels inside the panel: half as much in the pixels of a style at zoom 2
    const zoomed = await startPanel({ app: { settings: { zoom: 2 } } });
    const beside = (root) =>
      [...walk(root)].find((node) => node.$.style.absolute && text(node)
        .includes("BACK-2")).$.style;
    const twice = beside(carry(zoomed, "back-2", "back-1"));
    assert.deepEqual([twice.left, twice.top], [25 + 14, 110 + 10]);
    const once = beside(carry(await startPanel(), "back-2", "back-1"));
    assert.deepEqual([once.left, once.top], [50 + 14, 220 + 10]);
  });

  it("moves the issue to the status it is dropped on, then reloads", async () => {
    const panel = await startPanel();
    const root = carry(panel, "back-2", "back-1");
    send(root, row(root, "back-1"), "on_mouse_up:left", at(950, 260), panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-2"], input: { stateId: "back-doing" } }]);
    assert.deepEqual(panel.server.kinds()
      .slice(-2), ["update", "issues"]);
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "BACK-2", "BACK-3"]);
    assert.deepEqual(carriedOnMove(panel), []);
  });

  it("moves nothing on a command-click on a ticked row, whatever else is ticked", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    clickOn(panel, "tick-back-2");
    await clickRow(panel, "back-1", { held: { platform: true } });
    assert.deepEqual(host.ran.at(-1).args, ["linear://tracker.test/issue/BACK-1"]);
    assert.deepEqual(updates(panel.server), []);
  });

  it("opens the row clicked after a drag whose release was never seen", async () => {
    const panel = await startPanel();
    const root = carry(panel, "back-2", "back-1");
    send(root, row(root, "back-3"), "on_mouse_down:left", at(950, 400), panel.cx);
    send(root, row(root, "back-3"), "on_mouse_up:left", at(950, 400, { platform: true }), panel.cx);
    await panel.cx.idle();
    assert.deepEqual(host.ran.at(-1).args, ["linear://tracker.test/issue/BACK-3"]);
    assert.deepEqual(updates(panel.server), []);
  });

  it("moves every ticked issue with the one dragged", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    clickOn(panel, "tick-back-2");
    const root = carry(panel, "back-2", "back-3");
    assert.match(text(root), /\+1/);
    send(root, row(root, "back-3"), "on_mouse_up:left", at(950, 260), panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-1", "back-2"], input: { stateId: "back-done" } }]);
  });

  it("changes nothing when dropped on its own group", async () => {
    const panel = await startPanel();
    const root = carry(panel, "back-2", "back-2");
    assert.deepEqual(outlined(root), []);
    send(root, row(root, "back-2"), "on_mouse_up:left", at(950, 260), panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), []);
    assert.equal(host.ran.some((ran) => ran.command === "open"), false);
  });

  it("changes nothing when released off the groups or outside the panel", async () => {
    for (const release of ["on_mouse_up:left", "on_mouse_down_out"]) {
      const panel = await startPanel();
      const root = carry(panel, "back-2", "back-1");
      send(root, root, release, at(950, 600), panel.cx);
      await panel.cx.idle();
      assert.deepEqual(updates(panel.server), []);
      assert.deepEqual(carried(panel.draw()), []);
    }
  });

  it("forgets a drag whose release it never saw, at the next press in the panel", async () => {
    const panel = await startPanel();
    const root = carry(panel, "back-2", "back-1");
    send(root, root, "on_mouse_down:left", at(950, 600), panel.cx);
    assert.deepEqual(carriedOnMove(panel), []);
  });
});

describe("keys", () => {
  it("opens one property's choices for the issue under the pointer, where the pointer is", async () => {
    const panel = await startPanel();
    enter(panel);
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), "s", panel.cx);
    const [choices] = host.overlays;
    assert.deepEqual([choices.props.page, choices.props.bare, choices.height, choices.at],
      ["status", false, 51 + 28 + 5 * 31, { x: 950, y: 100 }]);
    assert.deepEqual(host.shared["linear-panel.open"], { issue: "back-1", owner: "overlay-1" });
  });

  it("offers no estimate for an issue whose team does not estimate", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    hover(row(panel.draw(), "web-7"), true, panel.cx);
    press(panel.draw(), "e", panel.cx, { shift: true });
    assert.deepEqual(host.overlays, []);
  });

  it("opens the command window on the ticked issues, at the actions or straight at a property", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-1");
    press(panel.draw(), "k", panel.cx, { platform: true });
    press(panel.draw(), "p", panel.cx);
    const [actions, priorities] = host.overlays;
    assert.deepEqual([actions.kind, actions.width, actions.height, actions.props.page],
      ["dialog", 460, 380, "actions"]);
    assert.deepEqual(actions.props.targets.map((target) => target.identifier), ["BACK-1"]);
    assert.equal(priorities.props.page, "priority");
  });

  it("opens the command window from the pill", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-2");
    clickOn(panel, "actions");
    assert.equal(host.overlays[0].props.page, "actions");
  });

  it("opens no command window when nothing is ticked", async () => {
    const panel = await startPanel();
    press(panel.draw(), "k", panel.cx, { platform: true });
    assert.deepEqual(host.overlays, []);
  });

  it("does not act on an issue the pointer was on in another view", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    hover(row(panel.draw(), "web-7"), true, panel.cx);
    press(panel.draw(), "1", panel.cx);
    press(panel.draw(), "i", panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), []);
  });

  it("opens no page for a property the ticked issues cannot be given", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    clickOn(panel, "tick-web-7");
    press(panel.draw(), "e", panel.cx, { shift: true });
    assert.deepEqual(host.overlays, []);
    press(panel.draw(), "p", panel.cx);
    assert.equal(host.overlays[0].props.page, "priority");
  });

  it("unassigns the issue under the pointer on i", async () => {
    const panel = await startPanel();
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), "i", panel.cx);
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-1"], input: { assigneeId: null } }]);
  });

  it("copies the issue under the pointer on a copy shortcut, without reloading", async () => {
    const panel = await startPanel();
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), ".", panel.cx, { platform: true, shift: true });
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard, "me/back-1");
    assert.deepEqual(host.notes, [{ title: "Copied git branch name · BACK-1", timeout: 1500 }]);
    assert.deepEqual(panel.server.kinds(), ["issues", "teams"]);
  });

  it("copies every ticked issue on a copy shortcut, from the top of the list down, whatever the pointer is on",
    async () => {
      const panel = await startPanel();
      clickOn(panel, "tick-back-3");
      clickOn(panel, "tick-back-1");
      hover(row(panel.draw(), "back-2"), true, panel.cx);
      press(panel.draw(), "'", panel.cx, { platform: true, shift: true });
      await panel.cx.idle();
      assert.equal(panel.cx.clipboard, "BACK-1: Fix login\nBACK-3: Old bug");
      assert.deepEqual(host.notes, [{ title: "Copied titles · 2 issues", timeout: 1500 }]);
    });

  it("copies nothing on the prompt shortcut while several issues are ticked", async () => {
    const panel = await startPanel();
    clickOn(panel, "tick-back-3");
    clickOn(panel, "tick-back-1");
    press(panel.draw(), "p", panel.cx, { platform: true, alt: true });
    await panel.cx.idle();
    assert.deepEqual([panel.cx.clipboard, host.notes], [null, []]);
  });

  it("reloads on r, with a spinner", async () => {
    const panel = await startPanel();
    panel.cx.elapse();
    press(panel.draw(), "r", panel.cx);
    assert.ok(icons(panel.draw())
      .includes("spinner"));
    await panel.cx.idle();
    assert.deepEqual(panel.server.kinds(), ["issues", "teams", "issues", "teams"]);
  });

  it("asks which team a new issue is for on c, among my teams", async () => {
    const panel = await startPanel();
    press(panel.draw(), "c", panel.cx);
    const [picker] = host.overlays;
    assert.deepEqual(picker.props.teams.map(({ key, name }) => ({ key, name })),
      [{ key: "BACK", name: "Backend" }, { key: "WEB", name: "Website" }]);
    assert.equal(picker.props.issue, undefined);
    assert.deepEqual([picker.width, picker.height, picker.at], [200, 100, "pointer"]);
  });

  it("opens the tracker's composer at once when I have one team", async () => {
    const panel = await startPanel({ myTeams: [WEB] });
    clickOn(panel, "new-issue");
    assert.deepEqual(host.ran.at(-1).args, ["linear://linear.app/team/WEB/new?assignee=me"]);
    assert.deepEqual(host.overlays, []);
  });

  it("takes the keyboard back when its popup goes, several times over, and keeps its focused look meanwhile",
    async () => {
      const panel = await startPanel();
      assert.equal(panel.draw().$.style.border_color, "theme.border");
      hover(row(panel.draw(), "back-1"), true, panel.cx);
      press(panel.draw(), "p", panel.cx);
      const popup = mountOverlay(), before = focuses(panel.draw());
      assert.equal(panel.draw().$.style.border_color, "theme.accent");
      popup.view.close();
      assert.equal(panel.draw().$.style.border_color, "theme.accent");
      assert.equal(focuses(panel.draw()), before);
      panel.cx.elapse();
      assert.equal(focuses(panel.draw()), before + 4);
      assert.equal(panel.draw().$.style.border_color, "theme.border");
    });

  it("takes the keyboard back for the next popup too", async () => {
    const panel = await startPanel();
    for (const key of ["p", "s"]) {
      hover(row(panel.draw(), "back-1"), true, panel.cx);
      press(panel.draw(), key, panel.cx);
      const popup = mountOverlay(), before = focuses(panel.draw());
      popup.view.close();
      panel.draw();
      panel.cx.elapse();
      assert.equal(focuses(panel.draw()), before + 4);
    }
  });

  it("leaves the keyboard alone when a popup goes while its menu is still open", async () => {
    const panel = await startPanel();
    const root = panel.draw();
    send(root, row(root, "back-1"), "on_mouse_down:right", at(950, 200), panel.cx);
    const menu = mountOverlay(), before = focuses(panel.draw());
    host.overlays.push({ id: "overlay-2", props: { part: "copy-menu", issues: [], parent: menu.overlay.id } });
    const page = mountOverlay();
    page.view.close();
    panel.draw();
    panel.cx.elapse();
    assert.equal(focuses(panel.draw()), before);
  });

  it("does not take the keyboard for a popup that went before it started", async () => {
    const panel = await startPanel({ app: { shared: { "linear-panel.keyboard": 99 } } });
    const before = focuses(panel.draw());
    panel.draw();
    panel.cx.elapse();
    assert.equal(focuses(panel.draw()), before);
  });

  it("takes no key while it waits for an API key", async () => {
    const panel = await startPanel({ load: false, key: "" });
    panel.draw();
    await panel.cx.idle();
    press(panel.draw(), "c", panel.cx);
    assert.equal(panel.cx.stopped, false);
    assert.deepEqual(host.overlays, []);
  });
});

describe("header", () => {
  it("is only there while the key is being set up, and the list starts at the top of the panel", async () => {
    assert.equal(find((await startPanel()).draw(), "home"), null);
    assert.notEqual(find((await withoutKey()).draw(), "home"), null);
  });

  it("brings the tracker's app to the front from its name, its site when the app is missing", async () => {
    const panel = await withoutKey();
    host.exec = (command, args) => (args[0] === "-a" ? { code: 1 } : {});
    clickOn(panel, "home");
    await settled();
    assert.deepEqual(host.ran.slice(-2)
      .map((ran) => ran.args), [["-a", "Linear"], ["https://linear.app/"]]);
  });

  it("shows the tracker's logo before its name, as a picture", async () => {
    const panel = await withoutKey();
    const [picture, name] = find(panel.draw(), "home").$.children;
    assert.deepEqual([picture.$.kind, picture.$.args[0], name],
      ["image", "mods/linear-panel/brand/logo-light.svg", "Linear"]);
  });

  it("opens the display options with what the list shows now, under the header by the panel's right edge", async () => {
    const panel = await startPanel();
    enter(panel);
    clickOn(panel, "display-options");
    const [options] = host.overlays;
    assert.deepEqual(options.props,
      { part: "display", display: { by: "priority", reversed: false, recency: true, completed: "week" } });
    assert.deepEqual([options.width, options.height, options.at], [280, 138, { x: 1012, y: 86 }]);
  });

  it("opens the display options on Shift+V, in the same place", async () => {
    const panel = await startPanel();
    enter(panel);
    press(panel.draw(), "v", panel.cx, { shift: true });
    assert.deepEqual([host.overlays[0].props.part, host.overlays[0].at], ["display", { x: 1012, y: 86 }]);
  });

  it("shows a control's name and shortcut while the pointer is on it", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), reload = find(root, "reload");
    send(root, reload, "on_mouse_move", { ...at(1270, 60), bounds: { x: 1260, y: 48, width: 26, height: 26 } },
      panel.cx);
    assert.doesNotMatch(text(panel.draw()), /Reload R$/);
    assert.equal(panel.cx.timers.at(-1).ms, 1000);
    panel.cx.elapse();
    assert.match(text(panel.draw()), /Reload R$/);
    hover(reload, false, panel.cx);
    assert.doesNotMatch(text(panel.draw()), /Reload R$/);
  });

  it("centers a tooltip under its control, and holds it against the panel's edge near one", async () => {
    const panel = await startPanel();
    enter(panel);
    const rest = (id, bounds) => {
      const root = panel.draw();
      send(root, find(root, id), "on_mouse_move", { ...at(bounds.x, bounds.y), bounds }, panel.cx);
      // The fake app hands one event, with the control's bounds, to every element around it: the panel is told its
      // own again
      enter(panel);
      panel.cx.elapse();
      return find(panel.draw(), "tooltip");
    };
    // In the middle of the panel: a row as wide as the nearer edge allows on each side, the tooltip in its middle
    const centered = rest("view-all", { x: 1070, y: 90, width: 60, height: 28 });
    assert.deepEqual([centered.$.style.left, centered.$.style.w, centered.$.style.justify_center, centered.$.style.top],
      [0, 400, true, 84]);
    assert.equal(text(centered), "My issues 2");
    hover(find(panel.draw(), "view-all"), false, panel.cx);
    // By the right edge: against it
    const held = rest("reload", { x: 1260, y: 48, width: 26, height: 26 });
    assert.deepEqual([held.$.style.right, held.$.style.left, held.$.style.top, text(held)],
      [4, undefined, 40, "Reload R"]);
  });

  it("places a tooltip, a popup and the display options by the person's zoom", async () => {
    // At zoom 2 the panel takes the same window pixels and every length of a style counts double
    const panel = await startPanel({ app: { settings: { zoom: 2 } } });
    enter(panel);
    const root = panel.draw();
    send(root, find(root, "reload"), "on_mouse_move",
      { ...at(1270, 60), bounds: { x: 1260, y: 48, width: 26, height: 26 } }, panel.cx);
    enter(panel);
    panel.cx.elapse();
    // 8 window pixels under the panel's top, 26 high, 6 of a style under it: (8 + 26) / 2 + 6
    const tooltip = find(panel.draw(), "tooltip");
    assert.deepEqual([tooltip.$.style.right, tooltip.$.style.top], [4, 23]);
    // The issue menu takes 456 by 608 window pixels: pulled back to the panel's left edge, and up from its bottom
    const drawn = panel.draw();
    send(drawn, row(drawn, "back-1"), "on_mouse_down:right", at(1250, 700), panel.cx);
    assert.deepEqual(host.overlays[0].at, { x: 900, y: 132 });
    // The display options: 92 window pixels under the panel's top for the 42 of the header and the 4 kept
    press(panel.draw(), "v", panel.cx, { shift: true });
    assert.deepEqual(host.overlays[1].at, { x: 900, y: 132 });
  });

  it("waits a second for the first tooltip, then shows the next at once while hovering things in turn", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const panel = await startPanel();
    enter(panel);
    const rest = (id) => {
      const root = panel.draw(), bounds = { x: 1090, y: 190, width: 18, height: 18 };
      send(root, find(root, id), "on_mouse_move", { ...at(1100, 200), bounds }, panel.cx);
      enter(panel);
    };
    const leave = (id) => hover(find(panel.draw(), id), false, panel.cx);
    const shown = () => text(find(panel.draw(), "tooltip") ?? "");
    rest("priority-back-1");
    assert.equal(shown(), "");
    panel.cx.elapse();
    assert.equal(shown(), "Change priority P");
    // To the next control: no second wait, and no timer to wait for
    leave("priority-back-1");
    rest("priority-back-2");
    assert.equal(shown(), "Change priority P");
    assert.deepEqual(panel.cx.timers.filter((timer) => timer.ms === 1000), []);
    // Rested too long between two controls (past half a second): the second is waited again
    leave("priority-back-2");
    t.mock.timers.tick(600);
    rest("priority-back-1");
    assert.equal(shown(), "");
    panel.cx.elapse();
    assert.equal(shown(), "Change priority P");
  });

  it("shows no tooltip on a control that was pressed, until the pointer has left it", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), bounds = { x: 1090, y: 190, width: 18, height: 18 };
    const control = find(root, "priority-back-1");
    send(root, control, "on_mouse_down:left", at(1100, 200), panel.cx);
    send(root, control, "on_mouse_move", { ...at(1100, 200), bounds }, panel.cx);
    panel.cx.elapse();
    assert.equal(find(panel.draw(), "tooltip"), null);
    hover(find(panel.draw(), "priority-back-1"), false, panel.cx);
    send(root, control, "on_mouse_move", { ...at(1100, 200), bounds }, panel.cx);
    panel.cx.elapse();
    assert.notEqual(find(panel.draw(), "tooltip"), null);
  });

  it("keeps a pressed control's tooltip away while a popup covers it, and after the popup goes", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), bounds = { x: 1090, y: 190, width: 18, height: 18 };
    const control = find(root, "priority-back-1");
    send(root, control, "on_mouse_down:left", at(1100, 200), panel.cx);
    opened("menu");
    // The popup opens over the control, which is told the pointer left it
    hover(control, false, panel.cx);
    closed("menu");
    send(root, control, "on_mouse_move", { ...at(1100, 200), bounds }, panel.cx);
    panel.cx.elapse();
    assert.equal(find(panel.draw(), "tooltip"), null);
  });

  it("names what a click on a row's estimate does, and its keys", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw();
    send(root, find(root, "estimate-back-1"), "on_mouse_move",
      { ...at(1280, 200), bounds: { x: 1262, y: 190, width: 30, height: 20 } }, panel.cx);
    panel.cx.elapse();
    assert.equal(text(find(panel.draw(), "tooltip")), "Change estimate ⇧ E");
  });

  it("shows an issue's cycle, opens its page on a click and its choices on a right-click", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    enter(panel);
    const root = panel.draw();
    assert.equal(text(find(root, "cycle-back-1")), "12");
    assert.equal(iconOf(find(root, "cycle-back-1"), "view-cycle").$.style.text_color, "#5e6ad2");
    assert.equal(find(root, "cycle-web-7"), null);
    // A right-click on it opens the cycle's choices, not the issue's menu
    const bounds = { x: 1225, y: 190, width: 34, height: 20 };
    send(root, find(root, "cycle-back-1"), "on_mouse_down:right", { ...at(1250, 200), bounds }, panel.cx);
    assert.deepEqual(host.overlays.map(({ props }) => [props.part, props.page, props.bare, props.targets[0].id]),
      [["commands", "cycle", true, "back-1"]]);
    assert.equal(host.overlays[0].at.y, bounds.y + bounds.height + 6);
    clickOn(panel, "cycle-back-2");
    assert.deepEqual(host.ran.at(-1),
      { command: "open", args: ["linear://linear.app/team/BACK/cycle/12"], options: {} });
    assert.equal(host.overlays.length, 1);
    // Its rows, and a rule above the previous cycle at the bottom
    assert.equal(host.overlays[0].height, 51 + 5 * 31 + 9);
  });

  it("tells on a row's cycle its capacity, how much is done, the weekdays left", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw();
    send(root, find(root, "cycle-back-1"), "on_mouse_move",
      { ...at(1240, 200), bounds: { x: 1225, y: 190, width: 34, height: 20 } }, panel.cx);
    panel.cx.elapse();
    const tooltip = find(panel.draw(), "tooltip");
    // The card alone: no label, no keys, no rule under it
    assert.match(text(tooltip), /^Cycle 12 Capacity: 20 pts 70% of 10 Current \d+ weekdays? left$/);
    assert.deepEqual(icons(tooltip), ["view-cycle", "status-started-6"]);
  });

  it("tells on a cycle to come the points planned in it, asked of the tracker, and its days", async () => {
    const issues = sampleIssues();
    // BACK-2 has no estimate: it counts for the team's default, 1
    for (const id of ["back-2", "back-10"]) issues.find((issue) => issue.id === id).cycle = NEXT;
    const panel = await startPanel({ issues, app: { stored: { view: "all" } } });
    enter(panel);
    const root = panel.draw(), mark = find(root, "cycle-back-2");
    hover(mark, true, panel.cx);
    send(root, mark, "on_mouse_move", { ...at(1240, 200), bounds: { x: 1225, y: 190, width: 34, height: 20 } },
      panel.cx);
    await panel.cx.idle();
    panel.cx.elapse();
    const tooltip = find(panel.draw(), "tooltip");
    assert.match(text(tooltip), /^Cycle 13 3 Upcoming \w{3} \d+ - \w{3} \d+$/);
    assert.deepEqual(icons(tooltip), ["cycle", "estimate"]);
    assert.deepEqual(panel.server.kinds()
      .filter((kind) => kind === "planned"), ["planned"]);
  });

  // BACK-1 has one merged MR, BACK-2 a merged one and an open one
  const FRONT = mr("gitlab", "worklife-io/nuxt-frontend", 3463, "merged"),
    IAM = mr("gitlab", "worklife-io/iam", 599, "merged"), PHOENIX = mr("github", "WorklifeCare/phoenix", 47, "open");
  function withMerges() {
    const issues = sampleIssues();
    issues[0].attachments.nodes = [FRONT];
    issues[1].attachments.nodes = [IAM, PHOENIX];
    return issues;
  }
  const colors = (node) => [...walk(node)].filter((child) => child.$.kind === "svg")
    .map((child) => child.$.style.text_color);

  it("shows an issue's MRs left of its cycle, colored by whether they are merged", async () => {
    const panel = await startPanel({ issues: withMerges(), app: { stored: { view: "all" } } });
    const root = panel.draw();
    assert.equal(text(find(root, "merges-back-1")), "!3463");
    assert.deepEqual(colors(find(root, "merges-back-1")), ["#5e6ad2"]);
    // Some merged, some not: the icon is half blue, half green
    assert.equal(text(find(root, "merges-back-2")), "2 PRs");
    assert.deepEqual(colors(find(root, "merges-back-2")), ["#5e6ad2", "#4cb782"]);
    assert.deepEqual(icons(find(root, "merges-back-2")), ["git-pull-request", "git-pull-request"]);
    const ids = [...walk(row(root, "back-1"))].map((node) => node.$.id);
    assert.ok(ids.indexOf("merges-back-1") < ids.indexOf("cycle-back-1"));
    assert.equal(find(root, "merges-web-7"), null);
  });

  it("opens every MR of an issue in the browser on a click on its chip, and nothing else", async () => {
    const panel = await startPanel({ issues: withMerges(), app: { stored: { view: "all" } } });
    clickOn(panel, "merges-back-2");
    await settled();
    assert.deepEqual(host.ran.slice(-2), [IAM, PHOENIX]
      .map(({ metadata }) => ({ command: "open", args: [metadata.url], options: {} })));
    assert.equal(host.ran.some((ran) => ran.args[0]?.startsWith("linear://")), false);
    assert.equal(host.overlays.length, 0);
  });

  it("does nothing on a right-click on an issue's MRs: no issue menu", async () => {
    const panel = await startPanel({ issues: withMerges() });
    enter(panel);
    const root = panel.draw();
    send(root, find(root, "merges-back-1"), "on_mouse_down:right", at(1200, 200), panel.cx);
    assert.equal(host.overlays.length, 0);
  });

  it("asks the tracker for an issue's MR details when the pointer comes on its chip, once per load", async () => {
    const panel = await startPanel({ issues: withMerges() });
    const point = () => hover(find(panel.draw(), "merges-back-2"), true, panel.cx);
    point();
    await panel.cx.idle();
    point();
    await panel.cx.idle();
    const asked = () => panel.server.asked.filter((request) => request.kind === "merges");
    // By number and repository: numbers alone match the MRs of many other repositories
    assert.deepEqual(asked()
      .map((request) => request.variables), [{ numbers: [599, 47], repos: ["iam", "phoenix"] }]);
    // A load tells its answers from older ones by the time: let a millisecond pass
    await wait(2);
    press(panel.draw(), "r", panel.cx);
    await panel.cx.idle();
    point();
    await panel.cx.idle();
    assert.equal(asked().length, 2);
  });

  // The tooltip of a row's MRs, once the tracker has answered unless `waiting`
  async function mergeCard(panel, id, { waiting = false } = {}) {
    enter(panel);
    const root = panel.draw(), mark = find(root, `merges-${id}`);
    hover(mark, true, panel.cx);
    send(root, mark, "on_mouse_move", { ...at(1200, 200), bounds: { x: 1180, y: 190, width: 50, height: 20 } },
      panel.cx);
    if (!waiting) await panel.cx.idle();
    panel.cx.elapse();
    return find(panel.draw(), "tooltip");
  }

  it("tells on one MR its title, author, repository, when it was merged, its changes and its reviewers", async () => {
    const panel = await startPanel({ issues: withMerges() });
    panel.server.details = [detail(FRONT.metadata.url)];
    const card = await mergeCard(panel, "back-1");
    assert.match(text(card), /^Change 3463 BE nuxt-frontend!3463 Merged \d+\w+ ago · 6 files \+41 -4 KO$/);
    // The merged icon, then the check of a reviewer who approved
    assert.deepEqual(icons(card), ["git-merge", "check"]);
  });

  it("tells on one MR that its changes are coming while the tracker has not answered, and nothing if it fails",
    async () => {
      const panel = await startPanel({ issues: withMerges() });
      assert.match(text(await mergeCard(panel, "back-1", { waiting: true })), /Merged \d+\w+ ago · …$/);
      const failing = await startPanel({ issues: withMerges() });
      failing.server.error = "Cannot query field \"pullRequests\"";
      assert.match(text(await mergeCard(failing, "back-1")), /Merged \d+\w+ ago$/);
      // The query is not one the tracker documents: its failure is no failure of the panel's
      assert.doesNotMatch(text(failing.draw()), /Could not load/);
    });

  it("tells on several MRs each one's title, repository and reviewers, eight at most", async () => {
    const issues = withMerges();
    issues[1].attachments.nodes.push(mr("gitlab", "worklife-io/graphql", 1300, "inReview"));
    const panel = await startPanel({ issues });
    const decided = (name) => ({ lastSubmittedDecision: "commented", reviewer: { displayName: name } });
    panel.server.details = [
      detail(PHOENIX.metadata.url, { reviewerStates: [decided("Codex"), decided("Claude"),
        { lastSubmittedDecision: null, reviewer: { displayName: "fx" } }] }),
      detail(IAM.metadata.url, { reviewerStates: [decided("amalchaker")] }),
      // Another repository's MR with the same number: not this issue's
      detail("https://gitlab.com/worklife-io/other/-/merge_requests/47", { reviewerStates: [decided("nobody")] }),
    ];
    const card = await mergeCard(panel, "back-2");
    assert.equal(text(card), "Change 599 BE worklife-io/iam!599 · Reviewed by amalchaker "
      + "Change 47 BE WorklifeCare/phoenix#47 · Reviewed by Codex and Claude Change 1300 BE worklife-io/graphql!1300");
    assert.deepEqual(icons(card), ["git-merge", "git-pull-request", "git-pull-request"]);
    issues[1].attachments.nodes.push(
      ...[1, 2, 3, 4, 5, 6].map((number) => mr("gitlab", "worklife-io/iam", number, "open")));
    await wait(2);
    press(panel.draw(), "r", panel.cx);
    await panel.cx.idle();
    hover(find(panel.draw(), "merges-back-2"), false, panel.cx);
    assert.match(text(await mergeCard(panel, "back-2")), / 1 more$/);
  });

  it("keeps what the tracker tells of MRs when some of it comes incomplete, and only submitted reviews", async () => {
    const panel = await startPanel({ issues: withMerges() });
    panel.server.details = [
      detail(IAM.metadata.url, { diffStats: null }),
      detail(PHOENIX.metadata.url, { reviewerStates: [
        { lastSubmittedDecision: "pending", reviewer: { displayName: "drafting" } },
        { lastSubmittedDecision: "approved", reviewer: null },
        { lastSubmittedDecision: "commented", reviewer: { displayName: "Codex" } },
      ] }),
    ];
    const card = await mergeCard(panel, "back-2");
    assert.equal(text(card),
      "Change 599 BE worklife-io/iam!599 Change 47 BE WorklifeCare/phoenix#47 · Reviewed by Codex");
  });

  it("names what a click on a row's priority does, and its key", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), bounds = { x: 930, y: 193, width: 14, height: 14 };
    send(root, find(root, "priority-back-1"), "on_mouse_move", { ...at(937, 200), bounds }, panel.cx);
    panel.cx.elapse();
    assert.equal(text(find(panel.draw(), "tooltip")), "Change priority P");
  });

  it("tells on a row's status how long the issue has been in each status, asked of the tracker once", async () => {
    const panel = await startPanel();
    const state = (name) => BACK.states.find((candidate) => candidate.name === name);
    const ago = (hours) => new Date(Date.now() - hours * 3_600_000)
      .toISOString();
    panel.server.history = [
      { state: state("In Progress"), startedAt: ago(73), endedAt: null },
      { state: state("Todo"), startedAt: ago(75), endedAt: ago(73) },
    ];
    enter(panel);
    const visit = () => {
      const root = panel.draw(), mark = find(root, "status-back-1");
      hover(mark, true, panel.cx);
      send(root, mark, "on_mouse_move", { ...at(1000, 200), bounds: { x: 1090, y: 190, width: 18, height: 18 } },
        panel.cx);
      enter(panel);
      return mark;
    };
    const mark = visit();
    await panel.cx.idle();
    panel.cx.elapse();
    const tooltip = find(panel.draw(), "tooltip"), [tip] = tooltip.$.children;
    assert.equal(text(tip), "Time in status Todo 2h In Progress 3d Change status S");
    // Centered on the status, under it: the panel has room there for its title, two statuses and last line
    assert.deepEqual([tooltip.$.style.left, tooltip.$.style.w, tooltip.$.style.top], [0, 398, 174]);
    // The status the issue is in stands out from those it left
    const [, left, current] = tip.$.children[0].$.children;
    assert.deepEqual([left.$.style.text_color, current.$.style.text_color], ["theme.muted", "theme.foreground"]);
    hover(mark, false, panel.cx);
    visit();
    await panel.cx.idle();
    assert.equal(panel.server.kinds()
      .filter((kind) => kind === "history").length, 1);
  });

  it("shows a status tooltip without the times while the tracker has not answered, or cannot", async () => {
    const panel = await startPanel();
    enter(panel);
    panel.server.error = "No history";
    const root = panel.draw(), mark = find(root, "status-back-1");
    hover(mark, true, panel.cx);
    send(root, mark, "on_mouse_move", { ...at(1000, 200), bounds: { x: 990, y: 190, width: 18, height: 18 } },
      panel.cx);
    await panel.cx.idle();
    panel.cx.elapse();
    assert.equal(text(find(panel.draw(), "tooltip")), "Change status S");
  });

  it("shows no tooltip when the pointer leaves before a second, even if it comes back", async () => {
    const panel = await startPanel();
    enter(panel);
    const root = panel.draw(), reload = find(root, "reload");
    const move = () =>
      send(root, reload, "on_mouse_move", { ...at(1270, 60), bounds: { x: 1260, y: 48, width: 26, height: 26 } },
        panel.cx);
    move();
    hover(reload, false, panel.cx);
    panel.cx.elapse();
    assert.doesNotMatch(text(panel.draw()), /Reload R$/);
    // Back on it: the wait starts over, and the timer of the first visit shows nothing
    move();
    const [first] = panel.cx.timers.filter((timer) => timer.ms === 1000);
    hover(reload, false, panel.cx);
    move();
    first.run(panel.cx);
    assert.doesNotMatch(text(panel.draw()), /Reload R$/);
    panel.cx.elapse();
    assert.match(text(panel.draw()), /Reload R$/);
  });

  it("switches every group's figure between points and number of issues, and remembers it", async () => {
    const panel = await startPanel();
    assert.equal(text(find(panel.draw(), "total-back-todo")), "1");
    assert.ok(iconOf(find(panel.draw(), "total-back-doing"), "estimate"));
    clickOn(panel, "total-back-doing");
    assert.equal(text(find(panel.draw(), "total-back-done")), "1");
    assert.equal(iconOf(find(panel.draw(), "total-back-doing"), "estimate"), undefined);
    assert.equal(host.stored.totals, "count");
  });

  it("says which completed issues show beside the completed group", async () => {
    const panel = await startPanel();
    assert.match(text(panel.draw()), /Showing issues completed in the past week · Recent first/);
  });
});

describe("a popup and the panel together", () => {
  it("changes a status from the keyboard: the key on a row, a digit in the popup, the update, the reload", async () => {
    const panel = await startPanel();
    enter(panel);
    hover(row(panel.draw(), "back-2"), true, panel.cx);
    press(panel.draw(), "s", panel.cx);
    const popup = mountOverlay();
    press(popup.draw(), "3", popup.cx);
    popup.view.close();
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-2"], input: { stateId: "back-doing" } }]);
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "BACK-2", "BACK-3"]);
    assert.deepEqual(host.closed, ["overlay-1"]);
  });

  it("opens each popup as tall as what its part draws", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    enter(panel);
    const drawn = (popup, pattern) => [...walk(popup.draw())].filter((node) => pattern.test(node.$.id ?? "")).length;
    // A property's choices: the title line and the rule under it, the padding and the border, the list, and the chip
    // naming the issue
    hover(row(panel.draw(), "back-1"), true, panel.cx);
    press(panel.draw(), "s", panel.cx);
    const choices = mountOverlay();
    assert.equal(choices.overlay.height, 51 + find(choices.draw(), "commands-list").$.style.h + 28);
    clickOn(panel, "estimate-back-1");
    const bare = mountOverlay();
    assert.equal(bare.overlay.height, 51 + find(bare.draw(), "commands-list").$.style.h);
    // The issue menu: its entries, a caption, two rules, the padding and the border. The Copy page: its entries, the
    // padding and the border
    const root = panel.draw();
    send(root, row(root, "back-1"), "on_mouse_down:right", at(950, 200), panel.cx);
    const menu = mountOverlay();
    assert.equal(menu.overlay.height, drawn(menu, /^entry-/) * 31 + 56);
    const entries = menu.draw();
    send(entries, find(entries, "entry-copy"), "on_click", {}, menu.cx);
    const copies = mountOverlay();
    assert.equal(copies.overlay.height, drawn(copies, /^entry-/) * 31 + 12);
    // The team picker: a row per team and its caption
    press(panel.draw(), "c", panel.cx);
    const teams = mountOverlay();
    assert.equal(teams.overlay.height, drawn(teams, /^item-/) * 31 + 38);
  });
});

describe("requests from the popups", () => {
  it("makes the change once, then reloads", async () => {
    const panel = await startPanel();
    ask({ ids: ["back-1", "back-2"], kind: "update", input: { priority: 3 } });
    panel.draw();
    await panel.cx.idle();
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), [{ ids: ["back-1", "back-2"], input: { priority: 3 } }]);
    assert.deepEqual(panel.server.kinds()
      .slice(-2), ["update", "issues"]);
  });

  it("gives each issue its own team's status of the name asked", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    ask({ ids: ["back-2", "web-7", "back-1"], kind: "status", name: "In Progress" });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server),
      [{ ids: ["back-2"], input: { stateId: "back-doing" } }, { ids: ["web-7"], input: { stateId: "web-doing" } }]);
  });

  it("copies with the description when the entry needs it", async () => {
    const panel = await startPanel();
    ask({ ids: ["back-1"], kind: "copy", what: "prompt" });
    panel.draw();
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard,
      "Work on Linear issue BACK-1: Fix login\n\nSteps to reproduce\n\nhttps://tracker.test/issue/BACK-1");
    assert.deepEqual(panel.server.kinds()
      .slice(-1), ["description"]);
  });

  it("keeps the clipboard and says so when the issue has no diff to copy", async () => {
    const panel = await startPanel();
    panel.cx.clipboard = "kept";
    ask({ ids: ["back-1"], kind: "copy", what: "diffs" });
    panel.draw();
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard, "kept");
    assert.deepEqual(host.notes, [{ title: "No diffs to copy · BACK-1", timeout: 1500 }]);
  });

  it("copies everything with the comments", async () => {
    const panel = await startPanel();
    panel.server.comments = [{ body: "Seen it too", createdAt: "2026-11-21T10:00:00.000Z", user: { name: "Ada" } }];
    ask({ ids: ["back-1"], kind: "copy", what: "everything" });
    panel.draw();
    await panel.cx.idle();
    assert.match(panel.cx.clipboard, /## Comments\n\n\*\*Ada\*\* \(2026-11-21\):\n\nSeen it too$/);
    assert.match(host.notes[0].title, /^Copied everything as Markdown/);
  });

  it("copies several issues as Markdown, reading each one's description", async () => {
    const panel = await startPanel();
    ask({ ids: ["back-2", "back-1"], kind: "copy", what: "markdown" });
    panel.draw();
    await panel.cx.idle();
    assert.equal(panel.cx.clipboard,
      "# Fix login\n\nSteps to reproduce\n\n---\n\n# Add audit log\n\nSteps to reproduce");
    assert.deepEqual(panel.server.kinds()
      .slice(-2), ["description", "description"]);
    assert.match(host.notes[0].title, /^Copied issues as Markdown/);
  });

  it("opens an issue's page, and the composer of a team, when a popup asks", async () => {
    const panel = await startPanel();
    panel.cx.elapse();
    ask({ ids: ["back-2"], kind: "open" });
    panel.draw();
    await panel.cx.idle();
    ask({ ids: [], kind: "compose", team: { key: "WEB", name: "Website" } });
    panel.draw();
    await settled();
    assert.deepEqual(host.ran.slice(-2)
      .map((ran) => ran.args[0]),
    ["linear://tracker.test/issue/BACK-2", "linear://linear.app/team/WEB/new?assignee=me"]);
    assert.ok(!icons(panel.draw())
      .includes("spinner"));
    assert.deepEqual(panel.server.kinds(), ["issues", "teams"]);
  });

  it("serves a request made while another one is still under way", async () => {
    const panel = await startPanel();
    ask({ ids: ["back-1"], kind: "update", input: { priority: 3 } });
    panel.draw();
    ask({ ids: ["back-2"], kind: "update", input: { priority: 4 } });
    await panel.cx.idle();
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server)
      .map((update) => update.ids), [["back-1"], ["back-2"]]);
  });

  it("keeps the spinner of a change while a quiet reload ends", async () => {
    const panel = await startPanel();
    panel.cx.elapse();
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    const answer = host.fetch;
    host.fetch = async (url,
      options) => { if (JSON.parse(options.body).query.includes("issueBatchUpdate")) await held; return answer(url,
      options); };
    ask({ ids: ["back-1"], kind: "update", input: { priority: 3 } });
    panel.draw();
    panel.cx.tick();
    await settled();
    await settled();
    panel.cx.elapse(SPIN_MS);
    assert.ok(icons(panel.draw())
      .includes("spinner"));
    release();
    await panel.cx.idle();
    panel.cx.elapse();
    assert.ok(!icons(panel.draw())
      .includes("spinner"));
  });

  it("gives up a change that does not answer, says so, and stops its spinner", async () => {
    const panel = await startPanel();
    panel.cx.elapse();
    const answer = host.fetch;
    host.fetch = (url, options) => (JSON.parse(options.body).query.includes("issueBatchUpdate")
      ? new Promise(() => {}) : answer(url, options));
    ask({ ids: ["back-1"], kind: "update", input: { priority: 3 } });
    panel.draw();
    await panel.cx.idle();
    assert.ok(icons(panel.draw())
      .includes("spinner"));
    panel.cx.elapse();
    await panel.cx.idle();
    panel.cx.elapse();
    const root = panel.draw();
    assert.match(text(root), /BACK-1: Linear did not answer in time/);
    assert.ok(!icons(root)
      .includes("spinner"));
  });

  it("shows what failed for which issue, until the line is clicked", async () => {
    const panel = await startPanel();
    panel.server.error = "Rate limited";
    ask({ ids: ["back-1"], kind: "update", input: { priority: 3 } });
    panel.draw();
    await panel.cx.idle();
    assert.equal(text(find(panel.draw(), "failed")), "BACK-1: Rate limited");
    clickOn(panel, "failed");
    assert.equal(find(panel.draw(), "failed"), null);
  });

  it("ignores a request for issues it does not have", async () => {
    const panel = await startPanel();
    ask({ ids: ["gone"], kind: "update", input: { priority: 3 } });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), []);
  });

  it("serves every request sent before it drew, not only the last", async () => {
    const panel = await startPanel();
    ask({ ids: ["back-1"], kind: "update", input: { priority: 3 } });
    ask({ ids: ["back-2"], kind: "update", input: { priority: 4 } });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server)
      .map(({ ids }) => ids), [["back-1"], ["back-2"]]);
    panel.draw();
    await panel.cx.idle();
    assert.equal(updates(panel.server).length, 2);
  });

  it("does not replay a request left from before it started", async () => {
    const left = { at: 5, ids: ["back-1"], kind: "update", input: { priority: 4 } };
    const panel = await startPanel({ app: { shared: { [REQUESTS]: [left] } } });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(updates(panel.server), []);
  });

  it("reorders the list on a display change, and remembers it, without reloading", async () => {
    const panel = await startPanel({ app: { stored: { view: "all" } } });
    ask({ ids: [], kind: "display", change: { by: "title", reversed: true } });
    assert.deepEqual(identifiers(panel.draw()), ["BACK-1", "WEB-7", "BACK-2", "BACK-10", "BACK-3"]);
    await panel.cx.idle();
    assert.deepEqual([host.stored.order, host.stored.reversed, host.stored.recency, host.stored.completed],
      ["title", "1", "1", "week"]);
    assert.deepEqual(panel.server.kinds(), ["issues", "teams"]);
  });

  it("reloads with the new filter when the Completed issues option changes", async () => {
    const panel = await startPanel();
    ask({ ids: [], kind: "display", change: { completed: "none" } });
    panel.draw();
    await panel.cx.idle();
    assert.deepEqual(panel.server.asked.at(-1).variables.mine,
      { state: { type: { nin: ["completed", "canceled", "duplicate"] } } });
    assert.equal(host.stored.completed, "none");
  });
});

describe("lookups that fail", () => {
  it("says so when Herdr cannot list the agents, instead of offering none", async () => {
    const panel = await startPanel({ load: false, app: { agentsError: "No shell" } });
    await panel.cx.idle();
    assert.match(text(panel.draw()), /Could not list the agents: No shell/);
  });

  it("says so when the teams kept from the last run cannot be refreshed", async () => {
    await startPanel();
    const kept = host.stored["cache.v1.teams"];
    const answer = tracker();
    const refused = async (url, options) => {
      if (JSON.parse(options.body).query.includes("issueEstimationType")) throw new Error("Offline");
      return answer.fetch(url, options);
    };
    const second = await startPanel({ stored: { "cache.v1.teams": kept }, app: { fetch: refused } });
    assert.match(text(second.draw()), /Could not load the teams: Offline/);
  });
});

describe("what is kept between runs", () => {
  it("starts with the teams of the last run, and asks for them again in the background", async () => {
    await startPanel();
    const kept = host.stored["cache.v1.teams"];
    assert.ok(kept);
    // A new run: the teams are known before the tracker answers, and are asked once more
    const second = await startPanel({ load: false, stored: { "cache.v1.teams": kept } });
    assert.equal(second.view.part.store.teams.size, 2);
    second.draw();
    await second.cx.idle();
    assert.deepEqual(second.server.kinds(), ["issues", "teams"]);
  });
});

describe("a picker that does not fit below its control", () => {
  it("opens the whole list above the control, never over it, and scrolls only when neither side holds it", async () => {
    const panel = await startPanel();
    enter(panel);
    const open = async (y) => {
      host.overlays.length = 0;
      const root = panel.draw(), control = find(root, "estimate-back-1");
      send(root, control, "on_mouse_down:left", { ...at(1270, y + 10), bounds: { x: 1262, y, width: 30, height: 20 } },
        panel.cx);
      send(root, control, "on_click", at(1270, y + 10), panel.cx);
      return host.overlays[0];
    };
    // Plenty of room below: all the rows, under the control
    const roomy = await open(100);
    assert.equal(roomy.props.visible, 6);
    assert.equal(roomy.at.y, 100 + 20 + 6);
    // Close to the bottom (the panel ends at 740): the same popup over the control
    const low = await open(640);
    assert.equal(low.props.visible, 6);
    assert.equal(low.at.y + low.height, 640 - 6);
  });
});

describe("the header's round buttons", () => {
  it("light only their icon under the pointer, not the circle around it", async () => {
    const panel = await startPanel();
    const icon = (id) => find(panel.draw(), id).$.children[0].$.style.text_color;
    for (const id of ["new-issue", "display-options", "reload"]) {
      assert.equal(icon(id), "theme.muted");
      hover(find(panel.draw(), id), true, panel.cx);
      assert.equal(icon(id), "theme.foreground");
      // The circle is as it was
      const { style } = find(panel.draw(), id).$;
      assert.deepEqual([style.border_color, style.bg], ["theme.border", undefined]);
      hover(find(panel.draw(), id), false, panel.cx);
      assert.equal(icon(id), "theme.muted");
    }
  });
});

describe("the view pills", () => {
  it("light up under the pointer, except the selected one", async () => {
    const root = (await startPanel()).draw();
    assert.equal(find(root, "view-cycle").$.hover, null);
    assert.deepEqual(find(root, "view-all").$.hover, { bg: "theme.hover" });
  });
});

describe("the total of the view", () => {
  const total = (panel) => find(panel.draw(), "total-view");

  it("is under the view pills, in the groups' mode: the number of issues, or their estimates", async () => {
    const counting = await startPanel({ app: { stored: { totals: "count" } } });
    const pieces = texts(counting.draw());
    assert.ok(pieces.indexOf("3 issues") > pieces.indexOf("My issues"));
    assert.equal(text(total(counting)), "3 issues");
    assert.deepEqual(icons(total(counting)), []);
    const points = await startPanel();
    // The cycle's three issues: 3, the team's default 1 for the one without, and 5 points
    assert.deepEqual([text(total(points)), icons(total(points))], ["9", ["estimate"]]);
  });

  it("switches the mode of the total and of every group on a click, and brightens under the pointer", async () => {
    const panel = await startPanel();
    const figure = () => find(panel.draw(), "total-view").$.style.text_color;
    assert.equal(figure(), "theme.muted");
    hover(find(panel.draw(), "total-view"), true, panel.cx);
    assert.equal(figure(), "theme.foreground");
    clickOn(panel, "total-view");
    assert.equal(text(find(panel.draw(), "total-view")), "3 issues");
    assert.match(text(find(panel.draw(), "issues")), /In Progress 1/);
    clickOn(panel, "total-view");
    assert.equal(text(find(panel.draw(), "total-view")), "9");
  });
});

describe("the addresses of links", () => {
  it("lets only web addresses and the tracker's reach the system's opener", async () => {
    const panel = await startPanel();
    const { openLink } = await import("../../mods/linear-panel/tracker.js");
    for (const address of ["file:///Applications/Calculator.app", "smb://host/share", "javascript:alert(1)",
      "C:\\Windows\\System32\\calc.exe", "mailto:a@b.c", "ssh://host"]) {
      await openLink(address);
    }
    assert.deepEqual(host.ran.filter((ran) => ran.command === "open"), []);
    await openLink("https://example.com/x");
    assert.deepEqual(host.ran.filter((ran) => ran.command === "open")
      .map((ran) => ran.args[0]),
    ["https://example.com/x"]);
    assert.ok(panel);
  });
});
