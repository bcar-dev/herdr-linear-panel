// What each entry of the Copy menu puts on the clipboard. Pure, so node can test it (tests/unit).

// Between the documents of several issues: a rule, with the blank lines Markdown needs around it.
const RULE = "\n\n---\n\n";
const DOCUMENTS = ["markdown", "everything", "prompt"];

/**
 * @param {CopyWhat} what
 * @param {Issue} issue
 * @param {IssueDetails} details
 * @param {string} tracker
 */
function one(what, issue, { description, comments = [] } = {}, tracker) {
  const body = (description ?? "").trim(), markdown = [`# ${issue.title}`, body].filter(Boolean).join("\n\n");
  /** @param {IssueComment} comment */
  const said = (comment) =>
    `**${comment.user?.name ?? "Someone"}** (${comment.createdAt.slice(0, 10)}):\n\n${comment.body.trim()}`;
  if (what === "id") return issue.identifier;
  if (what === "url") return issue.url;
  if (what === "title") return issue.title;
  if (what === "link") return `[${issue.title}](${issue.url})`;
  if (what === "branch") return issue.branchName;
  if (what === "markdown") return markdown;
  if (what === "everything") return [markdown, ...(comments.length ? ["## Comments", ...comments.map(said)] : [])]
    .join("\n\n");
  const opening = ["Work on", tracker, `issue ${issue.identifier}: ${issue.title}`].filter(Boolean).join(" ");
  return [opening, body, issue.url].filter(Boolean).join("\n\n");
}

// The text for these issues, in the order given. `details` holds, issue by issue, the { description, comments } of
// the entries that need them, and `tracker` is the product's name.
// Several issues give one line each (a title with its identifier, so the lines can be told apart) or one document
// each, with a rule between them.
/**
 * @param {CopyWhat} what
 * @param {Issue[]} issues
 * @param {IssueDetails[]} details
 * @param {string} tracker
 */
export function copyText(what, issues, details = [], tracker = "") {
  if (issues.length === 1) return one(what, issues[0], details[0], tracker);
  if (what === "title") return issues.map((issue) => `${issue.identifier}: ${issue.title}`).join("\n");
  return issues.map((issue, nth) => one(what, issue, details[nth], tracker))
    .join(DOCUMENTS.includes(what) ? RULE : "\n");
}
