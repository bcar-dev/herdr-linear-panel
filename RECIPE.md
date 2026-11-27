# Linear panel

Not affiliated with or endorsed by Linear. A side panel that lists the Linear issues assigned to you, grouped by status,
with the current cycle first. A click on a row opens the issue's page in the panel: its title, edited in place, its
description (read-only), its properties, its labels, its merge requests and its
comments. From a row, its page, its menu or the keyboard
you change an issue's status, priority, assignee, estimate or cycle, and from its page its team and labels, or start
work on it: a git worktree on the issue's branch, a new space there, and the person's agent briefed with the issue. A
button in the top bar shows and hides the panel.

![Linear panel](preview.png)

## What you see

**Top bar.** A "Linear" button to the right of the tab bar's Files and Changes buttons: 26 px high, Linear's logomark at
14 px and the label, highlighted while the panel shows. The logomark is Linear's own file, drawn as a picture in its own
color (`image()`, not `svg()`, which would tint it): the white one on a dark theme, the dark one on a light theme, told
by the lightness of the theme's `chrome` color.

**Panel**, in the right-hand side panel (368 px wide by default), top to bottom:

- Only while no API key is set up, a 42 px header: Linear's logomark at 14 px then "Linear", which lights up under the
  pointer and brings the app to the front, and at the right the reload button (below). Once a key works there is no
  header: the panel starts with the row of controls.
- The row of controls, 8 px in from the sides, 8 px from the top and 6 px above what follows, its parts 4 px apart. Two
  pills, 28 px high in 13 px text, each a 14 px icon and a label: "Current cycle" (a ring, open at its top left, around
  a play triangle) and "My issues" (four corner brackets around a dot). The selected pill is filled with the theme's
  `selected` color in the foreground color; the other is muted and lights up under the pointer, and the selected one
  never changes under it. Then, at the right, three round 26 px buttons with a thin border: new issue (a rounded square
  open at its top right, crossed by a diagonal stroke), display options (two sliders) and reload (two arrows in a
  circle, which stays still).
- A line, 11 px in from the sides, with the view's total: a 22 px high control in 12 px text, in muted, lighter under
  the pointer. It reads the estimate points of the view with the estimate triangle, or, once clicked, the number of
  issues ("18 issues", "1 issue", "100+ issues" when the view is cut); it switches with the group headers' figures
  (**Group totals**).
- Errors, in red. Work in progress shows only as the spinner in the middle of the panel: no line comes and goes above
  the list.
- The list. Each status has a header and its issues under it. The header is 30 px high, in 13 px semibold: a small arrow
  that folds the group (pointing down, or right once folded), the status's icon, its name, and one figure: a 14 px
  rounded triangle, its right half filled, with the estimate points of its issues, or, after a click on it, the number
  of its issues without the triangle. A completed status also carries Linear's dim line after the figure, truncated when
  the panel is narrow: "Showing issues completed in the past week · Recent first". A row is 28 px high and shows, left
  to right: a 14 px checkbox, drawn only under the pointer or when ticked (its place is kept, so the row never shifts),
  the priority mark, the identifier in a column as wide as the longest one listed (so the status icons line up), the
  status's icon 2 px after it, the title (truncated), when the issue has merge requests their box (below), when the
  issue is in a cycle a 20 px box with round ends and a thin border holding the cycle's 13 px icon and its number, and,
  when the issue has an estimate, a 13 px triangle with it, the triangle and the figure each centered in a column of
  their own, the figure's as wide as the longest estimate listed, so both line up down the list. The parts are 8 px
  apart, but the merge requests, the cycle and the estimate keep 3 px between them, the triangle 3 px from the cycle's
  box (its own box has no padding on that side). A view cut at 100 issues ends with the dim line "Showing the first 100
  issues".
- While issues are ticked, a pill in its own 58 px strip under the list, as Linear shows one, which rises from below
  when the first issue is ticked (the strip's height goes from 0 to 58 px in 180 ms, `transition("height", ...)`, with
  the pill hung 8 px under its top): "2 selected", a dot, the triangle with their estimate points, an "Actions" button
  with a command-key icon, and a cross.

**An issue's page** fills the panel's whole height. It slides in from the right edge in 220 ms (it is drawn first at
the edge, 30 ms later where it stays, and its `left` is a `transition`), and slides out again on its back button or
Escape. Once it has slid in, the list behind it is no longer drawn: a drawn list would still answer the pointer. From
the top:

- A 46 px bar, 8 px in from the sides: a 40 × 32 px back button with a thin muted border and a fill a little lighter
  than the page (two chevrons pointing right, 16 px, brighter under the pointer; tooltip "Back to the issues" `Esc`),
  the identifier in 18 px light text, dimmed and not clickable, and at the right four round 24 px buttons that copy the
  issue's URL, its ID, its git branch name and its prompt (entries of the Copy menu, each tooltip naming the entry and
  its shortcut), then a fifth with the external-link icon, tooltip "Open in Linear", that opens the issue in the app,
  else in the browser, like the menu's entry of the same name. Under the bar, 16 px in from the sides, the title in a
  30 px field, 16 px semibold, edited in place: Enter or leaving the field saves it; an empty title is put back as it
  was.
- A red line, under the title, when something failed, until clicked.
- A scrolling body, 16 px in from the sides, in blocks with a 12 px muted heading, 14 px above it and 5 below:
  - "Diffs", only when the issue has merge requests: one 28 px line each, with its icon in its color (as on the row) and
    its title on one line, cut to 48 characters with the three dots counted (the whole title while the pointer is on
    it). Three at most, then a muted line "Show 2 more" (an unfold icon) that lists them all, and "Show less" to go
    back. A click opens the merge request in the browser; resting on it shows its card (below), on its right.
  - "Properties": lines of 28 px in 14 px text, each a mark in a 20 px column then its value, as wide as its content and
    lighting up under the pointer. They are set out in three columns 8 px apart, each filled downward before the next
    (`PROPERTY_COLUMNS` in `config.js` and `arrange` in `lib/grid.js`: six lines make two rows of three; one column
    makes a list). In order: the status (its icon, its name; its tooltip is the list's, "Time in status" included, and
    the priority and estimate lines have the list's tooltips too), the team (its mark, see **People and teams**, and its
    name), the priority (its mark and name, "No priority"), the assignee (the person's initials on their color in 18 px,
    or a dashed head for "Unassigned"), the estimate ("3 Points", "1 Point", "No estimate"; a T-shirt scale's size as it
    is, "M"), the cycle (its icon where it stands and its name, "No cycle"; its tooltip is the cycle card). A click
    opens that property's choices, the team's a move to another team. The project is not a line: its members head the
    assignee choices.
  - "Labels": the issue's labels as chips 24 px high with round ends and a thin border, 12.5 px text, a 9 px dot in the
    label's color then its name, and a small arrow after the name of a label that belongs to a group, then a round 24 px
    "+" button ("Add labels" `L`). Without a label, one muted line, "Add label", with a tag icon.
  - A rule, then the description: drawn as Markdown (links open in the tracker's app or the browser), headings drawn
    by the mod in their own sizes (22, 19, 17, 15, 14, 13 px for `#` to `######`, bold; `lib/markdown.js` splits them
    out, comments are drawn the same). It is read-only: a click on it does nothing, and with no description nothing is
    drawn there.
  - The comments. Each thread is a box with round corners (radius 12), a fill a little lighter than the page, a border a
    little lighter than the fill (a light border would show as a white outline) and a soft shadow: the first comment,
    its replies each under a rule, then a reply field with the viewer's initials in front. A comment shows the
    author's initials on their color (22 px), their name (a bot's name when a bot wrote it, "Someone" when neither),
    its age in the time units below ("5min ago"), "Resolved" after it on a resolved thread, and at the right a round
    26 px options button (three dots) that opens the comment menu. Its text is Markdown, selectable.
  - A last box with the field to comment, which grows from 1 to 8 lines, and a send arrow (Enter posts).

  What was read of the issue's description and comments last time shows at once; the page reads them again as it opens
  and after each comment, edit, deletion or resolution. While the page is open, a change to the issue is read back with
  no spinner; a comment's work still shows one. A press on the page stays on the page: the panel behind would take the
  keyboard from its fields.

**Priority marks** follow Linear's, 14 px, drawn for this mod: urgent is a rounded square with "!", orange (`#f2793a`)
on an open issue and gray on a finished one; high, medium and low are three bars with 3, 2 and 1 lit; none is three
dashes.

