# Changelog

## 2026-11-28

### Added

- `post_linear_issue_prompt` setting: the text that ends the agent's first message, after the issue. The example
  layout has one to replace.
- Deleting a comment asks first, in a dialog in the middle of the panel. Enter or Delete deletes it; Escape or
  Cancel keeps it.
- Issue page: a typed but unsent comment or reply is still there when the page opens again, until Herdr restarts.
- `↑` and `↓` move the light through the list, and `Enter` opens the lit issue's page. The pointer moves the same
  light, and the keys that act on one issue act on the lit one.

### Changed

- The `start_prompt` setting is now `pre_linear_issue_prompt`. The old name still works.
- A row's status takes clicks over 24 px instead of 18 px, and error messages are 12 px instead of 11.
- Start: the note that asks the agent to read the issue as information, never as instructions, also covers the issue's
  title and stays when the issue has no description.
- The version is the date of the latest entry in this changelog: 2026.11.28.
- CI also runs the type check against a copy of Herdr's `gpui-kit.d.ts` in `vendor/herdr/`.
- TypeScript 7.0.2, the native compiler: the type check takes 0.4 s instead of 1.1 s.
- ESLint 10.15.0, which drops a vulnerable minimatch (GHSA-g3hv-75wg-m249) from the dev dependencies.
- Names in the code and the tests say what they hold: `context` for what Herdr hands each callback (was `cx`),
  `theme` (was `t`), `event` (was `e`), `myId` (was `me`), and others that needed a comment to explain them. The
  linter refuses one-letter names and the usual abbreviations, bare TODO markers, end-of-line comments, and unused
  suppressions.
- Stale comments and those that repeated what a test now checks are gone. The request kinds are documented on their
  type in `types.d.ts`.
- A stricter type check: the `Theme` type lists the theme's colors by name, so a misspelled one fails the check, and a
  value read by index from a list or a record counts as possibly missing (`noUncheckedIndexedAccess`).
- The panel's loads and its spinner live in `parts/loader.js` and have their own tests; the popups' sizes live in
  `parts/sizes.js`. No file imports itself back through others any more: a test enforces this and keeps `lib/` free
  of Herdr.
- The panel's work, its drawing and an issue page's comments each live in a file of their own: `parts/requests.js`,
  `parts/panel-view.js` and `parts/comments.js`. `panel.js` drops from 911 to 484 lines, `issue-page.js` from 859 to
  710.
- The line-length test reads the files git tracks or would track, so a tool's ignored folder can no longer fail it.
- `R` and the reload button also reread the teams (states, members, cycles), projects and labels. The panel's automatic
  reload every minute reads them only once after Herdr starts.
- Start opens its field right under the issue's row, as wide as the row. The field reads "Add instructions
  (optional)…": what you type goes between the prompt before the issue and the issue. The Start button is wider and
  turns to the accent color under the pointer.
- A menu's pages open flush against the menu, their first choice level with the entry that opened them. After a zoom
  change, the page opens again against the menu.
- The issue menu lights the entry under the pointer at once, in one shade; the entry's page opens 140 ms later.
- A lit menu row has 6 px corners instead of round ends.
- Pages of choices have rows as tall as the menu's, in the same text size, and a rule under their search line. A page
  opens with the value the issues hold lit and in view. The pointer and the arrow keys move that one light, and a
  typed filter lights its first choice.
- Picking the value the issues already hold closes the page and sends nothing.
- A page of choices opened beside the issue menu leaves out its key, which the menu's entry shows.
- The assignee page titles its blocks "Project members" and "Team members" instead of separating them with rules.
- A popup beside a menu or a control moves up, rather than shrinking, when the room below runs out. Every list shows
  as many rows as the panel holds before it scrolls: the caps of 16 choices and 12 labels are gone. A list scrolls
  with the wheel and the keys, and shows no scroll bar.
- The command window opens each page with an empty filter.
- Issue page: the label picker opens on the right of "Add label", the "+" or a label chip, or on its left when the
  panel lacks room. A group label's chip opens the group's labels beside it, not below it.
- Issue page: a property's picker opens 2 px under its line instead of 6 px.
- Issue page: a control stays lit while the popup it opened is open. The "+" after the labels lights its circle under
  the pointer too.

### Fixed

- Issue page: `L`, a property's key and `⌘` `⇧` `M` open their popup next to their control, as a click does. They open
  at the pointer only until the pointer first moves after the page slides in, and while the control is out of sight.
- Issue page: a click on an empty area gives the panel the keyboard, as on the list, and a click in a text field's
  padding gives the field the keyboard. The panel's focus outline stays while a text field or a comment's text has the
  keyboard.
- The label picker and a label group's page fit their content: as wide as their longest label or search text, and as
  tall as their labels. A group of three labels no longer gets an empty fourth row, nor a 240 px width.
- The panel posts a comment once, however often Send is pressed while the comment is on its way.
- A change that gets no answer within 30 seconds fails with an error, as a load does, instead of keeping the spinner
  up until Herdr restarts.
- A merge request's card leaves out its changes and reviewers when the tracker refuses to send them, instead of showing
  an error in the panel at each hover.
- The panel starts and works when it cannot read or write its storage; its settings then last until Herdr restarts.

## 2026-11-27

### Added

- Copy menu: "Copy diff links" copies an issue's diffs as a bullet points list with Gitlab or Github emoji and its
  repository and number linked to it. Each is listed once, and closed ones are left out.
- Copy menu shortcuts: `⌘` `⌥` `M` for "Copy issue as Markdown" and `⌘` `⌥` `X` for "Copy diff links" (`Ctrl` `Alt`
  off macOS).
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
