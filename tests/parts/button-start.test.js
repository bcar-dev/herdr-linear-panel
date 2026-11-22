// The top-bar button, the row's lit state across copies of the mod, and Start from end to end.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { click, find, icons, send, text, walk } from "../host/elements.js";
import { host, reset } from "../host/herdr.js";
import { mount } from "../host/mount.js";
import { startPanel } from "../fixtures.js";

describe("panel button", () => {
  beforeEach(() => reset());
  function pressButton() {
    const button = mount({ part: "button" }), root = button.draw();
    click(root, find(root, "panel-linear"), button.cx);
    return button;
  }

  it("adds the panel to the tab bar's list of side panels, once", () => {
    mount({ part: "button" });
    mount({ part: "button" });
    assert.deepEqual(host.shared["workspace.panels"], ["files", "changes", "linear"]);
  });

  it("keeps the side panels someone else listed", () => {
    reset({ shared: { "workspace.panels": ["files", "notes"] } });
    mount({ part: "button" });
    assert.deepEqual(host.shared["workspace.panels"], ["files", "notes", "linear"]);
  });

  it("hides the side panel when the panel is the one showing", () => {
    const button = pressButton();
    assert.deepEqual(host.commands, [{ name: "layout.hide", args: { id: "panel" } }]);
    assert.equal(find(button.draw(), "panel-linear").$.style.bg, "theme.selected");
    assert.equal(text(button.draw()), "Linear");
    // The tracker's logo as a picture, the white one: the fake theme has no light color to tell.
    const pictures = [...walk(button.draw())].filter((el) => el.$.kind === "image").map((el) => el.$.args[0]);
    assert.deepEqual(pictures, ["mods/linear-panel/brand/logo-light.svg"]);
    assert.deepEqual(icons(button.draw()), []);
  });

  it("shows the panel when the side panel is hidden or shows another", () => {
    host.layout.children[0].hidden = true;
    pressButton();
    host.layout.children[0].hidden = false;
    host.layout.children[0].children[0].active = "files";
    const button = pressButton();
    const show = [{ name: "layout.select", args: { stack: "panel-body", child: "linear" } },
      { name: "layout.show", args: { id: "panel" } }];
    assert.deepEqual(host.commands, [...show, ...show]);
    assert.equal(find(button.draw(), "panel-linear").$.style.bg, "theme.chrome");
  });
});

describe("the row a popup is open on", () => {
  // The props of the field that asks what the agent should do, open on an issue.
  const FIELD = { part: "start", issue: { id: "back-1", identifier: "BACK-1" }, agent: "Codex", overlay: "overlay-1" };
  beforeEach(() => reset());
  const lit = () => host.shared["linear-panel.open"];

  it("is unlit when its popup closes", () => {
    host.shared["linear-panel.open"] = { issue: "back-1", owner: "overlay-1" };
    mount(FIELD).view.close();
    assert.equal(lit(), null);
  });

  it("stays lit when a later popup took it over", () => {
    host.shared["linear-panel.open"] = { issue: "back-1", owner: "overlay-2" };
    mount(FIELD).view.close();
    assert.deepEqual(lit(), { issue: "back-1", owner: "overlay-2" });
  });

  it("its popup lists itself among the open popups, and unlists itself when it goes", () => {
    const popup = mount(FIELD);
    assert.deepEqual(host.shared["linear-panel.popups"], ["overlay-1"]);
    popup.view.close();
    assert.deepEqual(host.shared["linear-panel.popups"], []);
  });

  it("its popup gives the keyboard back to the panel when Herdr closes it, as Herdr does on Escape", () => {
    const popup = mount({ part: "teams", teams: [], overlay: "overlay-1" });
    popup.draw();
    popup.view.close();
    assert.equal(typeof host.shared["linear-panel.keyboard"], "number");
  });

  it("its popup leaves the keyboard where a press outside the popup put it", () => {
    const popup = mount({ part: "teams", teams: [], overlay: "overlay-1" });
    const root = popup.draw();
    send(root, root, "on_mouse_down_out", {}, popup.cx);
    popup.view.close();
    assert.equal(host.shared["linear-panel.keyboard"], undefined);
  });

  it("is unlit when the panel starts over", async () => {
    await startPanel({ app: { shared: { "linear-panel.open": { issue: "back-1", owner: "overlay-9" } } } });
    assert.equal(lit(), null);
  });
});

