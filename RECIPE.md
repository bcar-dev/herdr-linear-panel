# Linear issues

Not affiliated with or endorsed by Linear. A side panel that lists the Linear issues assigned to you, grouped by status,
with the current cycle first. From a row you open the issue, change its status, priority, assignee, estimate or cycle,
or start work on it: a git worktree on the issue's branch, a new space there, and the person's agent briefed with the
issue. A button in the top bar shows and hides the panel.

![Linear issues](preview.png)

## What you see

**Top bar.** A "Linear" button to the right of the tab bar's Files and Changes buttons: 26 px high, Linear's logomark at
14 px and the label, highlighted while the panel shows. The logomark is Linear's own file, drawn as a picture in its own
color (`image()`, not `svg()`, which would tint it): the white one on a dark theme, the dark one on a light theme, told
by the lightness of the theme's `chrome` color.

**Panel**, in the right-hand side panel (368 px wide by default), top to bottom:

- A 42 px header: the title, Linear's logomark at 14 px then "Linear", which lights up under the pointer, a badge with
  the issue count ("18 issues", "100+ issues" when a view is cut), then at the right three round 26 px buttons with a
  thin border: new issue (a rounded square open at its top right, crossed by a diagonal stroke), display options (two
  sliders) and reload (two arrows in a circle, which stays still).
- Two pills, 28 px high in 13 px text, each a 14 px icon and a label: "Current cycle" (a ring, open at its top left,
  around a play triangle) and "My issues" (four corner brackets around a dot).
- In the cycle view, one dim line naming the cycle and its end date ("Cycle 42 · ends 2026-11-28"), when all listed
  issues share one cycle.
- Errors, in red. Work in progress shows only as the spinner in the middle of the panel: no line comes and goes above
  the list, so the issues never shift.
- The list. Each status has a header and its issues under it. The header is 30 px high, in 13 px semibold: a small arrow
  that folds the group (pointing down, or right once folded), the status's icon, its name, and one figure: a 14 px
  rounded triangle, its right half filled, with the estimate points of its issues, or, after a click on it, the number
  of its issues without the triangle. A completed status also carries Linear's dim line between the two, truncated when
  the panel is narrow: "Showing issues completed in the past week · Recent first". A row is 28 px high and shows, left
  to right: a 14 px checkbox, drawn only under the pointer or when ticked (its place is kept, so the row never shifts),
  the priority mark, the identifier in a column as wide as the longest one listed (so the status icons line up), the
  status's icon, the title (truncated), when the issue has merge requests their box (below), when the issue is in a
  cycle a 20 px box with round ends and a thin border holding the cycle's 13 px icon and its number, and, when the issue
  has an estimate, a 13 px triangle with it, the triangle and the figure each centered in a column of their own, the
  figure's as wide as the longest estimate listed, so both line up down the list.
- While issues are ticked, a pill in its own 58 px strip under the list, as Linear shows one, which rises from below
  when the first issue is ticked (the strip's height goes from 0 to 58 px in 180 ms, `transition("height", ...)`, with
  the pill hung 8 px under its top): "2 selected", a dot, the triangle with their estimate points, an "Actions" button
  with a command-key icon, and a cross.

**Priority marks** follow Linear's, 14 px, drawn for this mod: urgent is a rounded square with "!", orange (`#f2793a`)
on an open issue and gray on a finished one; high, medium and low are three bars with 3, 2 and 1 lit; none is three
dashes.

**Status icons** follow Linear's, 14 px, drawn for this mod, in the status's own Linear color: a dashed ring for
backlog, a ring for unstarted, a ring around a pie for started, a disc with a check for completed, with a cross for
canceled, with two slanted strokes for duplicate, and with a double arrow for triage. A started status's pie fills by
its place among its team's started statuses, as in Linear: half for the only one, half then three quarters for two, even
steps for more.

**Popups**, at the pointer, rows 31 px high. Each draws its own box: the popover color, a 1 px border, corners rounded
by 10 px and a shadow. Each is as narrow as its content allows:

- Issue menu, 228 px wide, after Linear's: the identifier and title, then "Status" `S`, "Priority" `P`, "Assignee" `A`,
  "Estimate" `⇧` `E` and "Cycle" `⇧` `C`, each with an icon like Linear's, its key drawn as small key boxes, and an
  arrow; a rule; "Copy" with an arrow and "Open in Linear"; a rule; "Start with Claude Code…", which names the agent
  Start will run and is left out with its rule while there is none.
- A property's choices, as wide as their longest label needs, between 208 and 300 px: a chip naming the issue ("BACK-12
  · its title", cut to fit; left out beside the issue menu, which names it, and when the row's own status icon or
  estimate opened the choices), a title ("Change status…", "Change priority to…"), then 32 px rows as in the command
  window, with the keys `1` to `9` (`0` to `4` for priorities), each status with its icon, and the current value ticked.
  The assignee's title is a field that filters the team's members, each shown by username with their initials on their
  Linear color. "No estimate" has a triangle reduced to its three corners, as in Linear. The cycle's title is a field,
  "Move to cycle…", that filters by name, days and standing; its rows are "No cycle" (a dashed ring), then the team's
  current cycle and those to come in order, then the previous one, each "Cycle 88" followed, dimmed, by its days and,
  when Linear words it, where it stands: "Nov 10 - Nov 23 · Current", "Nov 24 - Dec 7 · Upcoming", "Oct 27 - Nov 9 ·
  Previous". Older cycles are left out. More than sixteen rows scroll.
