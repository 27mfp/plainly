/**
 * Registers content scripts for user-added sites.
 * Reddit stays in manifest.json (always on).
 */
const SCRIPT_ID = "plainly-extra-sites";
const SITES_KEY = "extraSites";

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
});

/**
 * @param {string} origin e.g. https://example.com
 * @returns {string} match pattern
 */
function originToMatch(origin) {
  return origin.replace(/\/$/, "") + "/*";
}

async function getExtraSites() {
  const data = await chrome.storage.sync.get({ [SITES_KEY]: [] });
  const list = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : [];
  return list.filter((o) => typeof o === "string" && o.startsWith("http"));
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

/** Best-effort inject into already-open tabs (user may still need a refresh). */
async function injectIntoOpenTabs(origin) {
  const pattern = originToMatch(origin);
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ url: [pattern, origin] });
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
      /* restricted page or no permission yet */
    }
  }
}