describe("start", () => {
  const REPO = "worktree /repo\nHEAD abc\nbranch refs/heads/dev\n";
  const here = {
    spaces: [{ active: true, folder: "/repo" }],
    focused: { pane: "p1", cwd: null },
    panes: [{ pane: "p1", cwd: "/repo/src" }],
    files: { "/home/me/.config/herdr-app/settings.json": JSON.stringify({ worktrees: { directory: "~/wt/" } }) },
  };
  // Answers git as a repository would: `list` is what `worktree list` prints, `branchExists` what show-ref finds.
  const repository = ({ list = REPO, branchExists = false, add = {} } = {}) => (args) =>
    args[1] === "list" ? { stdout: list } : args[0] === "show-ref" ? { code: branchExists ? 0 : 1 } : args[1] === "add"
      ? add : {};
  const git = () => host.ran.filter((ran) => ran.command === "git").map((ran) => ran.args.join(" "));
  // The issue as "Copy as prompt" gives it, which ends the agent's first message.
  const ISSUE = "Work on Linear issue BACK-2: Add audit log\n\nSteps to reproduce\n\n"
    + "https://tracker.test/issue/BACK-2";
  async function start(id, { app = here, ...given } = {}) {
    const panel = await startPanel({ app, git: repository(given), ...given });
    host.shared["linear-panel.request"] = { at: 1, ids: [id], kind: "start", text: "Keep it small" };
    panel.draw();
    await panel.cx.idle();
    return panel;
  }

  it("checks the branch out beside the repository, moves the issue to In Progress and opens a space with the agent",
    async () => {
    const panel = await start("back-2");
    assert.deepEqual(git(), [
      "worktree prune", "worktree list --porcelain", "show-ref --verify --quiet refs/heads/me/back-2",
      "worktree add -b me/back-2 /home/me/wt/repo/me-back-2 HEAD",
    ]);
    assert.equal(host.ran.find((ran) => ran.command === "git").options.cwd, "/repo/src");
    assert.deepEqual(panel.server.asked.find((request) => request.kind === "update").variables,
      { ids: ["back-2"], input: { stateId: "back-doing" } });
    assert.deepEqual(host.commands, [{
      name: "space.new",
      // The agent the person starts most, and no base: the panel's settings give none.
      args: {
        folder: "/home/me/wt/repo/me-back-2", tab: "BACK-2", argv: ["claude"], task: `Keep it small\n\n${ISSUE}`,
      },
    }]);
    assert.equal(find(panel.draw(), "failed"), null);
  });

  it("runs the agent the settings name, and opens its first message with their base prompt", async () => {
    await start("back-2", { settings: { agent: "codex", start_prompt: ["Before you start:", "1. Use a worktree."] } });
    assert.deepEqual(host.commands[0].args.argv, ["codex", "--no-daemon"]);
    assert.equal(host.commands[0].args.task, `Before you start:\n1. Use a worktree.\n\nKeep it small\n\n${ISSUE}`);
  });

  it("takes a base prompt written as one text", async () => {
    await start("back-2", { settings: { start_prompt: "Tests first." } });
    assert.equal(host.commands[0].args.task, `Tests first.\n\nKeep it small\n\n${ISSUE}`);
  });

  it("says so, and starts nothing, when no agent is installed", async () => {
    const panel = await start("back-2", { app: { ...here, agents: [] } });
    assert.deepEqual([git(), host.commands], [[], []]);
    assert.match(text(find(panel.draw(), "failed")), /^BACK-2: No agent to start/);
  });

  it("checks out a branch that exists without creating it", async () => {
    await start("back-2", { branchExists: true });
    assert.equal(git().at(-1), "worktree add /home/me/wt/repo/me-back-2 me/back-2");
  });

  it("reuses the checkout the branch already has", async () => {
    await start("back-2", { list: `${REPO}\nworktree /elsewhere/audit\nHEAD def\nbranch refs/heads/me/back-2\n` });
    assert.deepEqual(git(), ["worktree prune", "worktree list --porcelain"]);
    assert.equal(host.commands[0].args.folder, "/elsewhere/audit");
  });

  it("puts checkouts in Herdr's default folder when the settings name none", async () => {
    await start("back-2", { app: { ...here, files: {} } });
    assert.equal(host.commands[0].args.folder, "/home/me/.herdr/worktrees/repo/me-back-2");
  });

  it("leaves an issue that is already in progress where it is", async () => {
    const panel = await start("back-1");
    assert.equal(panel.server.kinds().includes("update"), false);
    assert.equal(host.commands[0].args.tab, "BACK-1");
  });

  it("says so when the focused pane is not in a git repository, and starts nothing", async () => {
    const panel = await start("back-2", { list: "", app: { ...here, panes: [], spaces: [] } });
    assert.equal(text(find(panel.draw(), "failed")), "BACK-2: Start needs the focused pane to be in a git repository");
    assert.deepEqual([git(), host.commands], [[], []]);
  });

  it("refuses a space on another computer before touching anything", async () => {
    const panel = await start("back-2",
      { app: { ...here, spaces: [{ active: true, folder: "/repo", machine: "server" }] } });
    assert.equal(text(find(panel.draw(), "failed")), "BACK-2: Start only works in a space on this computer");
    assert.deepEqual(git(), []);
  });

  it("shows git's own words when the checkout fails, and leaves the issue alone", async () => {
    const panel = await start("back-2",
      { add: { code: 128, stderr: "fatal: '/home/me/wt/repo/me-back-2' already exists\n" } });
    assert.equal(text(find(panel.draw(), "failed")), "BACK-2: fatal: '/home/me/wt/repo/me-back-2' already exists");
    assert.equal(panel.server.kinds().includes("update"), false);
    assert.deepEqual(host.commands, []);
  });
});