**Status icons** follow Linear's, 14 px, drawn for this mod, in the status's own Linear color: a dashed ring for
backlog, a ring for unstarted, a ring around a pie for started, a disc with a check for completed, with a cross for
canceled, with two slanted strokes for duplicate, and with a double arrow for triage. A started status's pie fills by
its place among its team's started statuses, as in Linear: half for the only one, half then three quarters for two, even
steps for more.

**People and teams** are drawn without pictures (a mod shows images from Herdr's own folder only): a person is their
initials, in white, on a round of their Linear color. A team is its own emoji when its icon is one (every character of
it beyond ASCII); Linear's other icons come as names of its own set, and a workspace's custom emoji as a picture, and
neither can be drawn from the API, so such a team shows as the first letter of its name on a round of its color.

**Popups**, at the pointer or beside the control pressed, rows 31 px high unless said. Each draws its own box: the
popover color, a 1 px border, corners rounded by 10 px and a shadow. Each is as narrow as its content allows:

- Issue menu, 228 px wide, after Linear's: the identifier and title, then "Status" `S`, "Priority" `P`, "Assignee" `A`,
  "Estimate" `⇧` `E` and "Cycle" `⇧` `C`, each with an icon like Linear's, its key drawn as small key boxes, and an
  arrow; a rule; "Copy" with an arrow and "Open in Linear" (`⌘` `Click`, the click on a row that does the same); a
  rule; "Start with Claude Code…", which names the agent Start will run and is left out with its rule while there is
  none.
- A property's choices, as wide as their longest label needs, between 208 and 300 px: a chip naming the issue ("BACK-12
  · its title", cut to fit; left out beside the issue menu, which names it, and when a control of the row or the page
  opened the choices), a 32 px title that is a field filtering the rows as you type ("Change status…", "Change priority
  to…", "Assign to…", "Change estimate to…", "Move to cycle…"; "Set" for "Change" where no issue has a priority or an
  estimate yet), with the property's key as key boxes at its right, then 28 px rows, each an icon, a label and, for the
  value the issues hold, a tick (a dash when only some hold it). The rows are the command window's (below), from one
  source, `lib/choices.js`, which also tells the popups their size. They carry the keys `1` to `9` for statuses, `0` to
  `4` for priorities, and `0` for "No assignee" and "No cycle", drawn as plain dim digits in a fixed-width face, the
  way Linear does; typing letters filters, and the digits of those four lists still pick. Statuses show their icon, and
  keep the digit of their place among all the statuses. Priorities: "No priority" to "Low". Estimates: "No estimate"
  with a triangle reduced to its three corners, then "1 Point", "2 Points"…, or the T-shirt sizes. Assignees, by
  display name with their initials on their color: "No assignee", then me and whoever the issues are assigned to now,
  then the members of the issues' project (when they share one), then those of their teams, a rule between the blocks, a
  person listed once. Cycles filtered by name, days and standing: "No cycle" (a dashed ring), then the team's current
  cycle and those to come in order, then the previous one under a rule, each "Cycle 88" followed, dimmed, by its days
  and, when Linear words it, where it stands: "Nov 10 - Nov 23 · Current", "Nov 24 - Dec 7 · Upcoming", "Oct 27 - Nov
  9 · Previous". Older cycles are left out. More than sixteen rows scroll. Where it opens: see **Pickers**.
- Copy, as wide as its longest entry needs, between 220 and 340 px, Linear's eight entries and one more, each with an
  icon like Linear's and its shortcut as key boxes: "Copy ID" `⌘` `.`, "Copy URL" `⌘` `⇧` `,`, "Copy title" `⌘` `⇧`
  `'`, "Copy title as link" `⌘` `C`, "Copy issue as Markdown" `⌘` `⌥` `M`, "Copy everything as Markdown" `⌘` `⌥`
  `C`, "Copy git branch name" `⌘` `⇧` `.`, "Copy diff links" `⌘` `⌥` `X` (a pull request whose second end is a chain
  link; one line per merge request, `- :gitlab: [repo!12](url)` or `- :github: [repo#4](url)`, each once and the
  closed ones left out), "Copy as prompt" `⌘` `⌥` `P`. Off macOS
  they read `Ctrl` and `Alt`. On several issues they read "Copy IDs", "Copy URLs", "Copy titles", "Copy titles as
  links", "Copy issues as Markdown", "Copy everything as Markdown", "Copy git branch name" and "Copy diff links", and
  "Copy as prompt" is left out. With no merge request to copy, a toast says so and the clipboard is left alone.
- Start, 280 px wide: "Start BACK-12 with Claude Code" (the agent's name), a one-line input and a "Start" button.
- New issue, as wide as the longest team name needs, between 200 and 300 px: the line "New issue in…" and a row per team
  you belong to, its key then its name.
- Move to team, from the page, between 220 and 320 px: a 34 px search field "Move to team…" with `⌘` `⇧` `M` at its
  right, a rule, then a row per team you belong to (its mark, its name, its key dim), the issue's own ticked. Picking
  another team sets the issue's team.
- Labels, from the page: see **Labels**.
- The comment menu, 240 px wide, from a comment's options button: "Edit…" (pencil; on my comments only), under a rule
  "Resolve thread" or "Unresolve thread" (a check; on a thread's first comment only), under a rule "Copy link to
  comment" and "Copy content as Markdown", and under a last rule, on my comments only, "Delete". Delete deletes at
  once.
- The command window, a centered 460 × 380 px dialog, after Linear's: a chip ("2 issues", or the identifier and title of
  a single one), a title line, then rows of 28 px, each an icon, a label and its key in a small bordered box. Its first
  page ("Actions") lists, with Linear's wording and keys and icons like its own, "Assign to…" `A`, "Un-assign from me"
  `I`, "Change status…" `S`, "Change priority…" `P`, "Change estimate…" `⇧` `E` (when the issues' teams have estimates
  in common) and "Move to cycle…" `⇧` `C` (when the issues are all of one team, which has cycles). "Change" reads
  "Set" where no issue has a priority or an estimate yet. A key with a modifier shows as one box per key. The row under
  the keyboard cursor is highlighted. A choice all the issues already have is ticked; one only some have shows a dash.
- Display options, 280 px wide, under the row of controls by the panel's right edge, three 34 px lines as in Linear,
  the first two together and a 1 px separator before the third. "Ordering": a round direction button (a down arrow
  beside three shortening lines, an up arrow when the order is reversed) and a 124 px dropdown naming the field, with a
  chevron. "Order completed by recency": a 32 × 18 px switch, accent-colored with its knob at the right when on.
  "Completed issues", below the separator: a dropdown naming the period.

**Pickers.** A property's choices, the label picker and the team picker open beside the control that was pressed, so
that the control stays visible, and are taken back inside the panel:

- From a control of a row, or of the page when its properties are in several columns: right under the control, at its
  left edge, 6 px from it. When the whole list does not fit under it but fits above, it opens above, never over the
  control. When it fits neither side it scrolls, on the side with more room, and shows at least six rows.
- From a line of the page when the properties are one column: on the right of the longest line of the properties (its
  width reckoned at 7.6 px a character, with the line's padding, mark and gap), at one place whichever line was
  pressed, level with the line pressed, as narrow as the room on its right asks, 190 px at least. It takes the room the
  panel has below it, and its list scrolls past that: pulled up to fit, it would no longer sit by the control.
- By a key, at the pointer. A right-click on a row's cycle opens the cycle's choices at the control, in place of the
  issue menu.
- The choices of one issue keep its row lit while open.

**Labels.** The label picker, from the "+" button, a chip, or `L`, lists the labels the issue's team offers (its own
and the workspace's). It is as wide as its longest name needs, 240 to 320 px, a search field on top ("Add labels…",
"Change or add labels…" when the issue has some; the key `L` as key boxes at its right), a rule, then a list of 31 px
rows, 4 to 12 of them high. First what the issue wears, under no caption: a 16 px accent box with a check that takes the
label off, the label with its dot, and for a label of a group the group's name with the label it holds dimmed after it
and an arrow; a rule. Then blocks under a dim caption each, set apart by rules: "Frequently used" (up to three labels
that more than one of the loaded issues wear, most worn first, each followed by its group's name when it has one),
"Team labels" and "Workspace labels", in each the groups first (a mark of four dots, an arrow) then the other labels
(a dot in their color), alphabetical whatever the case. A click on a label wears or removes it, at once: the picker
stays open, so several labels change in one visit. The labels of a group are exclusive: wearing one takes off the
group's other. Typing lists the labels whose name contains the text (groups are not worn, so they are not listed), and
Enter picks the first. Resting 140 ms on a group opens its page beside it, a list of its labels in order; another entry
replaces it. A chip of a group's label opens that group's page right under the chip, with its own search field; picking
there closes it. Any other chip opens the picker. What each page shows follows what the picker made the issue wear, so
that two open pages agree before the list is reloaded.

**Without a key** the panel shows the header, three setup steps and a command with a "Copy" button: the one that stores
the key in the macOS Keychain, in the keyring on Linux (`secret-tool`), or, on Windows, `setx LINEAR_API_KEY KEY`. Step
3 says to press the reload icon above.

All colors come from the theme, except the status icons, which use Linear's colors (as its app draws them: the API's
default green `#0f783c` shows as `#27a644`), the orange of an urgent issue, the merge request icons' colors, the cycle's
indigo, the labels' and teams' own colors, and, in the list of people, each member's own color under white initials. A
person's own colors go in their `settings.json` (`"colors": { "accent": ..., "background": ... }`), never in the mod.

## How it behaves

**Loading.** A change to an issue, and a load someone asked for (the first one, the reload button or `r`, a changed
option), shows a 40 px round spinner in the very middle of the panel, over the list, for at least 0.6 s: Linear often
answers too fast for it to be seen otherwise. The 60 s reloads show nothing, and neither does the read that follows a
change made from an open page. The first load starts when the panel is created, if it shows; else the first 60 s tick
that finds it shown starts it. One timer then reloads every 60 s, and a tick that finds the panel hidden does nothing,
so a hidden panel does not poll. The refresh icon and `r` reload on demand, and every action reloads when it ends. A
reload asked while one is running waits for it and then runs quietly. A load that has not answered in about 30 s is
given up: the error "Linear did not answer in time" shows, and the answer, if it comes later, is ignored.

**Caches.** What Linear tells that hardly ever changes is kept in the panel's `localStorage` (`cache.v1.teams`,
`cache.v1.labels`, `cache.v1.projects`, in `lib/cache.js`, which never throws: storage can be missing or full; the
version is bumped with any change to what is kept, and older entries are never read; a value that is corrupt, or not a
list or record as required, is ignored) and asked again once a run, in the background, so a change shows after one run
at most: a team's statuses, estimate scale, members and
cycles, the labels each team offers, and the members of each project. The panel starts with what was kept, so the list
draws at once; the issues of a team never seen wait for its first answer. A failed answer is asked again at the next
load. A team's labels are asked when a page of one of its issues first opens, and the label picker waits for them if it
has none. A project's members are asked when an issue of it is first loaded. The description and comments last read of
each issue are kept for the session only, so its page opens with them and reads them again.

