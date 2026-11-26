import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chipLabel, clipped, initials, merges, reference, reviewedBy, standing, tint, when }
  from "../../mods/linear-panel/lib/merges.js";

const NOW = Date.parse("2026-11-24T10:00:00.000Z");
const merge = (status, more = {}) => ({
  sourceType: "gitlab", url: "https://gitlab.com/worklife-io/nuxt-frontend/-/merge_requests/3463", number: 3463,
  title: "Reload the page", status, repoLogin: "worklife-io", repoName: "nuxt-frontend",
  createdAt: "2026-11-24T07:00:00.000Z", mergedAt: null, closedAt: null, userLogin: "benjamin.carlier", ...more,
});
const PHOENIX = merge("open", { sourceType: "github", url: "https://github.com/WorklifeCare/phoenix/pull/47",
  number: 47, repoLogin: "WorklifeCare", repoName: "phoenix" });

describe("merges", () => {
  it("reads each attachment's merge request, with where it comes from", () => {
    const { sourceType, ...metadata } = merge("merged");
    assert.deepEqual(merges({ attachments: { nodes: [{ sourceType, metadata }] } }), [merge("merged")]);
  });

  it("leaves out an attachment that is not a merge request: one with no number", () => {
    const { sourceType, ...metadata } = merge("merged");
    const commit = { sourceType: "github", metadata: { url: "https://github.com/WorklifeCare/phoenix/commit/1a2b" } };
    assert.deepEqual(merges({ attachments: { nodes: [commit, { sourceType, metadata }] } }), [merge("merged")]);
  });
});

describe("standing", () => {
  it("tells merged, closed and draft apart, and takes anything else for open", () => {
    assert.deepEqual(["merged", "closed", "open", "inReview", "draft"].map((status) => standing(merge(status))),
      ["merged", "closed", "open", "open", "draft"]);
  });
});

describe("tint", () => {
  const of = (...statuses) => tint(statuses.map((status) => merge(status)));

  it("is merged when all are, open when none is, mixed when some are", () => {
    assert.deepEqual([of("merged", "merged"), of("open", "draft", "inReview"), of("merged", "open")],
      ["merged", "open", "mixed"]);
  });

  it("is draft, grey, only when every one left is a draft", () => {
    assert.deepEqual([of("draft"), of("draft", "draft"), of("draft", "closed"), of("draft", "open")],
      ["draft", "draft", "draft", "open"]);
  });

  it("leaves the closed ones out, unless all are closed", () => {
    assert.deepEqual([of("closed"), of("merged", "closed"), of("open", "closed")], ["closed", "merged", "open"]);
  });
});

describe("chipLabel", () => {
  it("tells one merge request by its number, several by their count", () => {
    assert.deepEqual([chipLabel([merge("open")]), chipLabel([PHOENIX]), chipLabel([merge("open"), PHOENIX, PHOENIX])],
      ["!3463", "#47", "3 PRs"]);
  });
});

describe("reference", () => {
  it("names a merge request by its repository and number, with its owner when asked", () => {
    assert.deepEqual([reference(merge("open"), false), reference(merge("open"), true), reference(PHOENIX, false)],
      ["nuxt-frontend!3463", "worklife-io/nuxt-frontend!3463", "phoenix#47"]);
  });
});

describe("initials", () => {
  it("takes the first two letters of a login, uppercased", () => {
    assert.deepEqual(["benjamin.carlier", "koromyslo", "x"].map(initials), ["BE", "KO", "X"]);
  });
});

describe("reviewedBy", () => {
  it("names the reviewers in a sentence, or nothing without any", () => {
    assert.deepEqual([[], ["amalchaker"], ["Codex", "Claude"], ["a", "b", "c"]].map(reviewedBy),
      ["", "Reviewed by amalchaker", "Reviewed by Codex and Claude", "Reviewed by a, b and c"]);
  });
});

describe("when", () => {
  it("tells when a merge request was merged, closed or opened", () => {
    assert.deepEqual([
      when(merge("merged", { mergedAt: "2026-11-23T11:00:00.000Z" }), NOW),
      when(merge("closed", { closedAt: "2026-11-22T10:00:00.000Z" }), NOW),
      when(merge("inReview"), NOW),
    ], ["Merged 23h ago", "Closed 2d ago", "Opened 3h ago"]);
  });
});

describe("a merge request's title on the issue's page", () => {
  it("cuts a title past 50 characters to exactly 50, its start then the three dots", () => {
    assert.equal(clipped("a".repeat(50), 50), "a".repeat(50));
    assert.equal(clipped("a".repeat(51), 50), `${"a".repeat(47)}...`);
    const cut = clipped("feat!: enable SQLAlchemy 2.0 strict mode [BACK-5609]", 50);
    assert.equal(cut, "feat!: enable SQLAlchemy 2.0 strict mode [BACK-...");
    assert.equal(cut.length, 50);
  });
});

describe("clipped, on a title with emojis", () => {
  it("cuts between characters, never inside one that takes two code units", () => {
    const title = `${"a".repeat(44)}\u{1F41B}${"b".repeat(20)}`;
    const cut = clipped(title, 48);
    assert.equal(cut.isWellFormed(), true);
    assert.equal([...cut].length, 48);
  });
});
