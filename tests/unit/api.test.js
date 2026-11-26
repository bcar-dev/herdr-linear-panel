import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import * as api from "../../mods/linear-panel/api.js";
import { ask, pending } from "../../mods/linear-panel/channel.js";
import { keep, recall } from "../../mods/linear-panel/lib/cache.js";
import { composeIssue, keySetup, openPage } from "../../mods/linear-panel/tracker.js";
import { tracker } from "../fixtures.js";
import { host, reset } from "../host/herdr.js";

// A fresh app whose fetch is the fake tracker's, or `fetch` when given
function connect(fetch) {
  const server = tracker();
  reset({ exec: server.exec, fetch: fetch ?? server.fetch });
  api.use(undefined);
  return server;
}

const shells = () => host.ran.filter((ran) => ran.command === "sh").length;

describe("the address of the API", () => {
  it("takes https anywhere, and http only on this computer", () => {
    for (const address of ["https://api.linear.app/graphql", "http://localhost:4747/graphql",
      "http://127.0.0.1/graphql", "http://[::1]:4747/graphql"]) assert.equal(api.checkedEndpoint(address), address);
  });

  it("refuses the rest, before the key goes anywhere", async () => {
    for (const address of ["http://example.com/graphql", "ftp://localhost/x", "not an address"]) {
      assert.throws(() => api.checkedEndpoint(address), /must be an https address/);
    }
    const server = connect();
    api.use("http://example.com/graphql");
    await assert.rejects(() => api.description("back-1"), /must be an https address/);
    assert.deepEqual(server.asked, []);
  });
});

describe("the API key", () => {
  it("is read once, and again after the tracker refused it", async () => {
    let status = 200;
    const server = tracker();
    connect(async (url, options) => ({ ...(await server.fetch(url, options)), status }));
    await api.description("back-1");
    await api.description("back-1");
    assert.equal(shells(), 1);
    status = 401;
    await api.description("back-1");
    status = 200;
    await api.description("back-1");
    assert.equal(shells(), 2);
  });

  it("is not kept when there is none", async () => {
    const server = connect();
    server.key = "";
    await assert.rejects(() => api.description("back-1"), api.NoKey);
    server.key = "late-key";
    await api.description("back-1");
    assert.equal(server.asked[0].authorization, "late-key");
  });
});

describe("requests", () => {
  it("update sends 50 ids at most at a time", async () => {
    const server = connect();
    await api.update(Array.from({ length: 120 }, (_, nth) => `id-${nth}`), { priority: 1 });
    assert.deepEqual(server.asked.map((request) => request.variables.ids.length), [50, 50, 20]);
  });

  it("teams follows the pages of the answer", async () => {
    const pages = [
      { nodes: [{ id: "a", states: { nodes: [] }, members: { nodes: [] }, cycles: { nodes: [] } }],
        pageInfo: { hasNextPage: true, endCursor: "next" } },
      { nodes: [{ id: "b", states: { nodes: [] }, members: { nodes: [] }, cycles: { nodes: [] } }],
        pageInfo: { hasNextPage: false, endCursor: "end" } },
    ];
    const afters = [];
    connect(async (_url, options) => {
      const { variables } = JSON.parse(options.body);
      afters.push(variables.after);
      return { status: 200, json: async () => ({ data: { teams: pages[variables.after ? 1 : 0] } }) };
    });
    assert.deepEqual((await api.teams(["a", "b"])).map((team) => team.id), ["a", "b"]);
    assert.deepEqual(afters, [undefined, "next"]);
  });

  it("changeComment says so when the field of its own mutation is not a success", async () => {
    connect(async () => ({ status: 200, json: async () => ({ data: { commentResolve: { success: false } } }) }));
    await assert.rejects(() => api.changeComment("resolve", "c1"), /refused/);
    connect(async () => ({ status: 200, json: async () => ({ data: { commentUpdate: { success: true } } }) }));
    await assert.rejects(() => api.changeComment("resolve", "c1"), /refused/);
    await api.changeComment("edit", "c1", "new");
  });
});

describe("the tracker's pages", () => {
  beforeEach(() => reset());

  it("opens one in its app under its own scheme, and encodes a team's key", async () => {
    await openPage("https://linear.app/team/BACK/cycle/12");
    assert.deepEqual(host.ran.map((ran) => [ran.command, ran.args[0]]),
      [["open", "linear://linear.app/team/BACK/cycle/12"]]);
    host.ran.length = 0;
    await composeIssue({ key: "A/B?" });
    assert.equal(host.ran[0].args[0], "linear://linear.app/team/A%2FB%3F/new?assignee=me");
  });

  it("says so when nothing opens the page", async () => {
    reset({ exec: () => ({ code: 1 }) });
    assert.equal(await openPage("https://linear.app/x"), false);
    assert.match(host.notes[0].title, /^Could not open https:\/\/linear\.app\/x/);
  });

  it("treats a system it does not know as Linux", () => {
    reset({ platform: "freebsd" });
    assert.match(keySetup().how, /keyring/);
  });
});

describe("what is kept between runs", () => {
  beforeEach(() => reset());

  it("answers the fallback for a missing, corrupt or misshapen entry", () => {
    assert.deepEqual(recall("teams", []), []);
    host.stored["cache.v1.teams"] = "{ nope";
    assert.deepEqual(recall("teams", []), []);
    host.stored["cache.v1.teams"] = '{"a":1}';
    assert.deepEqual(recall("teams", []), []);
    host.stored["cache.v1.projects"] = "[1]";
    assert.deepEqual(recall("projects", {}), {});
    keep("teams", [["a", 1]]);
    assert.deepEqual(recall("teams", []), [["a", 1]]);
  });

  it("does not read what an older version kept", () => {
    host.stored["cache.teams"] = "[[1]]";
    assert.equal(recall("teams"), null);
  });
});

describe("requests of the panel's popups", () => {
  beforeEach(() => reset());

  it("two asks within one millisecond are told apart", () => {
    ask({ ids: ["a"], kind: "open" });
    const first = pending().at;
    ask({ ids: ["b"], kind: "open" });
    assert.ok(pending().at > first);
  });
});
