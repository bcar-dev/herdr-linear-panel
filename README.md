# herdr-linear-panel

A mod for the [Herdr](https://herdr.dev) app: the Linear issues assigned to you, in a side panel beside your terminals.

![Linear panel](preview.png)

- Two views, the current cycle and all your issues, grouped by status and ordered as Linear orders them.
- Click an issue to open its page in the panel: description (read-only), properties, labels and comments (write,
  edit, reply, resolve, delete), the title and comments editable in place. Pickers open beside the
  control you press and follow the keyboard.
- Change an issue's status, priority, assignee, estimate, cycle or labels from its row, its page, its menu, or the
  keyboard. Drag a row to another status.
- See each issue's merge requests on its row, merged or not, and open them all in one click.
- Rest the pointer on an issue's status to see how long the issue has been in each status, and on its cycle to see the
  cycle's capacity, how much of it is done and the weekdays it has left.
- Tick several issues and change them together from a command window (`Cmd+K`).
- Copy one issue or several as IDs, links, Markdown, a prompt or their diffs as a list of links.
- Start work on an issue: a git worktree on its branch, a new space there, and your agent briefed with the issue.

## Install

Ask the agent in your Herdr window to add the mod from this repository. It copies `mods/linear-panel` into your Herdr
folder and adds two blocks to your layout: the panel, and its button in the top bar. The "Layout" paragraph of the
[recipe](RECIPE.md) lists both.

It is written for macOS, Linux and Windows, although only macOS has been actively tested.

### A ready-made layout

The mod carries an example, `mods/linear-panel/examples/main-linear.json`: Herdr's `main` layout with the two blocks
already in place. With the mod installed, copy it into your layouts and switch to it:

```sh
cp ~/.config/herdr-app/mods/linear-panel/examples/main-linear.json ~/.config/herdr-app/layouts/
herdr-app do layout.switch '{"name":"main-linear"}'
```

`ctrl-shift-l` switches back to your own layout. The example is `main` as it was in Herdr 0.1.16: on a later Herdr,
prefer a clone of your own `main` with the two blocks added.

The panel's block in the example carries a `pre_linear_issue_prompt` and a `post_linear_issue_prompt` whose lines say
what they are for. Replace them with your own, or remove the settings: left as they are, those texts open and close
the first message your agent receives when you start an issue.

## API key

The panel shows these steps until it finds a key.

1. Create a personal API key in Linear, under Settings, Account, Security and access. Changing an issue needs write
   access.
2. Give it to the mod, from a terminal:

   ```sh
   # macOS: the Keychain (prompts for the key)
   security add-generic-password -U -a "$USER" -s herdr-linear -w
   # Linux: the keyring (prompts for the key)
   secret-tool store --label="Linear API key" service herdr-linear
   # Windows: a variable, with your key in place of KEY; then restart Herdr
   setx LINEAR_API_KEY KEY
   ```

   On macOS and Linux you can export `LINEAR_API_KEY` instead.

The key stays there. The mod reads it once, keeps it in memory (dropped when Linear refuses it) and stores nothing.

## Keys

Click in the panel first: it then has the keyboard.

| Key | Does |
| --- | --- |
| `1`, `2` | Current cycle, My issues |
| `C` | New issue |
| `R` | Reload |
| `Shift+V` | Display options |
| `X` | Tick the issue under the pointer; with `Shift`, every issue from the last one ticked to it |
| `S`, `P`, `A`, `Shift+E`, `Shift+C` | Status, priority, assignee, estimate, cycle of the ticked issues, else of the issue under the pointer or the open page |
| `I` | Un-assign from me |
| `Cmd+K` | Command window on the ticked issues |
| `Esc` | Untick everything; close the issue's page |
| `L` | Labels of the open issue |
| `Cmd+Shift+M` | Move the open issue to another team |
| `Cmd+.` and the other copy shortcuts of Linear | Copy the ticked issues, else the issue under the pointer |

`Cmd` is `Ctrl` off macOS.

## Settings

The panel takes its settings from its block in your layout (`layouts/<name>.json` in your Herdr folder), as `props`:

```json
{ "mod": "linear-panel", "props": {
    "agent": "codex",
    "pre_linear_issue_prompt": ["Before you start on the issue below:", "1. Work in this worktree only."],
    "post_linear_issue_prompt": ["Once you have read the issue:", "1. Plan before you write code."] } }
```

- `agent`: the agent Start runs, by its key in Herdr's table of programs (`claude`, `codex`, or one you added to
  `programs.json`). Without it, Start runs the agent you start most among those installed, as Herdr lists them.