**Cleaned text.** Everything the tracker answers is typed by other people, so every string of every answer is cleaned
once, where `request()` in `api.js` returns it (`cleanAnswer` in `lib/sanitize.js`), before any part sees it or the
caches keep it. Escape sequences go, with what they carry: a title with `ESC ] 52 ; c ; ... BEL` (which would write the
clipboard) shows as the title without it, "Fix login" for "Fix" + that sequence + " login"; so do color and cursor
sequences (`ESC [ 31 m`) and a lone escape with its next character. Other control characters go too (the C0 and C1
ranges and DEL). In a title, a name or any other label a newline or a tab becomes a space. The fields `body` (a
comment) and `description` are Markdown and keep their newlines and tabs. Only the answer's `data` is cleaned: the
message of an error the tracker reports is shown as it comes. Text the person types is sent as typed.

**Views.** "Current cycle" lists your issues in the active cycle. "My issues" lists all of them. Open issues always
show. "Completed issues" decides which finished ones (completed, canceled, duplicate) join them, in both views: "All",
"Past day", "Past week" (the default), "Past month" (30 days), "Current cycle" (those of the active cycle) or "None".
Linear applies the filter, so changing it reloads. Each view holds the 100 most recently updated issues
(`ISSUES_PER_VIEW` in `api.js`, which the "Showing the first 100 issues" line reads too); the view's total then reads
"100+ issues".

**Folding.** A click on a header's arrow hides the issues of that status and leaves its header, which still takes a
drop; another click shows them again. Folded statuses are remembered by name, and their issues are left out of a
Shift+click's range.

**Group totals.** A click on a header's figure, or on the view's total under the pills, switches every header and that
total between estimate points and issue counts; the figure lightens under the pointer to show it can be clicked, and
the choice is remembered. A header's points are Linear's: an issue without an estimate counts for its team's default
estimate (`defaultIssueEstimate`, 1 for most teams), though its row shows no triangle.

**The completed line.** "Showing issues completed in the past week", "in the past month" or "during the current cycle"
follows the "Completed issues" choice; the other choices say nothing of it. "Recent first" is added, after " · " when
there is a first part, while "Order completed by recency" is on.

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

- Click opens the issue's page in the panel. With the command key held (Ctrl off macOS), it opens the issue in the
  Linear desktop app instead, and in the browser when no app claims its `linear://` link.
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
  (`#eb5757`). A draft counts as open next to an open one; when only drafts are left it is gray (`#8a8f98`) and the
  icon is the draft pull request's. Click opens every one of them in the browser, each in its own tab. Right-click does
  nothing.
- Click on the cycle opens the cycle's page (`/team/FRONT/cycle/144` under the workspace's address) in the Linear
  desktop app, else in the browser, as a command-click on the row does for the issue.
- Right-click on the cycle opens its choices, at the control, in place of the issue menu a right-click elsewhere on the
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

**On the page.** Editing is in place, and each change is asked of Linear at once.

- The title saves on Enter or when the field loses the keyboard. The description is not editable.
- A property line opens its choices (**Pickers**); a pick sets it, as on a row. The team line opens the move picker.
- Posting: the comment field and a thread's reply field post on Enter, and the send arrow does the same; the field is
  emptied once Linear took the text, so a refusal leaves it where it was. A reply goes to the thread's first comment.
- The comment menu's "Edit…" turns the comment's text into a field, with the text in it, with no box around it and
  "Cancel" and "Save" buttons at the right under it; its options button gives way meanwhile. Saving sends the new text
  and reads the comments again; saving an unchanged or empty text ends the edit. Starting an edit while another is open
  saves the first. "Delete" deletes the comment, "Resolve thread" resolves its thread (its comments stay, "Resolved"
  shows beside the first), "Unresolve thread" undoes it, and the two copy entries put the comment's link or text on
  the clipboard with a toast.
- Escape goes back to the list, unless a text field of the page has the keyboard. While a field has it, the panel's
  keys do not run.

**Ticked issues.** The pill counts them and totals their points as the headers do. "Actions", or Cmd+K (Ctrl+K off
macOS), opens the command window on them; the cross, or Escape, unticks them all. Switching views clears the ticks. A
ticked issue that leaves the view shown is unticked, and so are the issues of a status that is folded: nothing is done
to an issue that cannot be seen.

**The command window.** An action ending in "…" opens a page of choices; the others act at once, in one request. Arrows
and Enter move and pick, a row's key picks it directly, a click too. Escape goes back to the actions, or closes the
window when a key opened that page directly. A page with a field (every one but the actions) filters its rows as you
type, and letters then are not shortcuts; the digits of the numbered pages (status, priority, assignee, cycle) still
are.

- "Assign to…" lists the members of the issues' team by display name, with their initials on their color, and a field
  that filters them as you type; you are ticked.
- "Change status…" lists the team's statuses in workflow order, the first nine on `1` to `9`.
- "Change priority…" lists "No priority" `0`, "Urgent" `1`, "High" `2`, "Medium" `3`, "Low" `4`.
- Issues of several teams are offered what all their teams have: the people in every team, the statuses every team
  names, the estimates every team's scale has. Each issue then takes its own team's status of that name.

