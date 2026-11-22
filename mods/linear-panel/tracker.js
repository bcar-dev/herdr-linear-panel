// The issue tracker this panel talks to. Everything that names the product is here: what it is called, its
// addresses, and where its API key is kept. So is everything that differs between macOS, Linux and Windows:
// how an address is opened and where a secret is stored. The rest of the mod only says "the tracker".
import { exec, window } from "herdr";

export const NAME = "Linear";
// The id of the panel's block in the layout, and its name in the tab bar's list of side panels.
export const SLOT = "linear";

export const API = "https://api.linear.app/graphql";
export const KEY_PAGE = "https://linear.app/settings/account/security";

// The API key is this environment variable when set, else this item of the system's secret store.
const KEY_VARIABLE = "LINEAR_API_KEY";
const KEY_ITEM = "herdr-linear";

// The tracker does not draw every status in the color its API gives: its own app replaces some of its default colors
// with shades that read on a dark background. This table lists them, as measured in the app.
/** @type {Record<string, Color>} */
const DRAWN_AS = { "#0f783c": "#27a644" };

/** @param {Color} color */
export const drawnColor = (color) => DRAWN_AS[color.toLowerCase()] ?? color;

const SITE = "https://linear.app/";
const APP_SCHEME = "linear";

const platform = () => window()?.platform ?? "macos";
export const isMac = () => platform() === "macos";

// A program that is not installed counts as a failure.
/**
 * @param {string} command
 * @param {string[]} args
 */
const ran = (command, args) => exec(command, args).then((result) => result.code === 0, () => false);

// Answers whether a program took the address. Windows always answers yes.
/** @param {string} address */
export function browse(address) {
  if (platform() === "windows") return ran("rundll32", ["url.dll,FileProtocolHandler", address]);
  return ran(platform() === "linux" ? "xdg-open" : "open", [address]);
}

// One of the tracker's pages in its desktop app, which takes the same address under its own scheme, else in the
// browser. macOS and Linux fail to open an address nothing is registered for, which is the cue for the browser.
// Windows asks the person what to do instead, so there the registry is asked first whether the app is installed.
/** @param {string} url */
export async function openPage(url) {
  const inApp = url.replace("https://", `${APP_SCHEME}://`);
  if (platform() === "windows") return browse((await ran("reg", ["query", `HKCR\\${APP_SCHEME}`, "/ve"])) ? inApp
    : url);
  if (!(await browse(inApp))) await browse(url);
}

// The desktop app, brought to the front; the tracker's site in the browser when the app is not installed.
export async function openApp() {
  if (platform() !== "macos") return openPage(SITE);
  if (!(await ran("open", ["-a", NAME]))) await browse(SITE);
}

/** @param {MyTeam} team */
export const composeIssue = (team) => openPage(`${SITE}team/${team.key}/new?assignee=me`);

// How each system's secret store is read from a shell. Windows has no command that reads its own: the variable only.
/** @type {Record<string, string>} */
const STORED_KEY = {
  macos: `security find-generic-password -s ${KEY_ITEM} -w`,
  linux: `secret-tool lookup service ${KEY_ITEM}`,
};

// The API key, or "" when there is none. Read for each request: nothing is kept in the mod.
export async function apiKey() {
  if (platform() === "windows") {
    // cmd answers the name itself, percent signs included, for a variable that is not set.
    const answer = (await exec("cmd", ["/c", "echo", `%${KEY_VARIABLE}%`])).stdout.trim();
    return answer.startsWith("%") ? "" : answer;
  }
  const read = `printf %s "\${${KEY_VARIABLE}:-$(${STORED_KEY[platform()]} 2>/dev/null)}"`;
  return (await exec("sh", ["-c", read])).stdout.trim();
}

// How a person gives the mod its key on this system: the sentence of the setup step, and the command to run in a
// terminal. The stores prompt for the key, so it is never typed on a command line; Windows has only the variable.
export function keySetup() {
  /** @type {Record<string, string[]>} */
  const stores = {
    macos: ["the macOS Keychain", `security add-generic-password -U -a "$USER" -s ${KEY_ITEM} -w`],
    linux: ["your keyring", `secret-tool store --label="${NAME} API key" service ${KEY_ITEM}`],
  };
  if (platform() === "windows") {
    return {
      how: `Set it as ${KEY_VARIABLE} from a terminal, with your key in place of KEY, then restart Herdr:`,
      command: `setx ${KEY_VARIABLE} KEY`,
    };
  }
  const [store, command] = stores[platform()];
  return { how: `Export it as ${KEY_VARIABLE}, or store it in ${store} from a terminal (it prompts for the key):`,
    command };
}
