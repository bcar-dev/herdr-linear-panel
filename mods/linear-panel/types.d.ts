// The shapes the mod's files pass around, for the checker only (jsconfig.json): Herdr never loads this file.
// Everything here is global: nothing is imported or exported, so any file can name these types in its JSDoc comments.

// Herdr's types that the mod's files name, under their own names. They are named here, not imported by the files:
// Herdr takes an import of "gpui-kit" for a real one even in a comment, and writes gpui-kit.d.ts beside that file.
type Context = import("gpui-kit").Context;
type NativeElement = import("gpui-kit").NativeElement;
type FocusHandle = import("gpui-kit").FocusHandle;
type ClickEvent = import("gpui-kit").ClickEvent;
type KeyEvent = import("gpui-kit").KeyEvent;
type MouseButtonEvent = import("gpui-kit").MouseButtonEvent;

/** A color as Herdr's style methods take it: "#rrggbb" or "#rrggbbaa". */
type Color = import("gpui-kit").Color;

/** The theme's colors by name, as `theme()` of "herdr" answers them. */
type Theme = Record<string, Color>;

type OnClick = (event: ClickEvent, cx: Context) => void;

/** How an element looks in one state, as `hover` takes it. */
type Restyle = (el: NativeElement) => NativeElement;

/** A node of the layout `layout()` of "herdr" answers, with the fields dock.js reads. */
type LayoutNode = { id?: string; children?: LayoutNode[]; hidden?: boolean; active?: string };

// Herdr's types leave `x` and `y` out of an element's bounds: the checker rejects, and so drops, the clause
// `ElementBounds extends import("gpui-kit").Point`. This block adds them back: remove it once gpui-kit.d.ts has them.
declare module "gpui-shell" {
  export interface ElementBounds { x: number; y: number }
}

type Point = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };

/** Where a popup opens (lib/placement.js): at a press inside the panel's `frame`, or `beside` a menu entry. */
type Where = { point?: Point; frame?: Bounds; beside?: Bounds };

/** What a tooltip says above its label (parts/hints.js): the element, and its size, which places the tooltip. */
type TipBody = { el: NativeElement; width: number; height: number };

/** The tooltip showing (parts/hints.js). `body` draws what it says above its label, or answers null for nothing. */
type Tip = {
  key: string;
  label: string;
  caps: string[];
  side: "below" | "above";
  bounds: Bounds;
  body?: (t: Theme) => TipBody | null;
};

/** Where a tooltip hangs in the panel (lib/placement.js): offsets from its edges, or `center` from its left edge. */
type TipSpot = (
  | { left: number; right?: undefined; center?: undefined }
  | { right: number; left?: undefined; center?: undefined }
  | { center: number; left?: undefined; right?: undefined }
) & ({ top: number; bottom?: undefined } | { bottom: number; top?: undefined });

type WorkflowState = { id: string; name: string; type: string; color: Color; position: number };

/** A cycle of a team, as its picker lists it. */
type Cycle = { id: string; number: number; name: string | null; startsAt: string; endsAt: string };

/**
 * An issue's cycle, with what its tooltip says: its description (where a team writes its capacity), the share done
 * (`progress`, from 0 to 1) and its scope in points by day, the last being today's.
 */
type IssueCycle = Cycle & { description: string | null; progress: number; scopeHistory: number[] };

/** Where a cycle stands among its team's (lib/cycles.js): "next" is the first to come, "previous" the last ended. */
type CycleTense = "current" | "next" | "future" | "previous" | "past";

type Issue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  priority: number;
  estimate: number | null;
  branchName: string;
  completedAt: string | null;
  canceledAt: string | null;
  state: WorkflowState;
  cycle: IssueCycle | null;
  team: { id: string };
};

type Member = {
  id: string;
  name: string;
  displayName: string;
  initials: string | null;
  avatarBackgroundColor: Color | null;
};

/** A team of the loaded issues: what it offers them. `cycles` are its cycles to come, current and previous. */
type Team = {
  id: string;
  issueEstimationType: string;
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
  defaultIssueEstimate: number;
  states: WorkflowState[];
  members: Member[];
  cycles: Cycle[];
};

/** A team I belong to, as the composer of a new issue needs it. */
type MyTeam = { key: string; name: string };

type IssueComment = { body: string; createdAt: string; user: { name: string } | null };

/** One stay of an issue in a status, still running without `endedAt`. `state` is null for a status deleted since. */
type StatusSpan = { startedAt: string; endedAt: string | null; state: WorkflowState | null };

/** The time an issue has spent in a status, over all its stays, and whether it is in it now (lib/history.js). */
type StatusTime = { state: WorkflowState; ms: number; current: boolean };

/** What some entries of the Copy menu read about an issue, beyond the issue itself. */
type IssueDetails = { description?: string | null; comments?: IssueComment[] };

/** The same change on several issues, as the API's update takes it. */
type IssueUpdate = {
  stateId?: string; priority?: number; estimate?: number | null; assigneeId?: string | null; cycleId?: string | null;
};

/** The two views as API issue filters (lib/listing.js). A filter is the API's own object, or null for none. */
type IssueFilters = { cycle: object; mine: object | null };

type IssuePage = { nodes: Issue[]; pageInfo: { hasNextPage: boolean } };

type Viewer = { id: string; teams: { nodes: MyTeam[] }; cycle: IssuePage; all: IssuePage };