- Copy, as wide as its longest entry needs, between 220 and 340 px, Linear's eight entries, each with an icon like
  Linear's and its shortcut as key boxes: "Copy ID" `⌘` `.`, "Copy URL" `⌘` `⇧` `,`, "Copy title" `⌘` `⇧` `'`, "Copy
  title as link" `⌘` `C`, "Copy issue as Markdown", "Copy everything as Markdown" `⌘` `⌥` `C`, "Copy git branch name"
  `⌘` `⇧` `.`, "Copy as prompt" `⌘` `⌥` `P`. Off macOS they read `Ctrl` and `Alt`. On several issues they read "Copy
  IDs", "Copy URLs", "Copy titles", "Copy titles as links", "Copy issues as Markdown", "Copy everything as Markdown" and
  "Copy git branch name", and "Copy as prompt" is left out.
- Start, 280 px wide: "Start BACK-12 with Claude Code" (the agent's name), a one-line input and a "Start" button.
- New issue, as wide as the longest team name needs, between 200 and 300 px: the line "New issue in…" and a row per team
  you belong to, its key then its name.
- The command window, a centered 460 × 380 px dialog, after Linear's: a chip ("2 issues", or the identifier and title of
  a single one), a title line, then rows of 32 px, each an icon, a label and its key in a small bordered box. Its first
  page lists, with Linear's wording and keys and icons like its own, "Assign to…" `A`, "Un-assign from me" `I`, "Change
  status…" `S`, "Change priority…" `P`, "Change estimate…" `⇧` `E` (when the issues' teams have estimates in common)
  and "Move to cycle…" `⇧` `C` (when the issues are all of one team, which has cycles).
  "Change" reads "Set" where no issue has a priority or an estimate yet. A key with a modifier shows as one box per key.
  The row under the keyboard cursor is highlighted. A choice all the issues already have is ticked; one only some have
  shows a dash.
- Display options, 280 px wide, under the header by the panel's right edge, three 34 px lines as in Linear, the first
  two together and a 1 px separator before the third. "Ordering": a round direction button (a down arrow beside three
  shortening lines, an up arrow when the order is reversed) and a 124 px dropdown naming the field, with a chevron.
  "Order completed by recency": a 32 × 18 px switch, accent-colored with its knob at the right when on. "Completed
  issues", below the separator: a dropdown naming the period.

**Without a key** the panel shows three setup steps and a command with a "Copy" button: the one that stores the key in
the macOS Keychain, in the keyring on Linux (`secret-tool`), or, on Windows, `setx LINEAR_API_KEY KEY`.

All colors come from the theme, except the status icons, which use Linear's colors (as its app draws them: the API's
default green `#0f783c` shows as `#27a644`), the orange of an urgent issue, and, in the list of people, each member's
own color under white initials. A person's own colors go in their `settings.json` (`"colors": { "accent": ...,
"background": ... }`), never in the mod.

## How it behaves

**Loading.** A change to an issue, and a load someone asked for (the first one, the reload button or `r`, a changed
option), shows a 40 px round spinner in the very middle of the panel, over the list, for at least 0.6 s: Linear often
answers too fast for it to be seen otherwise. The 60 s reloads show nothing. The panel loads when it first shows, then
every 60 s while it shows. A hidden panel does not poll; showing it again after more than 60 s reloads at once. The
refresh icon reloads on demand, and every action reloads when it ends.

**Views.** "Current cycle" lists your issues in the active cycle. "My issues" lists all of them. Open issues always
show. "Completed issues" decides which finished ones (completed, canceled, duplicate) join them, in both views: "All",
"Past day", "Past week" (the default), "Past month" (30 days), "Current cycle" (those of the active cycle) or "None".
Linear applies the filter, so changing it reloads. Each view holds the 100 most recently updated issues.

**Folding.** A click on a header's arrow hides the issues of that status and leaves its header, which still takes a
drop; another click shows them again. Folded statuses are remembered by name, and their issues are left out of a
Shift+click's range.

**Group totals.** A click on a header's figure switches every header between estimate points and issue counts; the
figure lightens under the pointer to show it can be clicked, and the choice is remembered. A header's points are
Linear's: an issue without an estimate counts for its team's default estimate (`defaultIssueEstimate`, 1 for most
teams), though its row shows no triangle.

**The completed line.** "Showing issues completed in the past week", "in the past month" or "during the current cycle"
follows the "Completed issues" choice; the other choices say nothing. " · Recent first" is added while "Order completed
by recency" is on.

**Grouping and order.** Issues are always grouped by status. Groups run started, unstarted, backlog, triage, completed,
canceled, duplicate; within one type, the status furthest along the workflow comes first. The display button opens the
display options. A dropdown swaps the popup's content for its choices in 21 px rows, the current one ticked; picking one
swaps back. "Priority" orders the issues inside a group, most urgent first and unprioritized last. "Title" orders them
as Linear does: case ignored, punctuation before digits before letters, so "[Cron] acquirer" precedes "Refuse". "Status"
orders the groups. The direction button reverses the chosen order and leaves the other alone; its arrow points down for
the orders above, as in Linear, and up when reversed. With "Order completed by recency" on, which is the default,
completed, canceled and duplicate groups ignore the ordering and list their most recently finished issue first. The
popup stays open after a choice, and the list behind it reorders at once. The view and every display option are
remembered.

**On a row:**

- Click opens the issue in the Linear desktop app, and in the browser when no app claims its `linear://` link.
- While a menu or a list of choices is open on an issue, its row stays lit and the other rows stop lighting up under the
  pointer, so it is clear which one is being changed. The popup records the issue in the shared key `linear-panel.open`
  with its own overlay id, and clears it in the View's `close()` if it still owns it.
- Right-click opens the issue menu. On one of several ticked issues the menu is about all of them: it reads "3 issues",
  offers the properties their teams share and Copy, and leaves out "Open in Linear" and "Start with …". An entry
  with an arrow shows its page beside the menu once the pointer rests on it, as Linear's submenus do, on the right when
  there is room, else on the left; another entry replaces that page. A pick in the page closes both. The menu takes the
  keys beside its entries; a key opens the page in place of the menu, where it names the issue and keeps its row lit.
- Click on the status icon opens the status list. Picking a status sets it.
- Click on the priority mark opens the priorities; picking one sets it. The mark brightens under the pointer, with no
  background, as do the estimate and a header's arrow and figure; an urgent mark keeps its orange, and a row's status
  icon turns a brighter shade of its own color (every channel 32 % stronger, as measured in Linear: a brighter green,
  not a paler one).
- When the issue has merge requests (GitLab) or pull requests (GitHub) linked in Linear, a box like the cycle's sits
  left of it: the pull request icon and, for one, its number (`!3463` on GitLab, `#47` on GitHub), for several, their
  count (`3 PRs`). The icon is blue (`#5e6ad2`) when they are all merged, green (`#4cb782`) when none is, its left half
  blue and its right half green when some are; closed ones count only when all are closed, and then it is red
  (`#eb5757`). Click opens every one of them in the browser, each in its own tab. Right-click does nothing.
