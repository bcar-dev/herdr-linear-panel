# Changelog

## 2026-11-27

### Added

- Copy menu: "Copy diff links" copies an issue's diffs as a bullet points list with Gitlab or Github emoji and its
  repository and number linked to it. Each is listed once, and closed ones are left out.
- The mod's own icons carry a copyright line in their SVG metadata.

### Changed

- "Copy URL", "Copy title as link" and "Copy diff links" share one chain icon: two hooks facing each other with a bar
  between them.
- The Lucide icons are the unchanged ones of Lucide 1.82.0. The draft merge request icon shows a dotted line and a
  circle instead of code brackets, and the closed one a smaller cross.

## 2026-11-26

### Added

- Issue page: click a row to edit its title, read its description, change properties, pick labels, follow merge
  requests, and write, reply to, edit, resolve or delete comments.
- Issue page: an "Open in Linear" button at the top right, opening the Linear app, else the browser.
- Escape sequences and control characters are stripped from everything the tracker sends.
- GitHub Actions workflow running lint and tests, with actions pinned to commits.
- This changelog.

### Changed

- The `api` setting accepts only https, or http on this computer.
- The API key is read once, kept in memory, and dropped when the tracker refuses it.
- Loads time out after 30 seconds, popup requests queue, and failed refreshes show an error.
- Teams, projects and labels load page by page, and updates of more than 50 issues go in chunks.
- Start validates the branch name, reports unreadable Herdr settings, and marks the issue description as untrusted.
- Copying as Markdown escapes brackets and comment authors' names.
- Cached lists are versioned, and a corrupt cache is ignored.
- Code split into a store, request router, key router and popup openers, with named constants and enums.
- Method chains take one call per line, enforced by the linter.
- Icons come from explicit tables, and option lists are records instead of pairs.
- Headings in a description or comment are drawn larger, by level.

## 2026-11-24

### Added

- Rows show the issue's merge requests, with a card on hover (title, repository, changes, reviewers).
- Rows show the issue's cycle, with a card on hover and a picker to move the issue.

### Changed

- Tighter status icon and merge request, cycle and estimate boxes.
- A started space takes its issue's name.

### Fixed

- Clicking a row's cycle opens the cycle's page.

## 2026-11-22

### Added

- Issues panel: your issues by status in two views (current cycle, all issues). Change status, priority,
  assignee, estimate and cycle from a row, its menu or the keyboard, or drag a row to another status.
- Start work on an issue: a git worktree on its branch, a new space, and your agent briefed with the issue.
- Copy issues as IDs, links, Markdown or a prompt.
- Example layout with the panel, and a start prompt to replace.
- README.