- `pre_linear_issue_prompt`: what the agent's first message opens with, as one text or as a list of lines. After it
  come what you type when you start the issue, then the issue as "Copy as prompt" gives it. Its old name,
  `start_prompt`, is still read.
- `post_linear_issue_prompt`: what the agent's first message ends with, after the issue, in the same form. Use it for
  what the agent does once it has read the issue.
- `api`: an address the panel asks instead of Linear's API, for a stand-in that serves made-up issues (a demo, a
  screenshot that shows none of your own). The panel sends your API key to that address: name only a server you run.
  It must be an https address, or an http one on this computer (`localhost`, `127.0.0.1`, `[::1]`); else the panel shows
  an error and sends nothing.

## Colors

The panel uses your Herdr theme. To match your Linear theme, set the colors in your own `settings.json`, not in the mod:

```json
"colors": { "accent": "#00D3FE", "background": "#011526" }
```

## Development

The mod is plain JavaScript, typed through JSDoc: `types.d.ts` declares the shapes, JSDoc comments name them, and the
TypeScript compiler checks every file. Tests need Node 26 or
later and no dependency; the type check and the linter are dev dependencies, installed with pnpm, which waits ten days
before taking a new release (`pnpm-workspace.yaml`).

```sh
pnpm install        # once: TypeScript and ESLint, for the two checks below
pnpm test           # unit tests, and every part driven in a stand-in for Herdr
pnpm run typecheck  # the strict TypeScript check; needs gpui-kit.d.ts, which Herdr writes into the mod's folder
pnpm run lint       # ESLint: its recommended rules, two-space indent, one call per line in a method chain
pnpm run check      # Herdr's own check of the mod
pnpm run link       # link mods/linear-panel into your Herdr folder, once
pnpm run reload     # make Herdr load your changes
```

Herdr loads a linked folder but does not watch it, hence `reload`.

```
mods/linear-panel/
  main.js       picks the part a copy of the mod shows
  mod.json      the mod's title and place
  config.js     sizes, timings, paths and option lists
  enums.js      the closed sets of strings the mod passes around
  actions.js    copying an issue, and starting work on it
  dock.js       where the panel sits in the layout
  parts/        the panel, the issue list and page, its button and each popup
  lib/          the rules, free of Herdr, tested by node (`sanitize.js` cleans what the tracker sends)
  tracker.js    everything that names Linear
  api.js        the GraphQL queries
  ui.js         the shared building blocks: pill rows, round buttons, marks, key caps
  channel.js    how the popups ask the panel for work
  popups.js     every popup's size, place and props
  types.d.ts    the shapes the files pass around, for the type check
  icons/        the mod's own icons, and a few from Lucide
  examples/     a layout with the panel and its button in place
  brand/        Linear's logo, with its notice
tests/
  fixtures.js   the made-up issues and the stand-in tracker
  host/         the stand-in for Herdr
  unit/         tests of lib/ and of the repository's style
  parts/        tests of the parts: clicks, keys, drags
```

The linter and the tests run on every push to `main` and every pull request (`.github/workflows/test.yml`). What
changed is in the [changelog](CHANGELOG.md).

When Herdr is installed, the stand-in reads its `gpui-kit.d.ts` and refuses any element method that Herdr does not have.

## Icons

`clipboard.svg`, `external-link.svg`, `refresh.svg`, `sort-down.svg`, `sort-up.svg`, `git-merge.svg`,
`git-pull-request.svg`, `git-pull-request-draft.svg` and `git-pull-request-closed.svg` come unchanged from
[Lucide](https://lucide.dev) 1.82.0 (`refresh.svg` is its `refresh-cw`, `sort-down.svg` its `arrow-down-wide-narrow`
and `sort-up.svg` its `arrow-up-narrow-wide`), under the ISC and MIT licenses in `LUCIDE-LICENSE.txt`.

## Trademarks

Linear and the Linear logo are trademarks of Linear. The logo files in `mods/linear-panel/brand` come unchanged from
Linear's brand assets (<https://linear.app/brand>) and are not covered by the MIT license. This project is not
affiliated with or endorsed by Linear.

## License

[MIT](LICENSE). The icons that come from Lucide keep their own licenses
(`mods/linear-panel/icons/LUCIDE-LICENSE.txt`).