- Click on the cycle opens the cycle's page (`/team/FRONT/cycle/144` under the workspace's address) in the Linear
  desktop app, else in the browser, as a click on the row does for the issue.
- Right-click on the cycle opens its choices, at the pointer, in place of the issue menu a right-click elsewhere on the
  row opens. Picking one moves the issue there; "No cycle" takes it out. An issue in no cycle shows no box: the menu's
  "Cycle" gives it one. Teams without cycles offer neither.
- Click on the estimate opens its choices. Picking a value sets it; "No estimate" clears it. An issue without an
  estimate shows no triangle: the menu's "Estimate" gives it one. Teams that do not estimate offer neither.
- The checkbox shows while the pointer is on the row, its outline in the theme's accent while the pointer is on the
  checkbox itself, and stays once ticked, filled with the accent. A click on it, or `x` with the pointer on the row,
  ticks the issue; its tooltip reads "Select issue" `X`. A ticked row is washed with the theme's accent (about 20 %
  opaque, 30 % under the pointer), as Linear tints its selection, and ticked rows that follow each other in a status
  read as one box: their corners are square where they meet. Shift+click ticks every issue from the last checkbox
  clicked to this one, in the order shown and across statuses, as Linear does. Once nothing is ticked, that starting
  point is forgotten: the next Shift+click, or Shift+`x`, ticks one issue.
- Drag onto another status, its header or any of its rows, moves the issue there. Once the pointer leaves the spot of
  the press, a copy of the issue (priority mark, identifier, title, in an accent-bordered box with a shadow) follows it,
  the row fades to half, and the theme's accent outlines the whole target group, header and rows, as in Linear. A ticked
  row carries every ticked issue with it, and the copy shows a "+2" badge for the others. Releasing anywhere else
  cancels. Only statuses that have issues in the list are targets; the status list reaches the others.

**Ticked issues.** The pill counts them and totals their points as the headers do. "Actions", or Cmd+K (Ctrl+K off
macOS), opens the command window on them; the cross, or Escape, unticks them all. Switching views clears the ticks. A
ticked issue that leaves the view shown is unticked, and so are the issues of a status that is folded: nothing is done
to an issue that cannot be seen.

**The command window.** An action ending in "…" opens a page of choices; the others act at once, in one request. Arrows
and Enter move and pick, a row's key picks it directly, a click too. Escape goes back to the actions, or closes the
window when a key opened that page directly.

- "Assign to…" lists the members of the issues' team by username, with their initials on their color, and a field that
  filters them as you type; you are ticked.
- "Change status…" lists the team's statuses in workflow order, the first nine on `1` to `9`.
- "Change priority…" lists "No priority" `0`, "Urgent" `1`, "High" `2`, "Medium" `3`, "Low" `4`.
- Issues of several teams are offered what all their teams have: the people in every team, the statuses every team
  names, the estimates every team's scale has. Each issue then takes its own team's status of that name.

**The title.** A click on "Linear" brings the Linear app to the front (`open -a Linear` on macOS, its `linear://`
address elsewhere), or opens linear.app in the browser when the app is not installed. Its tooltip says "Open Linear".

**New issue.** The button, or the key `c` as in Linear, lists the teams you belong to. Picking one opens Linear's own
composer on that team, with you as assignee; the issue is written and created there. With a single team, the composer
opens at once.

**Keys.** Any press in the panel, on a row, a button, a checkbox or empty space, gives it the keyboard, and the theme's
accent then outlines the panel, as it outlines a focused pane (the root's `focus` style). While one of its popups is
open, the panel keeps that outline, and it has the keyboard again once the popup is dismissed with Escape or by a
choice: `p` then Escape leaves the keys with the panel, not with the terminal. A popup closed by a click beside it
leaves the keyboard where that click puts it. Then `c` opens New issue, `r` reloads, Shift+`v` opens the display
options, and a digit shows the view in that place: `1` "Current cycle", `2` "My issues". The digits follow the views'
list, so a view added there answers to the next one. With issues ticked, Cmd+K (Ctrl+K off macOS) opens the command
window, `a`, `s`, `p`, Shift+`e` and Shift+`c` open its assign, status, priority, estimate and cycle pages, `i`
un-assigns them from you, and Escape unticks them. With none ticked, the same five keys open those choices for the issue
under the pointer, at the pointer, and `i` un-assigns it. `x` ticks or unticks the issue under the pointer, and
Shift+`x` ticks the range to it, as a Shift+click on its checkbox does. A control's tooltip shows once the pointer has
rested on it for a second, or at once when the pointer comes from a control whose tooltip was showing less than half a
second before, so that two issues can be compared without a second wait; it names the control and draws its shortcut as
key boxes, as Linear does: "Create new issue" `C`, "Show display options" `⇧` `V`, "Reload" `R`, "My issues" `2`, "Open
command menu" `⌘` `K`, "Clear selected" `Esc`, and on a row "Change priority" `P`, "Change estimate" `⇧` `E` and "Change
status" `S`; a row's cycle has the cycle card instead. A tooltip is centered under its control, or pushed back inside
the panel near an edge, and sits above a control the panel has no room under.

**Time in status.** The tooltip of a row's status says more, as Linear's does: the line "Time in status", then a line
for each status the issue has been in, in the order it first entered them, with the status's icon, its name and the time
spent there over all its stays ("5s", "44min", "3h", "3d", "52w": the longest unit that fits, rounded, weeks at most).
The status the issue is in now is in the foreground color, the others muted. A rule, then "Change status" `S` at the two
ends of the last line. The stays are asked from the API when the pointer comes on the status (`issue.stateHistory`),
once an issue, and again after its status has changed. Until the answer comes, or if it fails, the tooltip shows its
last line alone.

**The cycle card.** The tooltip of a row's cycle is Linear's card on a cycle alone, with no label or keys under it, laid
out as Linear's (22 px lines, 20 for the description, 15 px from each side): the cycle's icon and name; the first line
of its description, muted, where a team writes its capacity ("Capacity: 40 pts"); a rule; then,
for a cycle under way or ended, the share of its scope done (`progress`, as an indigo pie filled by eighths and a
percentage) "of" its scope in points (the last of `scopeHistory`), "of" muted and the figures not, and for a cycle to
come, which has no history, the estimate triangle and the points planned in it: the estimates of its issues, an issue
without one counting for its team's default as in a header, triage, canceled and duplicate issues left out. Those are
asked of Linear when the pointer comes on the cycle, and again after a load. Then, 16 px further each, in the text's
color: where it stands with, for the current cycle, the weekdays left ("1 weekday left": today counts, weekends do not),
or else its days ("Upcoming Nov 24 - Dec 7"). The card is as wide as its widest line, reckoned at 6 px a character, 320
px at most. Where a cycle stands is told by its dates and its team's cycles, not by the API's flags, so it stays right
between loads: current while it runs, "Upcoming" for the first to come, "Previous" for the last ended. Its icon follows,
after Linear's: a ring open at its top left around a play triangle, in Linear's indigo (`#5e6ad2`), for the current one;
a closed ring for the next; a dashed ring for later ones; a ring open at its bottom right, where a check sits, for those
ended.

**The merge request card.** The tooltip of a row's merge requests is a card alone, with no label or keys under it. Each
merge request leads with its icon in its color (Lucide's merge icon when merged, its pull request icon when open, its
closed pull request icon when closed), its title, and at the right its author's initials (the first two letters of
their login, uppercased: "BE" for `benjamin.carlier`) in white on a blue round (`#1d8cf0`): a mod cannot show a picture
from an address. For one merge request, the title takes up to two lines; under it, muted, its repository and number
("nuxt-frontend!3463"); then "Merged 23h ago", "Closed 2d ago" or "Opened 3h ago" (the time as the status tooltip tells
it), " · 6 files", "+41" in green and "-4" in red, and at the right the initials of each reviewer who submitted a
review, followed by a green check when they approved. For several, a block each, eight at most and then "5 more": the
title on one line, and under it, muted, the repository with its owner ("worklife-io/iam!599"), then " · Reviewed by
amalchaker" ("a and b", "a, b and c") when someone submitted a review. The files, the lines and the reviewers are asked
of Linear when the pointer comes on the merge requests, and again after a load: until the answer comes the files read
"…"; if it fails, the card goes without them.

