// The shapes the mod's files pass around, for the checker only (jsconfig.json): Herdr never loads this file
// Everything here is global: nothing is imported or exported, so any file can name these types in its JSDoc comments

// Herdr's types that the mod's files name, under their own names. They are named here, not imported by the files:
// Herdr takes an import of "gpui-kit" for a real one even in a comment, and writes gpui-kit.d.ts beside that file
type Context = import("gpui-kit").Context;
type NativeElement = import("gpui-kit").NativeElement;
type FocusHandle = import("gpui-kit").FocusHandle;
type ClickEvent = import("gpui-kit").ClickEvent;
type KeyEvent = import("gpui-kit").KeyEvent;
type MouseButtonEvent = import("gpui-kit").MouseButtonEvent;

/** A color as Herdr's style methods take it: "#rrggbb" or "#rrggbbaa" */
type Color = import("gpui-kit").Color;

/** The theme's colors by name, as `theme()` of "herdr" answers them */
type Theme = Record<string, Color>;

type OnClick = (event: ClickEvent, cx: Context) => void;

/** How an element looks in one state, as `hover` takes it */
type Restyle = (el: NativeElement) => NativeElement;

/** A node of the layout `layout()` of "herdr" answers, with the fields dock.js reads */
type LayoutNode = { id?: string; children?: LayoutNode[]; hidden?: boolean; active?: string };

// Herdr's types leave `x` and `y` out of an element's bounds: the checker rejects, and so drops, the clause
// `ElementBounds extends import("gpui-kit").Point`. This block adds them back: remove it once gpui-kit.d.ts has them
declare module "gpui-shell" {
  export interface ElementBounds { x: number; y: number }
}

type Point = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Where a popup opens (lib/placement.js): at a press inside the panel's `frame`, or `beside` a menu entry, on the right
 * of it, or with `narrow` on the right whatever the room: the popup is then made as narrow as the room needs. `below`
 * is a control the popup opens under, at its left
 */
type Where = { point?: Point; frame?: Bounds; beside?: Bounds; below?: Bounds; above?: Bounds; narrow?: boolean };

/** What a tooltip says above its label (parts/hints.js): the element, and its size, which places the tooltip */
type TipBody = { el: NativeElement; width: number; height: number };

/** The tooltip showing (parts/hints.js). `body` draws what it says above its label, or answers null for nothing */
type Tip = {
  key: string;
  label: string;
  caps: string[];
  side: Side;
  bounds: Bounds;
  body?: (t: Theme) => TipBody | null;
};

/** Where a tooltip hangs in the panel (lib/placement.js): offsets from its edges, or `center` from its left edge */
type TipSpot = (
  | { left: number; right?: undefined; center?: undefined }
  | { right: number; left?: undefined; center?: undefined }
  | { center: number; left?: undefined; right?: undefined }
) & ({ top: number; bottom?: undefined } | { bottom: number; top?: undefined });

type WorkflowState = { id: string; name: string; type: string; color: Color; position: number };

/** A cycle of a team, as its picker lists it */
type Cycle = { id: string; number: number; name: string | null; startsAt: string; endsAt: string };

/**
 * An issue's cycle, with what its tooltip says: its description (where a team writes its capacity), the share done
 * (`progress`, from 0 to 1) and its scope in points by day, the last being today's
 */
type IssueCycle = Cycle & { description: string | null; progress: number; scopeHistory: number[] };

type CycleTense = import("./lib/cycles.js").CycleTense;
type MergeStatus = import("./lib/merges.js").MergeStatus;

/** A merge request (GitLab) or pull request (GitHub) linked to an issue (lib/merges.js). `userLogin` is its author */
type Merge = {
  sourceType: SourceType;
  url: string;
  number: number;
  title: string;
  status: MergeStatus;
  repoLogin: string;
  repoName: string;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  userLogin: string;
};

/** What a merge request's card adds once asked: its changes, and the reviewers who submitted a review */
type MergeDetails = {
  url: string;
  files: number;
  added: number;
  removed: number;
  reviewers: { name: string; approved: boolean }[];
};

type MergeStanding = import("./lib/merges.js").MergeStanding;
type MergeTint = import("./lib/merges.js").MergeTint;

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
  team: { id: string; key: string; name: string; color: Color | null; icon: string | null };
  assignee: Member | null;
  project: { id: string; name: string } | null;
  labels: { nodes: IssueLabel[] };
  attachments: { nodes: { sourceType: Merge["sourceType"]; metadata: Omit<Merge, "sourceType"> }[] };
};

/** A label: `parent` is the group it belongs to. A group (`isGroup`) is not worn itself, it holds labels */
type IssueLabel = { id: string; name: string; color: Color; parent: { id: string } | null };
/** A label of a team or the workspace, as the label picker lists it */
type AnyLabel = IssueLabel & { isGroup: boolean; team: { id: string } | null };

