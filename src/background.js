/**
 * Registers content scripts for user-added sites.
 * Reddit stays in manifest.json (always on).
 *
 * Important: the popup often closes when Chrome shows the permission
 * dialog, so we finalize site adds here via permissions.onAdded.
 */
const SCRIPT_ID = "plainly-extra-sites";
const SITES_KEY = "extraSites";
const PENDING_KEY = "pendingSite";

chrome.runtime.onInstalled.addListener(() => {
  syncExtraScripts().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  syncExtraScripts().catch(console.error);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[SITES_KEY]) {
    syncExtraScripts().catch(console.error);
  }
});

/** Permission dialog closed the popup — finish adding the site here. */
chrome.permissions.onAdded.addListener((perms) => {
  handleOriginsGranted(perms.origins || []).catch(console.error);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "sync-scripts") {
    syncExtraScripts()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "inject-origin" && msg.origin) {
    injectIntoOpenTabs(msg.origin)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "finalize-pending") {
    finalizePending()
      .then((sites) => sendResponse({ ok: true, sites }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

/**
 * @param {string} origin e.g. https://example.com
 * @returns {string} match pattern
 */
function originToMatch(origin) {
  return origin.replace(/\/$/, "") + "/*";
}

/**
 * @param {string} pattern e.g. https://x.com/* or *://x.com/*
 * @returns {string|null} origin
 */
function patternToOrigin(pattern) {
  if (!pattern || typeof pattern !== "string") return null;
  try {
    if (pattern.startsWith("*://")) {
      const hostPath = pattern.slice(4); // x.com/* or *.x.com/*
      const host = hostPath.replace(/\/\*$/, "").replace(/\/$/, "");
      if (!host || host.includes("*")) return null;
      return "https://" + host;
    }
    const cleaned = pattern.replace(/\/\*$/, "");
    return new URL(cleaned).origin;
  } catch {
    return null;
  }
}

function isRedditOrigin(origin) {
  try {
    const host = new URL(origin).hostname.replace(/^www\./, "");
    return host === "reddit.com" || host.endsWith(".reddit.com");
  } catch {
    return false;
  }
}

async function getExtraSites() {
  const data = await chrome.storage.sync.get({ [SITES_KEY]: [] });
  const list = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : [];
  return list.filter((o) => typeof o === "string" && o.startsWith("http"));
}

async function saveExtraSites(sites) {
  const unique = [...new Set(sites.filter(Boolean))];
  await chrome.storage.sync.set({ [SITES_KEY]: unique });
  return unique;
}

async function handleOriginsGranted(patterns) {
  if (!patterns.length) return;

  const fromPerms = [];
  for (const pattern of patterns) {
    const origin = patternToOrigin(pattern);
    if (origin && !isRedditOrigin(origin)) fromPerms.push(origin);
  }

  // Prefer explicit pending site from the popup (set before the dialog).
  const local = await chrome.storage.local.get({ [PENDING_KEY]: null });
  const pending = local[PENDING_KEY];
  if (pending && pending.origin && !isRedditOrigin(pending.origin)) {
    fromPerms.push(pending.origin);
  }

  if (!fromPerms.length) return;

  const current = await getExtraSites();
  const next = [...new Set([...current, ...fromPerms])];
  await saveExtraSites(next);
  await chrome.storage.local.remove(PENDING_KEY);
  await syncExtraScripts();

  for (const origin of fromPerms) {
    await injectIntoOpenTabs(origin);
  }
}

/** Called when popup opens — recover if permission was granted after popup died. */
async function finalizePending() {
  const local = await chrome.storage.local.get({ [PENDING_KEY]: null });
  const pending = local[PENDING_KEY];
  let sites = await getExtraSites();

  if (pending && pending.pattern) {
    let granted = false;
    try {
      granted = await chrome.permissions.contains({
        origins: [pending.pattern],
      });
    } catch {
      granted = false;
    }

    if (granted && pending.origin && !isRedditOrigin(pending.origin)) {
      if (!sites.includes(pending.origin)) {
        sites = await saveExtraSites([...sites, pending.origin]);
      }
      await chrome.storage.local.remove(PENDING_KEY);
      await syncExtraScripts();
      await injectIntoOpenTabs(pending.origin);
    } else if (!granted) {
      // Still waiting, or user denied — drop stale pending after 10 minutes
      if (pending.at && Date.now() - pending.at > 10 * 60 * 1000) {
        await chrome.storage.local.remove(PENDING_KEY);
      }
    }
  }

  return sites;
}

async function syncExtraScripts() {
  const sites = await getExtraSites();

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch {
    /* not registered yet */
  }

  if (!sites.length) return;

  const matches = sites.map(originToMatch);
  await chrome.scripting.registerContentScripts([
    {
      id: SCRIPT_ID,
      matches,
      js: ["src/decoder.js", "src/content.js"],
      css: ["src/content.css"],
      runAt: "document_idle",
      persistAcrossSessions: true,
    },
  ]);
}

/** Best-effort inject into already-open tabs (refresh still helps). */
async function injectIntoOpenTabs(origin) {
  const pattern = originToMatch(origin);
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: [pattern, origin + "/*", origin] });
  } catch {
    return;
  }
  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["src/content.css"],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/decoder.js", "src/content.js"],
      });
    } catch {
      /* restricted page */
    }
  }
}