**Start** ("Start with …" in the issue menu, then the button or Enter), in order, stopping at the first failure:

1. Forgets checkouts deleted by hand (`git worktree prune`) and finds the git repository of the focused pane's folder.
2. Reads the issue's description.
3. Reuses the checkout that already has the issue's branch, or adds a worktree at `<worktrees.directory>/<repo>/<branch
   as a folder name>`. An existing branch is checked out; a new one starts from HEAD.
4. Sets the issue to the team's "In Progress" status, or its first started status when none has that name. An issue
   already there or further along is left alone.
5. Opens a new space in the checkout, its tab named after the identifier, running the agent with a first message in
   three parts, a blank line between them: the base prompt of the settings, the text typed for this issue, then the
   issue exactly as "Copy as prompt" gives it. An empty part is left out.

**The agent and the settings.** Nothing names an agent in the mod. The panel asks Herdr once for the agents people can
start (`knownAgents()`: the entries of its table of programs that have a `run`, most picked first, each installed or
not) and Start runs the first installed one, with `argv` its `run`. The person's settings are the props of the panel's
block in their layout: `agent`, the key of the agent to run instead (taken even when Herdr says it is not installed; an
unknown key falls back on the first installed), `start_prompt`, the base prompt, as one text or a list of lines, and
`api`, an address that requests go to instead of the tracker's API (a stand-in that serves made-up issues, for a demo or
a screenshot; the key is sent there too). The panel hands the agent's name to the issue menu and, through it, to the
Start field: a popup is another copy and does not see the panel's props. With no agent, the menu has no Start, and a
start asked anyway fails with "No agent to start".

**Copy.** Each entry, or its shortcut, puts text on the clipboard and says so in a toast. The shortcuts work in the Copy
page, and in the panel on the ticked issues, else on the issue under the pointer. Several issues are copied from the top
of the list down: one line each for IDs, URLs, links and branch names; "IDENTIFIER: title" a line for titles; and for
the Markdown entries one document each, separated by a blank line, `---` and a blank line. The entries: the identifier,
the URL, the title, the title as a Markdown link, the issue as Markdown ("# title", then the description), the same
followed by its comments (author, date, text, oldest first), the branch name, or a prompt for an agent ("Work on Linear
issue BACK-12: title", the description, the URL). The description and comments are read from Linear when an entry needs
them.

**Errors.** A failed load shows Linear's message in red under the pills and keeps the last list. A failed action shows
"BACK-12: message" in red until clicked. The mod shows no agent status.

## Built from

**Files** in `mods/linear-panel/`:

- `mod.json`: `{ "place": "none", "title": "Linear issues" }`.
- `main.js`: the one `View`. It only picks a part by `props().part` and draws it. No `part`: the panel, whose props are
  the person's settings (`agent`, `start_prompt`, `api`). `{ part: "button" }`: the top-bar button. The other parts are
  popups: `"issue-menu"` (`issues`, `teams`, `me`, `agent`, `frame`, `origin`), `"copy-menu"` (`issues`, `parent`),
  `"start"` (`issue`, `agent`), `"display"` (`display`, the current options), `"teams"` (`teams`) and `"commands"`
  (`targets`, `teams`, `page`, `me`; with `compact`, one of its pages as a popup, which is how a property's choices
  show).
- `parts/`: one class per part, each built from `(props, cx)` with a `render(t, cx)`: `panel.js` (the issues, loading,
  requests, keys, drag and drop), `issue-list.js` (the groups, headers and rows it draws), `merge-card.js` (the
  tooltip of a row's merge requests), `setup.js`, `hints.js` (the tooltips), `button.js`, `issue-menu.js` (the menu and
  its Copy page), `start-prompt.js`, `display-options.js`, `team-picker.js`, `commands.js`, and `menu.js` (the rows
  every menu is drawn from).
- `tracker.js`: everything that names Linear, and nothing else does but the mod's folder and its title in `mod.json`:
  its name, its addresses, the key's variable and the name it is stored under, the layout id of the panel. Everything
  that differs between macOS, Linux and Windows is there too: how an address is opened, how the key is read, and what
  the setup screen says. `api.js`: the GraphQL queries. One is undocumented: `pullRequests`, the records Linear's own
  app reads for a merge request's files, lines and reviewers. The API answers it but its schema hides it, so Linear can
  change it without notice; only the merge request card's files, lines and reviewers depend on it, and the card goes
  without them when it fails. It filters by the issue's numbers and repository names together (a filter on both inside
  `or` answers unrelated merge requests), so the panel keeps the answers whose `url` is one of the issue's. A merge
  request it tells without its changes is left out, and a reviewer it cannot name, so the others still show. The rest of
  what the row and the card show comes from the issue's attachments, documented, whose `metadata` holds a merge
  request's status, number, title, repository, dates and author. `channel.js`: the four shared keys the popups and the
  panel talk through (a request, the lit row, the open popups, the keyboard given back). `popups.js`: every popup's
  size, place and props. `dock.js`: showing and hiding the panel in the layout. `actions.js`: Copy and Start.
  `config.js`: the mod's name, the paths of its icons and of the logo, the views, the option lists. `ui.js`: key boxes,
  priority and status marks, the cycle's icon, the merge requests' icon and colors, a person's initials on a round, the
  zoom.
- `lib/`: the rules, with no call to Herdr, so node can test them: `color.js` (a brighter shade of a color, whether a
  color is dark), `listing.js` (filters, grouping and order, totals), `teams.js` (workflow order, estimate scales, what
  several teams share, status icons), `cycles.js` (where a cycle stands, which ones the picker offers, its days and
  the weekdays left), `merges.js` (an issue's merge requests: their color, number, repository, reviewers' sentence,
  dates), `keys.js` (what a key press asks for), `copy.js`, `start.js` (the Start status
  rule, the agent picked, the prompt, the folder name, parsing `git worktree list`), `placement.js` (where popups and
  tooltips go, how wide a popup is), `history.js` (the time in each status), `selection.js` and `drag.js` (the ticks and
  the drag as plain state).
- `types.d.ts`: the shapes the files pass around (an issue, a team, a request, each part's props), global so that any
  file names them in JSDoc. Herdr never loads it. `jsconfig.json` is the project's: it turns on every strict check of
  the TypeScript compiler, null checks included, but the one on fields assigned outside a constructor, which Herdr's
  `init` cannot satisfy. Herdr writes `gpui-kit.d.ts`, the types of its API, into the folder. An editor reads both, and
  `pnpm run typecheck` runs the same check and reports nothing.
- `brand/`: Linear's logomark, `logo-light.svg` (white) and `logo-dark.svg`, unchanged from the brand assets Linear
  publishes (linear.app/brand), with a README saying whose they are: trademarks of Linear, covered by no license of the
  project, which is not affiliated with Linear. The button and the panel's title show it, nothing else.
- `icons/`: the mod's own icons.
  - Drawn for this mod from plain shapes (circles, bars, strokes of 1.5 in a 16 px box, round ends), to look like
    Linear's: `create.svg`, `command.svg`, `assign.svg`, `unassign.svg`, `estimate.svg`, `estimate-none.svg`, the eight
    `copy-*.svg`, `priority-0.svg` to `priority-4.svg`, `view-all.svg`, `view-cycle.svg`, `display.svg`, `close.svg`,
    `caret-down.svg`, `caret-right.svg`, and the cycles' `cycle.svg`, `cycle-future.svg`, `cycle-past.svg` and
    `cycle-none.svg` (a ring of radius 6.25, dashed `1.45 1.8225` for the last two), with `view-cycle.svg` for the
    current one.
  - The status icons, in a 14 px box: a ring of radius 6 and width 1.5 (dashed `1.4 1.74` for backlog), a pie drawn as a
    4 px stroke of radius 2 (`status-started-1.svg` to `-7.svg`: exactly one to seven eighths of the circle, from the
    top, clockwise; `status.svg`, the menus' icon for a status, is the same drawing as the half-filled one), and a disc
    of radius 6.75 for the finished ones. An icon has one color, so the check, cross, slashes and arrows are holes in
    the disc (`fill-rule="evenodd"`), not shapes in the background's color. The same goes for the "!" of
    `priority-1.svg` and the letters and lines of `copy-id.svg`, `copy-markdown.svg` and `copy-everything.svg`.
  - From Lucide: `refresh.svg`; `git-pull-request.svg`, `git-merge.svg` and `git-pull-request-closed.svg`, unchanged;
    `clipboard.svg` and `external-link.svg`, with corners rounded further (a radius of 4 where Lucide has 2, the clip
    a pill, the arrow's head turning on a radius of 2); and `sort-down.svg` and `sort-up.svg`, changed from Lucide's.
    `LUCIDE-LICENSE.txt` is their ISC license.
  - The tick, the chevrons, the spinner and the terminal are shipped icons of `mods/workspace-chrome/`.

**Tests**, beside `mods/`, never copied into Herdr: `tests/unit/` checks `lib/` with node's own runner. `tests/parts/`
starts every part in a stand-in for Herdr (`tests/host/`: fake `herdr`, `gpui-kit` and `gpui-base` modules, answered
through a module hook) with a fake Linear behind it, then clicks, presses keys and drags, and reads what was drawn and
what Linear was asked. The stand-in refuses an element method that the installed Herdr's `gpui-kit.d.ts` does not
declare. `pnpm test` runs both.

**Layout.** Shipped layouts are read-only, so the mod sits in a personal clone of `main` (`layout.clone`), edited in two
places:

- The `tabs` block becomes a row `top` (42 px, not resizable) holding `tabs` (weight 1) and a block `linear-button` (80
  px, `window_drag`) with content `{ "mod": "linear-panel", "props": { "part": "button" } }`.
- The `panel-body` stack gains a child block with id `linear` and content `{ "mod": "linear-panel" }`. That block's
  `props`, if any, are the person's settings.

`examples/main-linear.json`, in the mod's folder, is that layout whole, made from `main` at version 0.1.16. Its panel
block has one setting, a `start_prompt` whose lines say what it is for and ask to be replaced. A person copies the file
into `layouts/` to get the window in one step.

The id `linear` matters (`SLOT` in `tracker.js`): the code tests `panel-body`'s active child against it, and adds
`"linear"` to the shared list `workspace.panels` so the shipped tab bar restores the panel per space.

**The key.** On macOS and Linux, `sh -c` prints `$LINEAR_API_KEY` when set, else the item `herdr-linear` of the system's
store: the Keychain (`security find-generic-password -s herdr-linear -w`) or the keyring (`secret-tool lookup service
herdr-linear`). On Windows, which has no command to read its own store, `cmd /c echo %LINEAR_API_KEY%` reads the
variable; cmd answers the name itself when the variable is not set, which counts as no key. Nothing is stored in the
mod.

**Linear GraphQL** (`https://api.linear.app/graphql`, the key as the `Authorization` header):