type CommentChange = import("./enums.js").CommentChange;

/** A comment of an issue's page: a reply names the comment it answers in `parent` */
type PageComment = {
  id: string;
  body: string;
  createdAt: string;
  url: string;
  resolvedAt: string | null;
  parent: { id: string } | null;
  user: Member | null;
  botActor: { name: string } | null;
};

type Member = {
  id: string;
  name: string;
  displayName: string;
  initials: string | null;
  avatarBackgroundColor: Color | null;
};

/** A team of the loaded issues: what it offers them. `cycles` are its cycles to come, current and previous */
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

/** A team I belong to, as the composer of a new issue needs it */
type MyTeam = { id: string; key: string; name: string; color: Color | null; icon: string | null };

/** One stay of an issue in a status, still running without `endedAt`. `state` is null for a status deleted since */
type StatusSpan = { startedAt: string; endedAt: string | null; state: WorkflowState | null };

/** The time an issue has spent in a status, over all its stays, and whether it is in it now (lib/history.js) */
type StatusTime = { state: WorkflowState; ms: number; current: boolean };

/** What some entries of the Copy menu read about an issue, beyond the issue itself */
type IssueDetails = { description?: string | null; comments?: PageComment[] };

/** The same change on several issues, as the API's update takes it */
type IssueUpdate = {
  stateId?: string; priority?: number; estimate?: number | null; assigneeId?: string | null; cycleId?: string | null;
  teamId?: string; title?: string; addedLabelIds?: string[]; removedLabelIds?: string[];
};

/** The two views as API issue filters (lib/listing.js). A filter is the API's own object, or null for none */
type IssueFilters = { cycle: object; mine: object | null };

type IssueConnection = { nodes: Issue[]; pageInfo: { hasNextPage: boolean } };

type Viewer = {
  id: string;
  initials: string | null;
  avatarBackgroundColor: Color | null;
  teams: { nodes: MyTeam[] };
  cycle: IssueConnection;
  all: IssueConnection;
};

/** A team as the API answers it: its states and its members each come in a page */
type TeamAnswer = Omit<Team, "states" | "members" | "cycles"> & {
  states: { nodes: WorkflowState[] };
  members: { nodes: Member[] };
  cycles: { nodes: Cycle[] };
};

type PageInfo = { hasNextPage: boolean; endCursor: string };

/** A page of an API list; `pageInfo` is left out by the answers that are never followed */
type Connection<Node> = { nodes: Node[]; pageInfo?: PageInfo };

type CommentMutation = "commentCreate" | "commentDelete" | "commentResolve" | "commentUnresolve" | "commentUpdate";

/** The fields of a query's answer: each query makes its own, which is why the mutations' are optional */
type ApiData = {
  viewer: Viewer;
  teams: Connection<TeamAnswer>;
  issue: {
    description: string | null;
    comments: Connection<PageComment>;
    stateHistory: Connection<StatusSpan>;
  };
  issueLabels: Connection<AnyLabel>;
  commentCreate: { success: boolean };
  projects: Connection<{ id: string; members: { nodes: Member[] } }>;
  cycle: { issues: Connection<Pick<Issue, "estimate" | "team">> };
  pullRequests: Connection<{
    url: string;
    diffStats: { fileCount: number; additions: number; deletions: number } | null;
    reviewerStates: {
      lastSubmittedDecision: string | null;
      reviewer: { displayName?: string; name?: string } | null;
    }[];
  }>;
  issueBatchUpdate: { success: boolean };
} & Partial<Record<CommentMutation, { success: boolean }>>;

/** The body of an API answer */
type ApiAnswer = { data?: ApiData; errors?: { message: string }[] };

type ViewKey = import("./enums.js").ViewKey;

/** A status with its issues */
type Group = { state: WorkflowState; issues: Issue[] };

type Display = {
  by: Ordering;
  reversed: boolean;
  recency: boolean;
  completed: Completed;
};

/** What every row of one drawing shares (parts/issue-list.js) */
type Look = { t: Theme; identifierWidth: number; estimateWidth: number; lit: string | null };

type Property = import("./enums.js").Property;
type Page = import("./enums.js").Page;
type CopyWhat = import("./enums.js").CopyWhat;
type SourceType = import("./enums.js").SourceType;
type Side = import("./enums.js").Side;
type Ordering = import("./enums.js").Ordering;
type Completed = import("./enums.js").Completed;
type Mark = import("./enums.js").Mark;

// The members of two enums, to name a case of a union by its member
type KeyActions = typeof import("./enums.js").KeyAction;
type Kinds = typeof import("./enums.js").RequestKind;

