// What each entry of the Copy menu puts on the clipboard
import { CopyWhat } from "../enums.js";
import { MergeStatus, merges, reference } from "./merges.js";

/** @type {CopyWhat[]} */
const DOCUMENTS = [CopyWhat.MARKDOWN, CopyWhat.EVERYTHING, CopyWhat.PROMPT];
const ISO_DATE_LENGTH = 10;
const RULE = "\n\n---\n\n";

const COMMENTS_HEADING = "## Comments";
const FIELD_JOINER = "\n\n";

// Text that Markdown would read as markup
/** @param {string} text */
const escaped = (text) => text.replace(/[\\`*_[\]]/g, "\\$&");

/** @type {Partial<Record<CopyWhat, (issue: Issue) => string>>} */
const FIELDS = {
  [CopyWhat.ID]: (issue) => issue.identifier,
  [CopyWhat.URL]: (issue) => issue.url,
  [CopyWhat.TITLE]: (issue) => issue.title,
  [CopyWhat.LINK]: (issue) => `[${escaped(issue.title)}](${issue.url})`,
  [CopyWhat.BRANCH]: (issue) => issue.branchName,
};

/** @param {Issue[]} issues */
const diffLinks = (issues) => [...new Set(issues.flatMap(merges)
  .filter((merge) => merge.status !== MergeStatus.CLOSED)
  .map((merge) => `- :${merge.sourceType}: [${reference(merge, false)}](${merge.url})`))]
  .join("\n");

/** @param {PageComment} comment */
const commentText = (comment) => {
  const author = escaped(comment.user?.name ?? "Someone"), day = comment.createdAt.slice(0, ISO_DATE_LENGTH);
  return `**${author}** (${day}):${FIELD_JOINER}${comment.body.trim()}`;
};

/** @param {(string | undefined)[]} parts */
const paragraphs = (parts) => parts.filter(Boolean)
  .join(FIELD_JOINER);

/**
 * @param {CopyWhat} what
 * @param {Issue} issue
 * @param {IssueDetails} details
 * @param {string} tracker
 */
function issueText(what, issue, { description, comments = [] } = {}, tracker) {
  const field = FIELDS[what];
  if (field) return field(issue);
  const body = (description ?? "").trim(), markdown = paragraphs([`# ${issue.title}`, body]);
  if (what === CopyWhat.MARKDOWN) return markdown;
  if (what === CopyWhat.EVERYTHING) return paragraphs([markdown, ...(comments.length ? [COMMENTS_HEADING] : []),
    ...comments.map(commentText)]);
  const opening = ["Work on", tracker, `issue ${issue.identifier}: ${issue.title}`].filter(Boolean)
    .join(" ");
  return paragraphs([opening, body, issue.url]);
}

// `details` holds, issue by issue, the { description, comments } of the entries that need them. Several issues give one
// line each (a title with its identifier) or one document each, with a rule between them
/**
 * @param {CopyWhat} what
 * @param {Issue[]} issues
 * @param {IssueDetails[]} details
 * @param {string} tracker
 */
export function copyText(what, issues, details = [], tracker = "") {
  if (what === CopyWhat.DIFFS) return diffLinks(issues);
  const [only] = issues;
  if (only && issues.length === 1) return issueText(what, only, details[0], tracker);
  if (what === CopyWhat.TITLE) return issues.map((issue) => `${issue.identifier}: ${issue.title}`)
    .join("\n");
  return issues.map((issue, nth) => issueText(what, issue, details[nth], tracker))
    .join(DOCUMENTS.includes(what) ? RULE : "\n");
}