- `viewer.id`, and `viewer.teams(first: 50)`, key and name, for New issue; in the same query as the issues.
- `viewer.assignedIssues` twice in one query, each `first: 100, orderBy: updatedAt`, with the two views' filters passed
  as `IssueFilter` variables. `filters` in `lib/listing.js` builds them from the "Completed issues" choice: `cycle: {
  isActive: { eq: true } }` for the cycle view, combined through `and` / `or` with `state: { type: { nin: [...] } }`,
  `completedAt: { gte }` and `canceledAt: { gte }`. Fields: id, identifier, title, url, priority, estimate, branchName,
  completedAt, canceledAt, state, team id, and the cycle: id, number, name, description, startsAt, endsAt, progress,
  scopeHistory.
- `teams(first: 10, filter: { id: { in: $ids } })` with `states(first: 50)`, the three `issueEstimation*` fields
  `defaultIssueEstimate`, `members(first: 100)` (name, username, initials and color) and `cycles(first: 20)` filtered
  by `or: [{ isPast: { eq: false } }, { isPrevious: { eq: true } }]` (id, number, name, startsAt, endsAt), asked once
  per team.
- `issue(id).description`, at Start and for the Copy entries that carry it; with `comments(first: 50)` (body, date,
  author) for "Copy everything as Markdown".