/** A copy shortcut (lib/keys.js): the entry, the spellings of its key, the modifiers held with it, the keys shown */
type CopyKey = { what: CopyWhat; keys: string[]; held: { shift?: boolean; alt?: boolean }; caps: string[] };

/** A value of a closed set and its label, as a dropdown offers it (config.js) */
type NamedOption<T extends string> = { id: T; label: string };

/** What a key press in the panel asks for (lib/keys.js): `do`, and what that one needs */
type KeyAsk =
  | { do: KeyActions["COMMANDS"]; page?: Property }
  | { do: KeyActions["COPY"]; what: CopyWhat }
  | { do: KeyActions["VIEW"]; nth: number }
  | { do: KeyActions["CHOOSE"]; page: Property }
  | { do: KeyActions["TICK"]; extend: boolean }
  | { do: KeyActions["COMPOSE" | "RELOAD" | "DISPLAY" | "UNASSIGN" | "UNTICK"] };

/** A row of the command window. `note` follows its label, dimmed */
type Choice = {
  label: string;
  note?: string;
  icon: NativeElement;
  key?: string | null;
  caps?: string[];
  mark?: Mark | null;
  /** The block of the list it belongs to: a rule is drawn between blocks */
  group?: number;
  run: () => void;
};

/** Work on issues, which the panel does when a popup, a key or a drop asks for it */
type Work =
  | { kind: Kinds["UPDATE"]; input: IssueUpdate }
  | { kind: Kinds["COMMENT"]; change: CommentChange | "start-edit"; comment: string; extra?: string }
  | { kind: Kinds["CLIPBOARD"]; text: string; label: string }
  | { kind: Kinds["STATUS"]; name: string }
  | { kind: Kinds["COPY"]; what: CopyWhat }
  | { kind: Kinds["START"]; text: string }
  | { kind: Kinds["OPEN"] };

/** What a popup asks for: work on issues, display options that changed, or the tracker's composer for a team */
type Ask = Work | { kind: Kinds["DISPLAY"]; change: Partial<Display> }
  | { kind: Kinds["COMPOSE"]; team: MyTeam };

/** A request to the panel: the ids of its issues, and `at` once it is sent */
type PanelRequest = Ask & { ids: string[]; at?: number };

/** The issue a popup is open on, and the overlay of that popup */
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
  /** How many rows the list of a popup shows at once, when the room is short: it scrolls past them */
  visible?: number;
};
type DisplayProps = { part: "display"; display: Display };
/** My teams: to pick the one a new issue goes in, or with `issue` the one that issue moves to */
type TeamPickerProps = { part: "teams"; teams: MyTeam[]; issue?: Issue };
/**
 * The label picker of an issue: every label its team can wear, the ids of the ones it wears, and the ones listed
 * first (those most used on my issues). With `group`, the page of that group's labels, opened beside the picker
 */
type LabelsProps = {
  part: "labels"; issue: Issue; labels: AnyLabel[]; frequent: string[]; group?: string; parent?: string;
  /** A group's page opened from a label of the issue (no `parent`): it has a search field, and closes on a choice */
  searchable?: boolean;
  frame?: Bounds;
  list: number;
};

type CommentMenuProps = { part: "comment-menu"; issue: Issue; comment: PageComment; own: boolean };

type PopupProps = CommentMenuProps | IssueMenuProps | CopyMenuProps | StartProps | CommandsProps
  | DisplayProps | TeamPickerProps
  | LabelsProps;

/** The props a popup's part is built from: those it was opened with, and the id Herdr gave its overlay */
type Opened<Props> = Props & { overlay: string };

/** The props of any copy of the mod: a popup's, the button's, or none for the panel */
type PartProps = Opened<PopupProps> | { part?: "button"; overlay?: string } | PanelProps;

/**
 * The person's settings, given to the panel's block in their layout. `agent` is the key, in Herdr's table of
 * programs, of the agent Start runs. `start_prompt` opens that agent's first message: a text, or its lines. `api` is
 * the address of a stand-in for the tracker's API
 */
type PanelProps = {
  part?: undefined; overlay?: undefined; agent?: string; start_prompt?: string | string[]; api?: string;
};

/** An agent people can start, as Herdr lists them: its key and name in the table of programs, and how to run it */
type Agent = { key: string; name: string; run: string[]; installed: boolean };

/** The panel, as the list it draws reads it (parts/issue-list.js) */
type Panel = import("./parts/panel.js").Panel;

/** One part of the mod. `replaced` is set by a popup that only made way for another one */
type Part = {
  render(t: Theme, cx: Context): NativeElement;
  replaced?: boolean;
};

type PartClass = new (props: PartProps, cx: Context) => Part;