**The logo.** A click on "Linear" in the header (shown while no key is set up) brings the Linear app to the front
(`open -a Linear` on macOS, its `linear://` address elsewhere), or opens linear.app in the browser when the app is not
installed. Its tooltip says "Open Linear".

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
Shift+`x` ticks the range to it, as a Shift+click on its checkbox does. `lib/keys.js` is the one place these are
written. On an issue's page the list's keys are off and these answer instead: Escape goes back to the list; `s`, `p`,
`a`, Shift+`e` and Shift+`c` open that property's choices for the page's issue, at the pointer; `l` opens the label
picker beside the Labels block; Cmd+Shift+M (Ctrl+Shift+M off macOS) opens the team picker; and the copy shortcuts
copy the issue's ID (Cmd+`.`), URL (Cmd+Shift+`,`), git branch name (Cmd+Shift+`.`) or prompt (Cmd+Alt+`P`). None
of them runs while a text field of the page has the keyboard. A control's tooltip shows once the pointer has
rested on it for a second, or at once when the pointer comes from a control whose tooltip was showing less than half a
second before, so that two issues can be compared without a second wait; the keys of its shortcut, drawn as key boxes,
light up while the person holds them; a press on the control keeps its tooltip away until the pointer has left it, and
no tooltip shows or stays while a popup is open over the panel. It names the control and draws its shortcut as key
boxes, as Linear does: "Create new issue" `C`, "Show display options" `⇧` `V`, "Reload" `R`, "Current cycle" `1`, "My
issues" `2`, "Open command menu" `⌘` `K`, "Clear selected" `Esc`, and on a row "Change priority" `P`, "Change
estimate" `⇧` `E` and "Change status" `S`; on the page "Back to the issues" `Esc`, "Add labels" `L`, "Send", "Comment
options" and one per copy button ("Copy issue URL", "Copy issue ID", "Copy git branch name", "Copy as prompt", with
their shortcuts). A row's cycle and merge requests have their card instead, and so do the page's. A tooltip is
centered under its control, or pushed back inside the panel near an edge, and sits above a control the panel has no
room under; the page's property lines and Add labels put it on their right instead.

**Time in status.** The tooltip of a row's status (and of the page's status line) says more, as Linear's does: the line
"Time in status", then a line for each status the issue has been in, in the order it first entered them, with the
status's icon, its name and the time spent there over all its stays ("5s", "44min", "3h", "3d", "11mo", "2y": units
`s`, `min`, `h`, `d`, `mo`, `y`, the longest that fits, cut down to whole units as Linear does, days up to a month, a
month a twelfth of a year). The status the issue is in now is in the foreground color, the others muted. A rule, then
"Change status" `S` at the two ends of the last line. The stays are asked from the API when the pointer comes on the
status (`issue.stateHistory`), once an issue, and again after its status has changed. Until the answer comes, or if it
fails, the tooltip shows its last line alone. Comments and merge requests tell their ages in the same units.

**The cycle card.** The tooltip of a row's cycle (and of the page's cycle line) is Linear's card on a cycle alone, with
no label or keys under it, laid out as Linear's (22 px lines, 20 for the description, 15 px from each side): the cycle's
icon and name; the first line of its description, muted, where a team writes its capacity ("Capacity: 40 pts"); a rule;
then, for a cycle under way or ended, the share of its scope done (`progress`, as an indigo pie filled by eighths and a
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

**The merge request card.** The tooltip of a row's merge requests, and of a merge request's line on the page (which
shows the card of that one alone), is a card alone, with no label or keys under it. Each merge request leads with its
icon in its color (Lucide's merge icon when merged, its pull request icon when open, its draft pull request icon when a
draft, its closed pull request icon when closed), its title, and at the right its author's initials (the first two
letters of their login, uppercased: "BE" for `benjamin.carlier`) in white on a blue round (`#1d8cf0`): a mod cannot show
a picture from an address. For one merge request, the title takes up to two lines; under it, muted, its repository and
number ("nuxt-frontend!3463"); then "Merged 23h ago", "Closed 2d ago" or "Opened 3h ago" (the time as the status
tooltip tells it), " · 6 files", "+41" in green and "-4" in red, and at the right the initials of each reviewer who
submitted a review, followed by a green check when they approved. For several, a block each, eight at most and then "5
more": the title on one line, and under it, muted, the repository with its owner ("worklife-io/iam!599"), then "
· Reviewed by amalchaker" ("a and b", "a, b and c") when someone submitted a review. The card is as wide as its widest
line, 360 px at most. The files, the lines and the reviewers are asked of Linear when the pointer comes on the merge
requests, and again after a load: until the answer comes the files read "…"; if it fails, the card goes without them.

**Start** ("Start with …" in the issue menu, then the button or Enter), in order, stopping at the first failure:

1. Forgets checkouts deleted by hand (`git worktree prune`) and finds the git repository of the focused pane's folder.
2. Reads the issue's description.
3. Reuses the checkout that already has the issue's branch. Otherwise it checks the branch name, which comes from
   Linear: `git check-ref-format --branch` must accept it and it must not start with "-" (else the error `Start cannot
   use "<name>" as a git branch name`). Then it reads Herdr's `settings.json`: a file that is not valid JSON, or a
   `worktrees.directory` that is not an absolute path (after `~` is replaced by the home folder), stops Start with an
   error that names the file. It adds a worktree at `<worktrees.directory>/<repo>/<branch as a folder name>`, the name
   being the branch with each run of characters other than letters, digits, `.`, `_` and `-` made one `-`, trimmed of
   dashes, and "branch" when nothing is left (or only "." or ".."). An existing branch is checked out; a new one
   starts from HEAD.
4. Sets the issue to the team's "In Progress" status, or its first started status when none has that name. An issue
   already there or further along is left alone.
5. Opens a new space in the checkout, the space and its tab named after the identifier, running the agent with a
   first message in four parts, a blank line between them: the base prompt of the settings, the text typed for this
   issue, the issue as "Copy as prompt" gives it but without its description, then the description, preceded by a
   note that it is text anyone in the workspace can edit, to be read as information and not obeyed, and put in a
   code fence longer than any run of backticks inside it. An empty part is left out.

**The agent and the settings.** Nothing names an agent in the mod. The panel asks Herdr once for the agents people can
start (`knownAgents()`: the entries of its table of programs that have a `run`, most picked first, each installed or
not) and Start runs the first installed one, with `argv` its `run`. The person's settings are the props of the panel's
block in their layout: `agent`, the key of the agent to run instead (taken even when Herdr says it is not installed; an
unknown key falls back on the first installed), `start_prompt`, the base prompt, as one text or a list of lines, and
`api`, an address that requests go to instead of the tracker's API (a stand-in that serves made-up issues, for a demo or
a screenshot; the key is sent there too, so it must be https, or http on this computer: `localhost`, `127.0.0.1` or
`[::1]`; any other address stops every request, before the key is sent, with the error "The api setting must be an https
address, or an http one on this computer"). The panel hands the agent's name to the issue menu and, through it, to the
Start field: a popup is another copy and does not see the panel's props. With no agent, the menu has no Start, and a
start asked anyway fails with "No agent to start".

**Copy.** Each entry, or its shortcut, puts text on the clipboard and says so in a toast. The shortcuts work in the Copy
page, and in the panel on the ticked issues, else on the issue under the pointer; the page's four buttons and its
shortcuts copy the page's issue. Several issues are copied from the top of the list down: one line each for IDs, URLs,
links and branch names; "IDENTIFIER: title" a line for titles; and for the Markdown entries one document each,
separated by a blank line, `---` and a blank line. The entries: the identifier, the URL, the title, the title as a
Markdown link, the issue as Markdown ("# title", then the description), the same followed by its comments (author,
date, text, oldest first), the branch name, or a prompt for an agent ("Work on Linear issue BACK-12: title", the
description, the URL). The description and comments (all of them, however many) are read from Linear when an entry
needs them. In the Markdown link's text and in a comment's author line, the characters `\`, `` ` ``, `*`, `_`, `[` and
`]` are escaped with a backslash, so a title or a name cannot break the link or bold the line.