- `issue(id).stateHistory(first: 100)` (startedAt, endedAt, state), when the pointer comes on a row's status, for the
  time in each status.
- `cycle(id).issues(first: 250)` without triage, canceled and duplicate states (estimate, team id), when the pointer
  comes on a row's cycle that has not started, for the points planned in it.
- `issueBatchUpdate(ids, input)` for every change, with `stateId`, `estimate`, `priority`, `assigneeId` (null
  un-assigns) or `cycleId` (null takes the issue out of its cycle).

**From `herdr`:** `exec`, `run`, `layout`, `props`, `shared`, `setShared`, `theme`, `settings` (the zoom), `window`,
`notify`, `spaces`, `panes`, `focused`, `home`, `appHome`, `readTextFile`, `knownAgents`, `openOverlay`, `closeOverlay`.
Also `fetch`, `localStorage`, `cx.timer`, `cx.spawn` and `cx.write_to_clipboard`.

**Commands:** `layout.select`, `layout.show`, `layout.hide`, `space.new` (`folder`, `tab`, `argv`: the agent's `run`,
`task`).

**Outside its folder.** The mod reaches the network (Linear's API, or the address the `api` setting names), runs the
programs below, reads Herdr's `settings.json` (for `worktrees.directory`, at Start) and writes to the clipboard.

**Programs:** `git` everywhere; `sh`, `security` and `open` on macOS; `sh`, `secret-tool` and `xdg-open` on Linux;
`cmd`, `reg` and `rundll32` on Windows.

**Drag and drop** has no native support for a mod's own rows. The `Drag` class of `lib/drag.js` holds its state. As the
shipped `spaces` list does, a row's `on_mouse_down` records the pressed issue, `on_mouse_move` on rows and headers
records the status under the pointer, and `on_mouse_up` there drops. The panel's root, `relative()`, tracks the pointer
with its own `on_mouse_move` (`local_position` is then panel-relative) and draws the following copy as its last child,
`absolute()` at that point. A drop sends each issue to its own team's status of that name (`moves` in `lib/teams.js`).

**Popup to panel** (`channel.js`). A popup, or the command window, writes its request to the shared key
`linear-panel.request` as `{ at, ids, kind, ... }` and closes. The display options write the same way but stay open,
keeping their own copy of the options to draw. The panel sees the new `at` in its next render, runs the request, and
remembers that `at`, so the request is served once; the key is left as it is. `kind` is `start` (`text`), `update`
(`input`), `status` (a status by `name`, resolved per team), `copy` (`what`) or `open` (the issue's page in Linear) for
the issues, `compose` (`team`: Linear's composer for a new issue), and `display` (`change`: `by`, `reversed`, `recency`
or `completed`), which the panel applies itself. Opening a page is the panel's work too, never the popup's: it takes two
commands in a row, and a popup that closes loses the second.

## Watch out

- **Write `mod.json` before `main.js`.** Herdr docks a new mod folder the first time it sees it. Without `"place":
  "none"` already there, it adds a fixed copy of the panel to the layout's root. If that happens, delete that block from
  the layout file.
- **A drag must not outlive its press.** A release outside the panel reaches no handler, so the drag would stay armed
  and move its issue on a later, unrelated release over a row. The panel's root ends it on any release that reaches it,
  on a press outside the panel (`on_mouse_down_out`), and on a press inside that did not start on a row; a row's
  controls end it too. Because the row handles presses and releases itself, it opens the issue in `on_mouse_up`, not
  `on_click`.
- **Keep the following copy off the pointer.** It is drawn 14 px right and 10 px below. Under the pointer it would take
  the release meant for the group beneath. It cannot leave the panel either: a mod draws only inside its block.
- **The pill is not drawn over the list.** A mod element laid over others does not stop the mouse: a press on it would
  also reach the row behind, open its issue or start a drag. The pill has its own strip instead. The command window is a
  `dialog` overlay, which Herdr centers and which takes the keyboard; it focuses its own handle so its keys work at
  once.
- **A handler that starts a load must ask for the redraw.** `reload` only sets the loading state. A click or a key calls
  `cx.notify()` after it, or nothing shows until the load ends. `reload` cannot do it itself: `render` also calls it,
  and a `cx.notify()` at the top of the task spawned from there left the load hanging for ever, with no error in
  `herdr-app status`.
- **`herdr-app check` proves little here.** It renders the panel once, with no issues: code that only runs for a row, or
  for one kind of row, is not reached. A constant used only for open urgent issues went missing and the check passed,
  while "My issues" showed "This view could not be re-rendered". `herdr-app status` listed no error either. The tests in
  `tests/parts/` draw every part with issues and catch this; still look at the panel, in each view.
- **Places come in window pixels, lengths go out scaled by the zoom.** Herdr multiplies every length a mod gives it by
  the person's zoom (`settings().zoom`), a popup's size included, and tells where the pointer and an element are
  (`e.position`, `e.bounds`) in window pixels. A place read from an event is divided by the zoom before it becomes an
  offset (a tooltip, the carried issue), and a popup's size is multiplied by it before the popup is fitted inside the
  panel. Otherwise, at zoom 1.1, a tooltip hangs too low by a tenth of its distance from the panel's top.
- **Tooltips are the mod's own.** Herdr's `tooltip()` takes text only. `Hints.on()` records the hovered control's bounds
  (`on_mouse_move`) and clears them when the pointer leaves (`on_hover`); the root draws the bubble as an absolute
  child, under the control, or above it when the panel has no room for the bubble's height under it. A mod cannot
  measure text, so the bubble's width is reckoned (6.3 px a character, 20 px or more a key; a status's times have a set
  width). Centered, the bubble sits in the middle of an absolute row that reaches as far on each side of the control's
  middle as the panel's nearer edge (`justify_center`), so an error in the reckoned width does not shift it; when that
  width would pass an edge of the panel, the bubble is set against that edge instead (`left` or `right` of 4 px). Two
  gaps that shrink around the bubble (`flex_shrink`) do not center it: Herdr laid them out about 40 px off. An element
  takes one `on_hover`: a control that needs its own passes it to `Hints.on()`.
- **Two popups can be open at once**, which the issue menu uses for its pages. A page gets the menu's overlay id
  (`parent`) and closes it after a pick. The menu does not close its page when it closes itself: a click in the page may
  count as a click outside the menu, and the page would be gone before it took the click.
- **A shifted or Alt-ed key has several spellings.** Depending on the keyboard layer, Shift+comma arrives as `,` or `<`,
  Alt+c as `c` or `ç`. `copyShortcut` in `lib/keys.js` accepts each. These chords were not pressed in this build.
- **A mod shows images from Herdr's own folder only.** `image()` given a web address draws nothing, so members have no
  pictures here: showing them would mean downloading each one, which this mod does not do.
- **A popup cannot do the work.** It closes before the work ends, and a closing copy's tasks are cancelled. Hence the
  shared key. The panel records the key's `at` when it starts, so a request left over from a restart or reload is not
  replayed.
- **Popups draw their own box.** Herdr's frame has corners that cannot be made rounder: every popup and the command
  window open with `frame: "none"`, and the part draws the background, border, corners and shadow (`boxed()` in
  `parts/menu.js`). The border is inside the size the opener gives, so each height below counts its 2 px.
- **Popups are as tall as their content, and are cut at the window's edge.** A list that only flexes (`flex_1`)
  collapses to nothing in a popup: give it a height. Herdr does not move a popup that would pass the window's bottom:
  the opener passes `at`, the press pulled back inside the panel (whose bounds a root `on_mouse_move` records), so it
  needs the height in advance: rows × 31 + 12 for the Copy page; rows × 31 + 56 for the issue menu (47 on several
  issues); 80 for Start; 48 + rows × 32 for a property's choices, plus 28 with its chip; 38 plus 31 a team for New
  issue; 138 for the display options: its three lines and separator, which is also what the six period choices need at
  21 px a row.
- **Linear prices a query by its page sizes.** Nested connections at the default size (50 × 50) exceed the complexity
  limit. Give every connection an explicit `first`.
- **Check queries without a key.** Linear validates before it authenticates: a malformed query answers
  `GRAPHQL_VALIDATION_FAILED`, a well-formed one `AUTHENTICATION_ERROR`. A filter passed as a variable is not validated
  this way: inline a sample of it in a throwaway query to check its field names.
- **Status types include `duplicate`**, besides triage, backlog, unstarted, started, completed and canceled. A type
  missing from the order lists sorts first.
- **Estimate scales** are fixed in `lib/teams.js`: fibonacci 1 2 3 5 8 (extended 13 21), exponential 1 2 4 8 16 (32 64),
  linear 1 2 3 4 5 (6 7), tShirt XS to XL stored as 1 2 3 5 8 (XXL and XXXL as 13 21), plus 0 when the team allows it.
- **`localeCompare` compares code units here.** The mod runtime has no ICU and ignores the options, so "Start" sorts
  before "[Cron]" and "BACK-100" before "BACK-9". Node has ICU: a test that passes there proves nothing.
  `lib/listing.js` spells out the title and identifier orders.
- **A child cannot be styled by its row's hover.** `hover()` styles the hovered element only, and there is no group
  hover. The checkbox therefore follows the panel's own record of the row under the pointer (`on_hover`, then
  `cx.notify()`), and is `invisible()` otherwise, which keeps its place.