/** A team as the API answers it: its states and its members each come in a page. */
type TeamAnswer = Omit<Team, "states" | "members" | "cycles"> & {
  states: { nodes: WorkflowState[] };
  members: { nodes: Member[] };
  cycles: { nodes: Cycle[] };
};

/** The body of an API answer. `data` holds the fields of the query that was made. */
type ApiAnswer = {
  data: {
    viewer: Viewer;
    teams: { nodes: TeamAnswer[] };
    issue: { description: string | null; comments: { nodes: IssueComment[] }; stateHistory: { nodes: StatusSpan[] } };
    cycle: { issues: { nodes: Pick<Issue, "estimate" | "team">[] } };
    issueBatchUpdate: { success: boolean };
  };
  errors?: { message: string }[];
};

type ViewKey = "cycle" | "all";

/** A status with its issues. */
type Group = { state: WorkflowState; issues: Issue[] };

type Display = {
  by: "priority" | "title" | "status";
  reversed: boolean;
  recency: boolean;
  completed: "all" | "day" | "week" | "month" | "cycle" | "none";
};

/** What every row of one drawing shares (parts/issue-list.js). */
type Look = { t: Theme; identifierWidth: number; estimateWidth: number; lit: string | null };

/** A property of an issue a menu can change, which is also the page of its choices. */
type Property = "status" | "priority" | "estimate" | "assign" | "cycle";

/** A page of the command window: its list of actions, or the choices of one property. */
type Page = "actions" | Property;

type CopyWhat = "id" | "url" | "title" | "link" | "markdown" | "everything" | "branch" | "prompt";

/** A copy shortcut (lib/keys.js): the entry, the spellings of its key, the modifiers held with it, the keys shown. */
type CopyKey = [what: CopyWhat, keys: string[], held: { shift?: boolean; alt?: boolean }, caps: string[]];

/** What a key press in the panel asks for (lib/keys.js): `do`, and what that one needs. */
type KeyAsk =
  | { do: "commands"; page?: Property }
  | { do: "copy"; what: CopyWhat }
  | { do: "view"; nth: number }
  | { do: "choose"; page: Property }
  | { do: "tick"; extend: boolean }
  | { do: "compose" | "reload" | "display" | "unassign" | "untick" };

/** A row of the command window. `note` follows its label, dimmed. */
type Choice = {
  label: string;
  note?: string;
  icon: NativeElement;
  key?: string | null;
  caps?: string[];
  mark?: "all" | "some" | null;
  run: () => void;
};

/** Work on issues, which the panel does when a popup, a key or a drop asks for it. */
type Work =
  | { kind: "update"; input: IssueUpdate }
  | { kind: "status"; name: string }
  | { kind: "copy"; what: CopyWhat }
  | { kind: "start"; text: string }
  | { kind: "open" };

/** What a popup asks for: work on issues, display options that changed, or the tracker's composer for a team. */
type Ask = Work | { kind: "display"; change: Partial<Display> } | { kind: "compose"; team: MyTeam };

/** A request to the panel: the ids of its issues, and `at` once it is sent. */
type PanelRequest = Ask & { ids: string[]; at?: number };

/** The issue a popup is open on, and the overlay of that popup. */
type OpenOn = { issue: string; owner: string };

type IssueMenuProps = {
  part: "issue-menu"; issues: Issue[]; teams: Team[]; me: string; agent?: string | null; frame?: Bounds; origin?: Point;
};
type CopyMenuProps = { part: "copy-menu"; issues: Issue[]; parent: string };
type StartProps = { part: "start"; issue: Issue; agent: string };
type CommandsProps = {
  part: "commands";
  targets: Issue[];
  teams: Team[];
  page: Page;
  me: string;
  compact?: boolean;
  bare?: boolean;
  parent?: string;
};
type DisplayProps = { part: "display"; display: Display };
type TeamPickerProps = { part: "teams"; teams: MyTeam[] };

type PopupProps = IssueMenuProps | CopyMenuProps | StartProps | CommandsProps | DisplayProps | TeamPickerProps;

/** The props a popup's part is built from: those it was opened with, and the id Herdr gave its overlay. */
type Opened<Props> = Props & { overlay: string };

/** The props of any copy of the mod: a popup's, the button's, or none for the panel. */
type PartProps = Opened<PopupProps> | { part?: "button"; overlay?: string } | PanelProps;

/**
 * The person's settings, given to the panel's block in their layout. `agent` is the key, in Herdr's table of
 * programs, of the agent Start runs. `start_prompt` opens that agent's first message: a text, or its lines. `api` is
 * the address of a stand-in for the tracker's API.
 */
type PanelProps = {
  part?: undefined; overlay?: undefined; agent?: string; start_prompt?: string | string[]; api?: string;
};

/** An agent people can start, as Herdr lists them: its key and name in the table of programs, and how to run it. */
type Agent = { key: string; name: string; run: string[]; installed: boolean };

/** The panel, as the list it draws reads it (parts/issue-list.js). */
type Panel = import("./parts/panel.js").Panel;

/** One part of the mod. `replaced` is set by a popup that only made way for another one. */
type Part = {
  render(t: Theme, cx: Context): NativeElement;
  replaced?: boolean;
};

type PartClass = new (props: PartProps, cx: Context) => Part;