**Errors.** A failed load shows Linear's message in red under the row of controls and keeps the last list. A failed
action shows "BACK-12: message" in red until clicked, under the controls, or under the title on an open page. So does
a failed background fetch, as "Could not load the teams: message" (likewise "the projects", "the labels", "the status
history", "the planned points", "the merge request details", and "Could not list the agents: message"); it is asked
again the next time it is needed. An address that nothing opens shows the toast "Could not open
ADDRESS". The mod shows no agent status.

## Built from

**Files** in `mods/linear-panel/`:

- `mod.json`: `{ "place": "none", "title": "Linear panel" }`.
- `main.js`: the one `View`. It only picks a part by `props().part` and draws it. No `part`: the panel, whose props are
  the person's settings (`agent`, `start_prompt`, `api`). `{ part: "button" }`: the top-bar button. The other parts are
  popups: `"issue-menu"` (`issues`, `teams`, `me`, `agent`, `frame`, `origin`), `"copy-menu"` (`issues`, `parent`),
  `"start"` (`issue`, `agent`), `"display"` (`display`, the current options), `"teams"` (`teams`, and for a move
  `issue`), `"labels"` (`issue`, `labels`, `frequent`, `group`, `parent`, `list`, `searchable`, `frame`),
  `"comment-menu"` (`issue`, `comment`, `own`) and `"commands"` (`targets`, `teams`, `page`, `me`; with `compact`, one
  of its pages as a popup, which is how a property's choices show; `bare`, `parent`, `visible`).
- `enums.js`: the closed sets of strings the mod passes around, each a frozen object whose values are what is stored,
  sent and compared (`CommentChange`, `Completed`, `CopyWhat`, `KeyAction`, `Mark`, `Ordering`, `Platform`,
  `Property`, `Page`, `RequestKind`, `Side`, `SourceType`, `StateType`, `ViewKey`), with a JSDoc type of the same name.
  No file spells such a string out.
- `parts/`: one class per part, each built from `(props, cx)` with a `render(t, cx)`: `panel.js` (loading and its
  timer, ticks, drag and drop, the page's slide, the drawing), `store.js` (what the panel knows from Linear: the issues
  of each view, the teams, projects and labels kept between runs, the pages read, and the lookups made on a pointer),
  `requests.js` (what the panel does when a popup, a key or a drop asks: `serve`, `carryOut`), `panel-keys.js` (what
  the panel's keys do, on the list and on a page), `openers.js` (opens each popup where it belongs), `submenu-host.js`
  (the page a menu opens beside itself once the pointer rests on an entry), `issue-list.js` (the groups,
  headers and rows it draws, and the status and cycle tooltips), `issue-page.js` (an issue's page: its fields, diffs,
  properties, labels and comments), `merge-card.js` (the tooltip of a row's merge requests, and a line's card on the
  page), `setup.js`, `hints.js` (the tooltips), `button.js`, `issue-menu.js` (the menu and its Copy page),
  `start-prompt.js`, `display-options.js`, `team-picker.js`, `label-picker.js` (the picker and a group's page),
  `comment-menu.js`, `commands.js` (the command window, and a property's choices as a popup), and `menu.js` (the rows
  every menu is drawn from).
- `tracker.js`: everything that names Linear, and nothing else does but the mod's folder and its title in `mod.json`:
  its name, its addresses, the key's variable and the name it is stored under, the layout id of the panel. Everything
  that differs between macOS, Linux and Windows is there too: how an address is opened, how the key is read, and what
  the setup screen says. A platform the mod has no commands for (Herdr's `window().platform` is none of the three) is
  treated as Linux; none known at all, as macOS. `api.js`: the GraphQL queries and the page size of each. One is
  undocumented: `pullRequests`, the records Linear's own app reads for a merge request's files, lines and reviewers. The
  API answers it but its schema hides it, so Linear can change it without notice; only the merge request card's files,
  lines and reviewers depend on it, and the card goes without them when it fails. It filters by the issue's numbers and
  repository names together (a filter on both inside `or` answers unrelated merge requests), so the panel keeps the
  answers whose `url` is one of the issue's. A merge request it tells without its changes is left out, and a reviewer it
  cannot name, so the others still show. The rest of what the row and the card show comes from the issue's attachments,
  documented, whose `metadata` holds a merge request's status, number, title, repository, dates and author.
  `channel.js`: the six shared keys the popups and the panel talk through (the queue of requests, the lit row, the open
  popups, the keyboard given back, the labels an issue wears as the picker last made them, the members of each project).
  `popups.js`: every popup's size, place and props. `dock.js`: showing and hiding the panel in the layout. `actions.js`:
  Copy and Start. `config.js`: the mod's name, the paths of its icons and of the logo, the views, the option lists, the
  row sizes and the number of columns of the page's properties. Every icon a list shows is named in a table, never
  chosen by a rule spread through the drawing code: `STATUS_ICONS`, `PIE_ICONS`, and an `icon` field on each entry of
  `VIEWS`, `COPIES`, `PRIORITIES` and `PROPERTIES`. An option list is an array of records with named fields, never of
  positional pairs or tuples: `VIEWS`, `COMPLETED`, `ORDERINGS`, `PRIORITIES`, `PROPERTIES` (`lib/keys.js`),
  `COPY_KEYS`, the `UNITS` of `lib/history.js`, and the `SCALES` of `lib/teams.js` by estimate type; a list of
  choices that has only an id and a label is typed `NamedOption<T>` (`{ id: T, label: string }`, in `types.d.ts`).
  `ui.js`: key boxes, priority and status marks, the cycle's icon, the merge requests' icon and colors, people's
  initials and teams' marks on a round, a label's mark, the zoom.
- `lib/`: the rules, with no call to Herdr, so node can test them: `sanitize.js` (`cleanText`, `cleanAnswer`: see
  **Cleaned text**; applied in `api.js`, nowhere else), `color.js` (a brighter shade of a color, a mix of
  two, whether a color is dark), `listing.js` (filters, grouping and order, totals), `teams.js` (workflow order,
  estimate scales and their words, what several teams share, `STATUS_ICONS`, the table from a status type to its icon),
  `cycles.js` (where a cycle stands, which ones the picker offers, its days and the weekdays left, `PIE_ICONS`, the
  seven pies a started status or a cycle's progress draws), `merges.js` (an issue's merge requests: their color, number,
  repository, reviewers' sentence, dates, a title cut to a length), `choices.js` (the rows of a property's choices,
  their keys, ticks and requests), `assignees.js` (who the assignee choices list, in blocks), `labels.js` (the frequent
  labels, the groups, the picker's blocks and order), `keys.js` (what a key press asks for: the property keys, the copy
  shortcuts under each spelling a keyboard reports, the panel's keys, which key caps are held), `copy.js`, `start.js`
  (the Start status rule, the agent picked, the prompt, the folder name, parsing `git worktree list`), `placement.js`
  (where popups and tooltips go, how wide a popup is, how many rows a list shows), `history.js` (the time in each
  status, and a length of time in its unit), `grid.js` (lines in columns), `text.js` (small text helpers),
  `cache.js` (what is kept between runs), `lookups.js` (`Asked`, the keys asked once a run, and `Lookups`, answers by id
  that are asked once or again when older than a load, a failure forgotten), `selection.js` and `drag.js` (the ticks and
  the drag as plain state). `text.js` holds `compareText` (code-unit order) and `message` (an error's text).
- `types.d.ts`: the shapes the files pass around (an issue, a team, a request, each part's props), global so that any
  file names them in JSDoc. Herdr never loads it. `jsconfig.json` is the project's: it turns on every strict check of
  the TypeScript compiler, null checks included, but the one on fields assigned outside a constructor, which Herdr's
  `init` cannot satisfy. Herdr writes `gpui-kit.d.ts`, the types of its API, into the folder. An editor reads both, and
  `pnpm run typecheck` runs the same check and reports nothing.
- `brand/`: Linear's logomark, `logo-light.svg` (white) and `logo-dark.svg`, unchanged from the brand assets Linear
  publishes (linear.app/brand), with a README saying whose they are: trademarks of Linear, covered by no license of the
  project, which is not affiliated with Linear. The button and the header shown while no key is set up draw it, nothing
  else.
- `icons/`: the mod's own icons.
  - Drawn for this mod from plain shapes (circles, bars, strokes of 1.5 in a 16 px box, round ends), to look like
    Linear's: `create.svg`, `command.svg`, `assign.svg`, `unassign.svg`, `no-assignee.svg`, `estimate.svg`,
    `estimate-none.svg`, the eight `copy-*.svg`, `priority-0.svg` to `priority-4.svg`, `view-all.svg`, `view-cycle.svg`,
    `display.svg`, `close.svg`, `caret-down.svg`, `caret-right.svg`, `chevrons-right.svg` (the page's back button),
    `plus.svg`, `more.svg`, `pencil.svg`, `trash.svg`, `resolve.svg`, `send.svg`, `unfold.svg`, `label.svg` and
    `label-group.svg` (four dots), and the cycles' `cycle.svg`, `cycle-future.svg`, `cycle-past.svg` and
    `cycle-none.svg` (a ring of radius 6.25, dashed `1.45 1.8225` for `cycle-future.svg` and `cycle-none.svg`; the past
    one is a solid ring with a gap and a check), with `view-cycle.svg` for the
    current one.
  - The status icons, in a 14 px box: a ring of radius 6 and width 1.5 (dashed `1.4 1.74` for backlog), a pie drawn as a
    4 px stroke of radius 2 (`status-started-1.svg` to `-7.svg`: exactly one to seven eighths of the circle, from the
    top, clockwise; `status.svg`, the menus' icon for a status, is the same drawing as the half-filled one), and a disc
    of radius 6.75 for the finished ones. An icon has one color, so the check, cross, slashes and arrows are holes in
    the disc (`fill-rule="evenodd"`), not shapes in the background's color. The same goes for the "!" of
    `priority-1.svg` and the letters and lines of `copy-id.svg`, `copy-markdown.svg` and `copy-everything.svg`.
  - From Lucide: `refresh.svg`; `git-pull-request.svg`, `git-pull-request-draft.svg`, `git-merge.svg` and
    `git-pull-request-closed.svg`, unchanged; `clipboard.svg` and `external-link.svg`, with corners rounded further (a
    radius of 4 where Lucide has 2, the clip a pill, the arrow's head turning on a radius of 2); and `sort-down.svg` and
    `sort-up.svg`, changed from Lucide's. `LUCIDE-LICENSE.txt` is their ISC license.
  - The tick, the chevrons, the spinner and the terminal are shipped icons of `mods/workspace-chrome/`.

**Tests**, beside `mods/`, never copied into Herdr: `tests/unit/` checks `lib/` with node's own runner, the
sanitizer included (`sanitize.test.js`: a clipboard sequence, color and cursor sequences, a lone escape, controls, the
breaks of prose kept) and the icon tables (`icons.test.js`: every icon named by a table has a file in `icons/`, and
every `.svg` there is named somewhere in the code). `tests/parts/`
starts every part in a stand-in for Herdr (`tests/host/`: fake `herdr`, `gpui-kit` and `gpui-base` modules, with text
fields that take typing and a submit, answered through a module hook) with a fake Linear behind it, then clicks, presses
keys and drags, and reads what was drawn and what Linear was asked. The stand-in refuses an element method that the
installed Herdr's `gpui-kit.d.ts` does not declare. `pnpm test` runs both; `pnpm run lint` runs ESLint
(`eslint.config.js`: its recommended rules, `indent` of 2 spaces with `MemberExpression` 1, `SwitchCase` 1 and
`flatTernaryExpressions`, and `newline-per-chained-call` with `ignoreChainWithDepth: 1`, so a chain of two calls or more
has one call a line; unused names must start with `_`), and `tests/unit/style.test.js` holds every line of every `.js`,
`.ts`, `.json` and `.md` file to 120 characters (a Markdown table row is the one exception), this recipe's included.
Semicolons and double quotes are the style; no rule enforces them, so keep to them.

**Repository files.** `.github/workflows/test.yml` runs `pnpm install --frozen-lockfile`, `pnpm lint` and `pnpm test`
on every push to `main` and every pull request, on `ubuntu-latest`, with the Node version read from `package.json`
(`engines`), read-only `contents` permission, and each action pinned to a commit SHA with its version in a comment, not
to a tag. `CHANGELOG.md` lists what changed, newest first, under an "Unreleased" heading and then a heading per day
(the project has no versions: a mod is installed from the repository as it stands), in "Added" and "Changed"
sections; a change that a person can see goes there.

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
variable; cmd answers the name itself when the variable is not set, which counts as no key. It is read once, at the
first request, and kept in memory (not in storage, and not in the mod); a 401 from the API drops it, so the next
request reads it again, and a panel that starts gives it up too. The mod sends it only to the API (the address of the
`api` setting, when there is one, in its place), and only over https or to this computer (see **The agent and the
settings**).

**Linear GraphQL** (`https://api.linear.app/graphql`, the key as the `Authorization` header). Every connection has an
explicit `first`. Those below that say "all pages" follow `pageInfo.endCursor` until `hasNextPage` is false; the rest
are capped at the size given and read no further (**Watch out**, Limits). An answer that is not JSON, or that has no
`data`, is reported as "Linear answered STATUS with no data".

- `viewer.id`, its initials and color (the initials on the reply fields), and `viewer.teams(first: 50)` (id, key, name,
  color, icon), for New issue, capped at 50; in the same query as the issues.
- `viewer.assignedIssues` twice in one query, each `first: 100, orderBy: updatedAt` and not followed past that page
  (`pageInfo.hasNextPage` only tells the panel the view is cut), with the two views' filters passed
  as `IssueFilter` variables. `filters` in `lib/listing.js` builds them from the "Completed issues" choice: `cycle: {
  isActive: { eq: true } }` for the cycle view, combined through `and` / `or` with `state: { type: { nin: [...] } }`,
  `completedAt: { gte }` and `canceledAt: { gte }`. Fields: id, identifier, title, url, priority, estimate, branchName,
  completedAt, canceledAt, state, the team (id, name, color, icon), the assignee (id, name, display name, initials,
  color), the project (id, name), `labels(first: 10)` (id, name, color, parent), `attachments(first: 20)` filtered to
  the sources `github` and `gitlab` (the merge requests), and the cycle: id, number, name, description, startsAt,
  endsAt, progress, scopeHistory.
- `teams(first: 10, filter: { id: { in: $ids } })`, all pages, with `states(first: 50)`, the three `issueEstimation*`
  fields `defaultIssueEstimate`, `members(first: 100)` (name, display name, initials and color) and `cycles(first: 20)`
  filtered by `or: [{ isPast: { eq: false } }, { isPrevious: { eq: true } }]` (id, number, name, startsAt,
  endsAt), asked once per team a run.
- `projects(first: 50, filter: { id: { in: $ids } })`, all pages, with `members(first: 100)`, for the assignee
  choices, once per project a run.
- `issueLabels(first: 250)` of a team and of the workspace (`or: [{ team: { id: { eq } } }, { team: { null: true } }]`;
  id, name, color, isGroup, parent, team), all pages, asked when a page of the team's issues first opens.
- `issue(id)` for the page: its `description` and `comments(first: 100)`, all pages (id, body, createdAt, url,
  resolvedAt, parent, user, botActor), replies included, which name their parent; sorted oldest first.
- `commentCreate` (`issueId`, `body`, `parentId` for a reply), `commentUpdate`, `commentDelete`, `commentResolve` and
  `commentUnresolve`.
- `issue(id).description`, at Start and for the Copy entries that carry it; "Copy everything as Markdown" reads the
  page query above instead, for the comments (body, date, author).
- `issue(id).stateHistory(first: 100)`, all pages (startedAt, endedAt, state), when the pointer comes on a row's
  status, for the time in each status.
- `cycle(id).issues(first: 250)`, all pages, without triage, canceled and duplicate states (estimate, team id), when
  the pointer comes on a row's cycle that has not started, for the points planned in it.
- `pullRequests(first: 50)`, all pages, for the merge request card (see `api.js` above).
- `issueBatchUpdate(ids, input)` for every change to an issue, at most 50 ids to a request (more are sent in
  successive requests, stopping at the first refusal), with `stateId`, `estimate`, `priority`, `assigneeId`
  (null un-assigns), `cycleId` (null takes the issue out of its cycle), `teamId`, `title`, and
  `addedLabelIds` and `removedLabelIds` for labels.

**From `herdr`:** `exec`, `run`, `layout`, `props`, `shared`, `setShared`, `theme`, `settings` (the zoom), `window`,
`notify`, `spaces`, `panes`, `focused`, `home`, `appHome`, `readTextFile`, `knownAgents`, `openOverlay`, `closeOverlay`.
Also `fetch`, `localStorage`, `cx.timer`, `cx.spawn` and `cx.write_to_clipboard`, and from `gpui-base` the text fields
(`Input` and `Textarea` with their states, which a part must `release()` when it goes) and `TextView.markdown`, the
drawn Markdown of descriptions and comments.

**Commands:** `layout.select`, `layout.show`, `layout.hide`, `space.new` (`name`, `folder`, `tab`, `argv`: the agent's
`run`, `task`).

**Outside its folder.** The mod reaches the network (Linear's API, or the address the `api` setting names), runs the
programs below, reads Herdr's `settings.json` (for `worktrees.directory`, at Start) and writes to the clipboard.

**Programs:** `git` everywhere; `sh`, `security` and `open` on macOS; `sh`, `secret-tool` and `xdg-open` on Linux;
`cmd`, `reg` and `rundll32` on Windows.

**Drag and drop** has no native support for a mod's own rows. The `Drag` class of `lib/drag.js` holds its state. As the
shipped `spaces` list does, a row's `on_mouse_down` records the pressed issue, `on_mouse_move` on rows and headers
records the status under the pointer, and `on_mouse_up` there drops. The panel's root, `relative()`, tracks the pointer
with its own `on_mouse_move` (`local_position` is then panel-relative) and draws the following copy as its last child,
`absolute()` at that point. A drop sends each issue to its own team's status of that name (`moves` in `lib/teams.js`).

**Popup to panel** (`channel.js`). A popup, or the command window, appends its request to the queue in the shared key
`linear-panel.requests`, as `{ at, ids, kind, ... }`, and closes. The queue keeps the last 20, older ones are dropped,
and `at` is the time of the request, raised past the last one's when two come within a millisecond. The display options
write the same way but stay open, keeping their own copy of the options to draw, and so does the label picker, which
asks for each label at once. In its next render the panel serves, oldest first, every request whose `at` is past the
last it served, and remembers that `at`, so each request is served once; the queue is left as it is. `kind` is `start`
(`text`), `update` (`input`), `status` (a status by `name`, resolved per team), `copy` (`what`) or `open` (the issue's
page in Linear) for the issues, `compose` (`team`: Linear's composer for a new issue), `display` (`change`: `by`,
`reversed`, `recency` or `completed`), which the panel applies itself, `comment` (`change`: `start-edit`, `edit`,
`delete`, `resolve` or `unresolve`, with the `comment` id) for the page, and `clipboard` (`text`, `label`) for the
comment menu's copy entries. Opening a page is the panel's work too, never the popup's: it takes two commands in a row,
and a popup that closes loses the second. So is writing to the clipboard, which a drawing may not do: the panel does it
from a timer. Two more shared keys carry what a popup shows of the panel: `linear-panel.labels`, the ids of the labels
an issue wears as the label picker last made them, and `linear-panel.projects`, the members of each project the panel
has read.

## Watch out

- **Write `mod.json` before `main.js`.** Herdr docks a new mod folder the first time it sees it. Without `"place":
  "none"` already there, it adds a fixed copy of the panel to the layout's root. If that happens, delete that block from
  the layout file.
- **A drag must not outlive its press.** A release outside the panel reaches no handler, so the drag would stay armed
  and move its issue on a later, unrelated release over a row. The panel's root ends it on any release that reaches it,
  on a press outside the panel (`on_mouse_down_out`), and on a press inside that did not start on a row; a row's
  controls end it too. Because the row handles presses and releases itself, it opens the issue's page in
  `on_mouse_up`, not `on_click`.
- **Keep the following copy off the pointer.** It is drawn 14 px right and 10 px below. Under the pointer it would take
  the release meant for the group beneath. It cannot leave the panel either: a mod draws only inside its block.
- **The pill is not drawn over the list.** A mod element laid over others does not stop the mouse: a press on it would
  also reach the row behind, open its issue or start a drag. The pill has its own strip instead. The command window is a
  `dialog` overlay, which Herdr centers and which takes the keyboard; it focuses its own handle so its keys work at
  once. The same holds for the page: it is not laid over a list that still answers, it replaces the list once it has
  slid in (`settled`), and it stops the press and the release itself, so the panel behind does not take the keyboard
  from its fields.
- **A handler that starts a load must ask for the redraw.** `reload` only sets the loading state. A click or a key calls
  `cx.notify()` after it, or nothing shows until the load ends. A `cx.notify()` at the top of the task a drawing
  spawned once left that load hanging for ever, with no error in `herdr-app status`: start loads from handlers and
  timers, never from `render`.
- **`herdr-app check` proves little here.** It renders the panel once, with no issues: code that only runs for a row, or
  for one kind of row, is not reached. A constant used only for open urgent issues went missing and the check passed,
  while "My issues" showed "This view could not be re-rendered". `herdr-app status` listed no error either. The tests in
  `tests/parts/` draw every part with issues and catch this; still look at the panel, in each view, and on an issue's
  page.
- **Places come in window pixels, lengths go out scaled by the zoom.** Herdr multiplies every length a mod gives it by
  the person's zoom (`settings().zoom`), a popup's size included, and tells where the pointer and an element are
  (`e.position`, `e.bounds`) in window pixels. A place read from an event is divided by the zoom before it becomes an
  offset (a tooltip, the carried issue), and a popup's size is multiplied by it before the popup is fitted inside the
  panel. Otherwise, at zoom 1.1, a tooltip hangs too low by a tenth of its distance from the panel's top.
- **Tooltips are the mod's own.** Herdr's `tooltip()` takes text only. `Hints.on()` records the hovered control's bounds
  (`on_mouse_move`) and clears them when the pointer leaves (`on_hover`); the root draws the bubble as an absolute
  child, under the control, above it when asked or when the panel has no room for the bubble's height under it, or
  (`side: "right"`, the page's lines) on its right, centered on it down the panel. A mod cannot measure text, so the
  bubble's width is reckoned (6.3 px a character, 20 px or more a key; a status's times have a set width). Centered,
  the bubble sits in the middle of an absolute row that reaches as far on each side of the control's middle as the
  panel's nearer edge (`justify_center`), so an error in the reckoned width does not shift it; when that width would
  pass an edge of the panel, the bubble is set against that edge instead (`left` or `right` of 4 px). Two gaps that
  shrink around the bubble (`flex_shrink`) do not center it: Herdr laid them out about 40 px off. An element takes one
  `on_hover`: a control that needs its own passes it to `Hints.on()`. A tooltip does not outlive its control:
  `showing()` drops it when a drawing no longer names its control, since a control that went away while the pointer
  was on it is never told the pointer left. The panel tells `Hints` the held modifiers and keys from its own
  key handlers (`on_key_down`, `on_key_up`, `on_modifiers_changed`), which is how a showing tooltip's key boxes light.
- **Two popups can be open at once**, which the issue menu uses for its pages, and the label picker for its groups. A
  page gets the menu's overlay id (`parent`) and closes it after a pick. The menu does not close its page when it
  closes itself: a click in the page may count as a click outside the menu, and the page would be gone before it took
  the click.
- **A shifted or Alt-ed key has several spellings.** Depending on the keyboard layer, Shift+comma arrives as `,` or `<`,
  Alt+c as `c` or `ç`. `copyShortcut` in `lib/keys.js` accepts each. These chords were not pressed in this build.
- **A mod shows images from Herdr's own folder only.** `image()` given a web address draws nothing, so members have no
  pictures here, and neither do the merge requests' authors: showing them would mean downloading each one, which this
  mod does not do. Their initials stand in. A team's icon that is one of Linear's own names, or a custom emoji, cannot
  be drawn either.
- **A popup cannot do the work.** It closes before the work ends, and a closing copy's tasks are cancelled. Hence the
  shared key. The panel records the key's `at` when it starts, so a request left over from a restart or reload is not
  replayed.
- **Popups draw their own box.** Herdr's frame has corners that cannot be made rounder: every popup and the command
  window open with `frame: "none"`, and the part draws the background, border, corners and shadow (`boxed()` in
  `parts/menu.js`). The border is inside the size the opener gives, so each height below counts its 2 px.
- **Popups are as tall as their content, and are cut at the window's edge.** A list that only flexes (`flex_1`)
  collapses to nothing in a popup: give it a height. Herdr does not move a popup that would pass the window's bottom:
  the opener passes where it goes (`where` in `popups.js`: the press, or the control it opens below, above or beside,
  and the panel's bounds, which a root `on_mouse_move` records), so it needs the height in advance (each popup's part
  exports the `heightFor` that `popups.js` uses): rows × 31 + 12 for
  the Copy page; rows × 31 + 56 for the issue menu with Start, 47 without (also on several issues); 80 for Start; for a
  property's choices 44 + rows × 28 (at most 16), plus 9 a rule between blocks, plus 28 with its chip; 38 plus 31 a team
  for New issue, 52 plus 31 a team for a move of team; rows × 31 + 9 a rule + 12 for the comment menu; 138 for the
  display options: its three lines and separator, which is also what the six period choices need at 21 px a row; for the
  label picker, 52 (a search line and a rule, 12 for a group's page without a search, 55 with one) plus the list, which
  is the rows it holds at 31 px each (12 at most, 10 for a group, 4 at least), 60 more outside a group's page for the
  block captions and rules, plus its worn block, cut to the room below
  the control. A popup is as wide as its content needs by the reckoning of `fitWidth` (7 px a character), and, opened
  beside a control, no wider than the room beside it leaves, 190 px at least.
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
  `lib/listing.js` spells out the title and identifier orders, and `lib/labels.js` the labels' alphabetical order, both
  through `compareText` of `lib/text.js`.
- **A child cannot be styled by its row's hover.** `hover()` styles the hovered element only, and there is no group
  hover. The checkbox therefore follows the panel's own record of the row under the pointer (`on_hover`, then
  `cx.notify()`), and is `invisible()` otherwise, which keeps its place.
- **Types go in JSDoc, and host types are named in `types.d.ts`, never imported in a comment.** `herdr-app check` takes
  `import("gpui-kit")` inside a comment of a `.js` file for a real import and writes `gpui-kit.d.ts` into that file's
  folder. Those host types also drop `x` and `y` from an element's bounds (an `extends` the checker rejects), which
  `types.d.ts` adds back.
- **A hover style does not recolor an icon.** `hover()` recolors the element's text, but an `svg()` takes its color when
  it is described. A mark made of an icon (a row's priority and estimate, a header's arrow and figure, a round button's
  icon) therefore brightens through the panel's own note of the mark under the pointer (`on_hover`, then
  `cx.notify()`), not through `hover()`.
- **An icon has one color.** `svg()` paints a file's shapes in the text color, whatever colors the file names. A mark on
  a filled shape must be a hole in it.
- **A linked mod folder is loaded but not watched.** With `mods/linear-panel` a symbolic link to a checkout elsewhere,
  saving a file there reloads nothing. Touching the link does (`touch -h`), which is what `pnpm run reload` runs.
- **Text in a mod cannot be selected, except Markdown the mod draws.** A comment's text is selectable; anything else the
  person must copy (a setup command) needs a Copy button.
- **A page's text fields hold the keyboard, and must be given back.** Each field counts its focus on the page
  (`typing`), and the panel's own keys stay off while the count is above zero. A field that is freed with a focus on it
  is not blurred, so the page blurs it first, then `release()`s it; every field is released when the page goes. A
  comment's edit field is opened by a menu that is closing, and Herdr hands the keyboard around as that popup goes: the
  field asks for it again at 30, 120, 250 and 500 ms. The panel does not take the keyboard back from a popup's close
  while a comment is being edited.
- **The page's slide is the page's position, animated.** The page is drawn first at the panel's right edge (`left` equal
  to the panel's width), and 30 ms later at 0, which the `transition("left")` animates. Its width is the panel's
  whatever the width is now, since the panel can be resized while the page shows. It is closed by the same move back,
  and dropped from the panel 60 ms after the slide ends; the list behind answers the pointer again as soon as the move
  starts.
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
  click in the panel, and never while a popup's input or a text field of the page is being typed in.
- **Links to Linear.** Linear's docs give the desktop form: the same URL with `linear://` in place of `https://`
  (`linear://linear.app/...`). A new issue is `https://linear.app/team/<KEY>/new`, here with `?assignee=me`. `open` on
  macOS and `xdg-open` on Linux fail when no app claims the scheme, which is the cue to open the https URL. Windows asks
  the person what to do instead of failing, so there `reg query HKCR\linear /ve` says first whether the app is
  installed, and `rundll32 url.dll,FileProtocolHandler` opens the address that fits. A link in a description or a
  comment goes through `openLink`: an address of the tracker opens in its app first, any other in the browser, and
  nothing that is not a web address or the tracker's own is ever handed to the system. When nothing takes an address,
  the toast "Could not open ADDRESS" says so.
- **A group's outline must not move the list.** Each status group always has a 1 px border, in the background's color; a
  drag only recolors it.
- **Limits.** Followed through every page: the teams asked for, the projects, a team's labels, an issue's comments,
  its status history, a cycle's planned issues, the merge request details, and a change to more than 50 issues (sent 50
  at a time). Capped, with the rest never read: 100 issues per view ("All" completed issues soon exceeds it; the line
  "Showing the first 100 issues" says so), the viewer's first 50 teams, 50 statuses, 100 members and 20 cycles per team,
  100 members per project, 10 labels and 20 merge requests per issue. A team's statuses and scale, its labels and a
  project's members are kept between runs and read again once a run: a change made in Linear shows after the mod is
  reloaded. Start works for spaces on this computer only.
- **Write each method chain one call per line.** The linter fails `a.filter(f).map(g)` written on one line: put each
  call after the first on its own line, indented once (`.flatMap(...)`, `.filter(...)`). A chain of a single call is
  free. A fresh build writes `x.filter(f).map(g)` by habit and fails `pnpm run lint`.
- **Keep every line within 120 characters, the recipe's and the README's too.** `tests/unit/style.test.js` fails on a
  longer line in a `.js`, `.ts`, `.json` or `.md` file, a long comment or a Markdown paragraph as much as code. Only a
  Markdown table row may pass.
- **A name that holds a number says its unit.** `MIN_SPIN_MS`, `RELOAD_EVERY_MS`, `TOAST_MS`, `HEADER_HEIGHT_PX`,
  `MENU_ROW_HEIGHT_PX`, `DAY_MS`: milliseconds end in `_MS`, pixels in `_PX`. A bare `HEADER_HEIGHT = 42` lets a
  time and a length be added by mistake.
- **A closed set of strings goes in `enums.js`.** A status type, a view key, a copy entry, a property page: its values
  are written once there as a frozen object (`StateType.STARTED`), never again as a string in another file, in a
  comparison or a record key. A list that shows icons names them in the table of `config.js` or `lib/`, not in the
  drawing.
- **Clean text where it is read, once.** `cleanAnswer` runs in `request()` and nowhere else; do not clean again in a
  part, and do not read an answer before it. A part that built its own request, or the stand-in tracker of the tests,
  would show a title's escape sequence as the terminal would run it. A title is a one-line label: only `body` and
  `description` may keep a newline.
- **The key needs write access** for Start and for every change to an issue, a comment included.
- **Not exercised by a real pointer or keyboard in this build:** the checkbox under the pointer, its tooltip and `x`,
  the hover pages of the issue menu, and the key chords. The tests drive them through the stand-in for Herdr only.
  Reading `$LINEAR_API_KEY` was not exercised either: the build machine uses the Keychain item. Linux and Windows were
  not run at all: their commands are covered by the tests only, against a stand-in for the system.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/linear-panel` passes, `pnpm test` passes, `pnpm run typecheck` reports
  nothing, `pnpm run lint` reports nothing, and `herdr-app status` lists no errors. The workflow in
  `.github/workflows/test.yml` runs the last two and `pnpm test`.
- An issue titled `Fix` + `ESC ] 52 ; c ; aGk= BEL` + ` login` (the stand-in tracker can serve one) shows as "Fix login"
  in the row, on the page, in the menu chip and in "Copy title", with no mark where the sequence was and nothing on the
  clipboard but the copied text; a title with a newline in it shows on one line with a space; a description or a
  comment with a newline in it keeps its line break, and one with a sequence loses it.
- `CHANGELOG.md` exists and lists the sanitizing, the workflow and the changelog itself under "Unreleased".
- With the `api` setting at `http://example.com/graphql`, the panel shows "The api setting must be an https address, or
  an http one on this computer" and sends nothing; `http://localhost:4747/graphql` is accepted.
- The "Linear" button shows the panel, and hides it when pressed again. Exactly one copy of the panel exists.
- With no key, the panel shows the 42 px header and the setup steps, and "Copy" copies the command. With a wrong key, it
  shows "Authentication required, not authenticated". With a key, the header is gone and the panel starts with the
  pills.
- With a key, your cycle's issues appear grouped by status, each with its priority mark, status icon and estimate, and
  each status header shows its estimate points. The total under the pills reads the estimate points, and a click on it
  switches it and the headers to issue counts and back; the selected pill does not change under the pointer.
- The display button opens the display options; each choice reorders the list as described and survives a restart. With
  recency on, the Done group matches Linear's.
- Clicking a row slides its page in from the right, with the title editable in place; the back button
  and Escape slide it out. Command-clicking a row opens the issue in the Linear app.
- On the page, a click on the status, priority, assignee, estimate or cycle opens its choices beside it (under it when
  the properties are in several columns), flipping above or scrolling when there is no room, and picking one changes
  the issue; the team line moves the issue to another team; `l` and the "+" button open the label picker, where a
  label can be worn and taken off several times in one visit, a group's labels exclusive.
- A comment can be posted, replied to, edited, resolved and deleted from the page; the comment menu offers Edit and
  Delete on my comments only. The page lists at most three merge requests, with a title cut at 48 characters, and
  "Show N more" lists the rest.
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