- **Types go in JSDoc, and host types are named in `types.d.ts`, never imported in a comment.** `herdr-app check` takes
  `import("gpui-kit")` inside a comment of a `.js` file for a real import and writes `gpui-kit.d.ts` into that file's
  folder. Those host types also drop `x` and `y` from an element's bounds (an `extends` the checker rejects), which
  `types.d.ts` adds back.
- **A hover style does not recolor an icon.** `hover()` recolors the element's text, but an `svg()` takes its color when
  it is described. A mark made of an icon (a row's priority and estimate, a header's arrow and figure) therefore
  brightens through the panel's own note of the mark under the pointer (`on_hover`, then `cx.notify()`), not through
  `hover()`.
- **An icon has one color.** `svg()` paints a file's shapes in the text color, whatever colors the file names. A mark on
  a filled shape must be a hole in it.
- **A linked mod folder is loaded but not watched.** With `mods/linear-panel` a symbolic link to a checkout elsewhere,
  saving a file there reloads nothing. Touching the link does (`touch -h`), which is what `pnpm run reload` runs.
- **Text in a mod cannot be selected.** Anything the person must copy needs a Copy button.
- **Start has no repository of its own.** It uses the focused pane's. In a repository with submodules, the new
  worktree's submodules are empty until checked out.
