// The issue tracker this panel talks to: its name, addresses and API key, and what differs per operating system
import { URL } from "url";
import { exec, notify, window } from "herdr";
import { NEUTRAL_GREY, TOAST_MS } from "./config.js";
import { Platform } from "./enums.js";

export const API = "https://api.linear.app/graphql";
const APP_SCHEME = "linear";
const DEFAULT_PLATFORM = Platform.MAC;
// The tracker's own app draws some of its default colors in shades that read on a dark background
/** @type {Record<string, Color>} */
const DRAWN_AS = { "#0f783c": "#27a644" };
export const HOST = "linear.app";
const KEY_ITEM = "herdr-linear";
export const KEY_PAGE_PATH = "settings/account/security";
const KEY_VARIABLE = "LINEAR_API_KEY";
export const NAME = "Linear";
const PLATFORMS = Object.values(Platform);
const SITE = `https://${HOST}/`;
export const KEY_PAGE = `${SITE}${KEY_PAGE_PATH}`;
// The id of the panel's block in the layout, and its name in the tab bar's list of side panels
export const SLOT = "linear";
// A system this mod has no commands for is treated as the one closest to it
const UNKNOWN_PLATFORM_AS = Platform.LINUX;

/** @param {Color | null | undefined} color */
export const drawnColor = (color) => (color ? DRAWN_AS[color.toLowerCase()] ?? color : NEUTRAL_GREY);

const platform = () => {
  const named = window()?.platform ?? DEFAULT_PLATFORM;
  return PLATFORMS.includes(named) ? named : UNKNOWN_PLATFORM_AS;
};
export const isMac = () => platform() === Platform.MAC;

// A program that is not installed counts as a failure
/**
 * @param {string} command
 * @param {string[]} args
 */
const ran = (command, args) => exec(command, args)
  .then((result) => result.code === 0, () => false);

// Answers whether a program took the address, which only a web address or the tracker's own is: anything else (a file,
// a share, a program) is never handed to the system. Windows always answers yes
/** @param {string} address */
function browse(address) {
  if (!/^(https?|linear):\/\//i.test(address)) return Promise.resolve(false);
  if (platform() === Platform.WINDOWS) return ran("rundll32", ["url.dll,FileProtocolHandler", address]);
  return ran(platform() === Platform.LINUX ? "xdg-open" : "open", [address]);
}

/** @param {string} address */
async function browseOrSay(address) {
  const opened = await browse(address);
  if (!opened) notify({ title: `Could not open ${address}`, timeout: TOAST_MS });
  return opened;
}

// The same address under the tracker's own scheme, which its desktop app takes
/** @param {string} address */
function inApp(address) {
  try {
    const { protocol, host, pathname, search, hash } = new URL(address);
    return protocol === "https:" ? `${APP_SCHEME}://${host}${pathname}${search}${hash}` : address;
  } catch {
    return address;
  }
}

// In its desktop app, else in the browser. macOS and Linux fail to open an address nothing is registered for, which is
// the cue for the browser. Windows asks the person what to do instead, so there the registry is asked first whether
// the app is installed
/** @param {string} url */
export async function openPage(url) {
  const app = inApp(url);
  if (platform() === Platform.WINDOWS) {
    return browseOrSay((await ran("reg", ["query", `HKCR\\${APP_SCHEME}`, "/ve"])) ? app : url);
  }
  return (await browse(app)) || browseOrSay(url);
}

// A page of the tracker opens in its app first, any other address in the browser. A page the mod knows to be the
// tracker's (an issue, a cycle) goes straight to `openPage`
/** @param {string} url */
export const openLink = (url) => (url.startsWith(SITE) ? openPage(url) : browseOrSay(url));

export async function openApp() {
  if (platform() !== Platform.MAC) return openPage(SITE);
  if (!(await ran("open", ["-a", NAME]))) await browseOrSay(SITE);
}

/** @param {MyTeam} team */
export const composeIssue = (team) => openPage(`${SITE}team/${encodeURIComponent(team.key)}/new?assignee=me`);

/**
 * @param {Issue} issue
 * @param {Cycle} cycle
 */
export const openCycle = (issue, cycle) =>
  openPage(`${SITE}team/${encodeURIComponent(issue.team.key)}/cycle/${cycle.number}`);

// Windows has no command that reads its own secret store: the variable only
/** @type {Record<string, string>} */
const STORED_KEY = {
  [Platform.MAC]: `security find-generic-password -s ${KEY_ITEM} -w`,
  [Platform.LINUX]: `secret-tool lookup service ${KEY_ITEM}`,
};

// "" when there is no key
export async function apiKey() {
  if (platform() === Platform.WINDOWS) {
    // cmd answers the name itself, percent signs included, for a variable that is not set
    const answer = (await exec("cmd", ["/c", "echo", `%${KEY_VARIABLE}%`])).stdout.trim();
    return answer.startsWith("%") ? "" : answer;
  }
  const read = `printf %s "\${${KEY_VARIABLE}:-$(${STORED_KEY[platform()]} 2>/dev/null)}"`;
  return (await exec("sh", ["-c", read])).stdout.trim();
}

export function keySetup() {
  /** @type {Record<string, string[]>} */
  const stores = {
    [Platform.MAC]: ["the macOS Keychain", `security add-generic-password -U -a "$USER" -s ${KEY_ITEM} -w`],
    [Platform.LINUX]: ["your keyring", `secret-tool store --label="${NAME} API key" service ${KEY_ITEM}`],
  };
  if (platform() === Platform.WINDOWS) {
    return {
      how: `Set it as ${KEY_VARIABLE} from a terminal, with your key in place of KEY, then restart Herdr:`,
      command: `setx ${KEY_VARIABLE} KEY`,
    };
  }
  const [store, command] = stores[platform()];
  return { how: `Export it as ${KEY_VARIABLE}, or store it in ${store} from a terminal (it prompts for the key):`,
    command };
}