- **A popup's close hands the keyboard to the terminal, and Escape never reaches the popup.** Herdr closes a popup or a
  dialog on Escape by itself, before the mod's `on_key_down` sees the key, so a popup's own key handler cannot be where
  the keyboard is given back. A mod that wants Escape binds it for itself, as the command window does to go back one
  page: `cx.bind_keys([{ keystroke: "escape", action, context }])` when it starts, then `key_context(context)` and
  `on_action(action, ...)` on its root (the shipped `win98` menu does the same). That binding was not pressed in this
  build. About 10 ms after a popup goes, Herdr gives the keyboard to the terminal, whoever had it before. It gives it
  back to a mod only when the mod is `"focusable": true` in `mod.json` and got the keyboard through pane navigation
  (`pane.go`), not through a click, which is how this panel gets it. So every popup stamps the shared key
  `linear-panel.keyboard` in the View's `close()`, however it was closed. The panel sees the stamp when it next draws
  and focuses its handle from timers set there (1, 8, 30 and 150 ms), unless another popup is still open; the first one
  fires about 23 ms after the popup went, so the terminal holds the keyboard for a frame. Until the last timer the panel
  keeps its accent outline, so its own border does not blink. Three things do not work: focusing the handle while
  drawing (the drawing stops there), a focus from the popup's `close()` (Herdr's hand-over comes after it and wins), and
  waking a task of the panel from the popup through a promise in the module the copies share (the task resumes in the
  popup's turn, where its timers never fire). Two cases stamp nothing: a press beside the popup closed it (the popup's
  root notes it in `on_mouse_down_out`), since that press says where the keyboard goes; and the popup only made way for
  another one. Each popup lists its overlay id in the shared key `linear-panel.popups` while it is open, which is how
  the panel knows to keep its outline; the panel empties the list when it starts.
- **Keys need focus, and there is no key map to edit.** The panel's root tracks a focus handle and reads keys in
  `on_key_down`; nothing is added to `keys.json`, which Herdr stops updating once edited. The keys work only after a
  click in the panel, and never while a popup's input is being typed in.
- **Links to Linear.** Linear's docs give the desktop form: the same URL with `linear://` in place of `https://`
  (`linear://linear.app/...`). A new issue is `https://linear.app/team/<KEY>/new`, here with `?assignee=me`. `open` on
  macOS and `xdg-open` on Linux fail when no app claims the scheme, which is the cue to open the https URL. Windows asks
  the person what to do instead of failing, so there `reg query HKCR\linear /ve` says first whether the app is
  installed, and `rundll32 url.dll,FileProtocolHandler` opens the address that fits.
- **A group's outline must not move the list.** Each status group always has a 1 px border, in the background's color; a
  drag only recolors it.
- **Limits.** 100 issues per view ("All" completed issues soon exceeds it), 10 teams, 50 issues per batch change. A
  team's statuses and scale are read once: reload the mod after changing them in Linear. Start works for spaces on this
  computer only.
- **The key needs write access** for Start and for every change to an issue.
- **Not exercised by a real pointer or keyboard in this build:** the checkbox under the pointer, its tooltip and `x`,
  the hover pages of the issue menu, and the key chords. The tests drive them through the stand-in for Herdr only.
  Reading `$LINEAR_API_KEY` was not exercised either: the build machine uses the Keychain item. Linux and Windows were
  not run at all: their commands are covered by the tests only, against a stand-in for the system.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/linear-panel` passes, `pnpm test` passes, `pnpm run typecheck` reports
  nothing, and `herdr-app status` lists no errors.
- The "Linear" button shows the panel, and hides it when pressed again. Exactly one copy of the panel exists.
- With no key, the panel shows the setup steps, and "Copy" copies the command. With a wrong key, it shows
  "Authentication required, not authenticated".
- With a key, your cycle's issues appear grouped by status, each with its priority mark, status icon and estimate, and
  each status header shows its estimate points.
- The display button opens the display options; each choice reorders the list as described and survives a restart. With
  recency on, the Done group matches Linear's.
- Clicking a row opens the issue in the Linear app.
- Right-clicking a row opens the menu on that issue; the status icon and the estimate open their lists with the current
  value ticked.
- Picking a status moves the issue to that group after the reload. So does dragging its row onto that group.
- A drag released outside the panel moves nothing, then or later.
- With two issues ticked, a right-click on one of them then Copy offers "Copy IDs" and no prompt, and the clipboard gets
  one line an issue.
- A row shows its checkbox only under the pointer or when ticked, and `x` ticks the row under the pointer.
- Ticking an issue, then Shift+clicking the checkbox of one further down in another status, ticks both and all between;
  ticked rows that touch read as one box.
- Ticking two issues shows the pill with "2 selected" and their points; "Actions" or Cmd+K opens the command window, and
  a status picked there moves both.
- Start on an issue leaves a checkout on its branch, the issue in progress, and a new space where your agent received
  your base prompt, your text and the issue.
- After a click in the panel, `p` on a row then Escape leaves the panel outlined and taking keys.
- Resting the pointer on a row's status shows "Time in status" centered under it, at any zoom; moving to the next row's
  status shows that one at once. Shift+`v` opens the display options.
- With `"agent": "codex"` in the panel's props, the issue menu reads "Start with Codex…"; with no agent installed, it
  has no Start.
- After a click in the panel, `c` opens New issue, `r` reloads, and `1` and `2` switch the view. With issues ticked, `s`
  then `2` gives them the second status. Hovering those controls names their key.
- New issue lists only your teams, and a pick opens Linear's composer on that team.
- A refused change shows "IDENTIFIER: message" in red in the panel.
