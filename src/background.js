/**
 * Background script (Chrome service worker / Firefox event page).
 *
 * Reddit: static content_scripts in manifest.json.
 * Extra sites: inject on demand via scripting (no registerContentScripts —
 * that API was throwing "Duplicate script ID 'plainly-extra-sites'" under Chrome).
 *
 * Cross-browser: use browser.* (promises) when available, else chrome.*.
 */
const api = globalThis.browser ?? globalThis.chrome;

const SITES_KEY = "extraSites";
const PENDING_KEY = "pendingSite";
const LAST_ADDED_KEY = "lastSiteAdded";
const LEGACY_SCRIPT_ID = "plainly-extra-sites";

/** In-memory cache — refreshed from storage; avoids storage hits on every tab update. */
let cachedSites = null;
let cachedEnabled = true;

// ── Boot ─────────────────────────────────────────────────────────────

api.runtime.onInstalled.addListener(() => {
  purgeLegacyRegisteredScripts()
    .then(() => refreshCache())
    .catch((e) => console.error("[Plainly] onInstalled", e));
});

api.runtime.onStartup.addListener(() => {
  refreshCache().catch((e) => console.error("[Plainly] onStartup", e));
});

refreshCache().catch(() => {});

api.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes[SITES_KEY]) {
    cachedSites = normalizeSites(changes[SITES_KEY].newValue);
  }
  if (changes.enabled) {
    cachedEnabled = changes.enabled.newValue !== false;
  }
});

api.permissions.onAdded.addListener((perms) => {
  handleOriginsGranted(perms.origins || []).catch((e) =>
    console.error("[Plainly] onAdded", e)
  );
});

// Inject into extra sites when a tab finishes loading (SPA first paint + full loads).
api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab || !tab.url) return;
  maybeInjectTab(tabId, tab.url).catch(() => {});
});

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "sync-scripts") {
    // Kept for popup compatibility — no-op registration; just refresh cache.
    refreshCache()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === "inject-origin" && typeof msg.origin === "string") {
    injectIntoOpenTabs(msg.origin)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === "finalize-pending") {
    finalizePending()
      .then((sites) => sendResponse({ ok: true, sites }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

// ── Legacy cleanup (removes stuck registerContentScripts IDs) ─────────

async function purgeLegacyRegisteredScripts() {
  try {
    const all = await api.scripting.getRegisteredContentScripts();
    if (!all || !all.length) return;
    const ids = all
      .map((s) => s.id)
      .filter((id) => id === LEGACY_SCRIPT_ID || String(id).startsWith("plainly-"));
    if (ids.length) {
      await api.scripting.unregisterContentScripts({ ids });
    }
  } catch {
    try {
      await api.scripting.unregisterContentScripts({
        ids: [LEGACY_SCRIPT_ID],
      });
    } catch {
      /* none left */
    }
  }
}

// ── Site list / cache ────────────────────────────────────────────────

function normalizeSites(list) {
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(
      list.filter(
        (o) => typeof o === "string" && /^https?:\/\//i.test(o) && !isRedditOrigin(o)
      )
    ),
  ];
}

async function refreshCache() {
  const data = await api.storage.sync.get({
    [SITES_KEY]: [],
    enabled: true,
  });
  cachedSites = normalizeSites(data[SITES_KEY]);
  cachedEnabled = data.enabled !== false;
  return cachedSites;
}

async function getExtraSites() {
  if (cachedSites) return cachedSites;
  return refreshCache();
}

async function saveExtraSites(sites) {
  const unique = normalizeSites(sites);
  cachedSites = unique;
  await api.storage.sync.set({ [SITES_KEY]: unique });
  return unique;
}

function originToMatch(origin) {
  return String(origin).replace(/\/$/, "") + "/*";
}

function patternToOrigin(pattern) {
  if (!pattern || typeof pattern !== "string") return null;
  try {
    if (pattern.startsWith("*://")) {
      const hostPath = pattern.slice(4);
      const host = hostPath.replace(/\/\*$/, "").replace(/\/$/, "");
      if (!host || host.includes("*")) return null;
      return "https://" + host;
    }
    return new URL(pattern.replace(/\/\*$/, "")).origin;
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

/** @returns {string|null} origin if url is on an extra site */
function matchExtraSite(url, sites) {
  if (!url || !sites || !sites.length) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const origin = u.origin;
  return sites.includes(origin) ? origin : null;
}

// ── Inject (no registerContentScripts) ───────────────────────────────

async function maybeInjectTab(tabId, url) {
  if (cachedEnabled === false) return;
  const sites = await getExtraSites();
  if (!matchExtraSite(url, sites)) return;
  await injectIntoTab(tabId);
}

async function injectIntoTab(tabId) {
  if (typeof tabId !== "number") return;
  try {
    await api.scripting.insertCSS({
      target: { tabId },
      files: ["src/content.css"],
    });
  } catch {
    /* no permission or restricted page */
    return;
  }
  try {
    await api.scripting.executeScript({
      target: { tabId },
      files: ["src/decoder.js", "src/content.js"],
    });
  } catch {
    /* already injected or restricted */
  }
}

async function injectIntoOpenTabs(origin) {
  if (!origin || isRedditOrigin(origin)) return;
  const pattern = originToMatch(origin);
  let tabs = [];
  try {
    tabs = await api.tabs.query({ url: [pattern, origin + "/*", origin] });
  } catch {
    return;
  }
  // Cap work if many tabs match
  const limit = tabs.slice(0, 30);
  for (const tab of limit) {
    if (tab.id != null) await injectIntoTab(tab.id);
  }
}

// ── Add-site finalization (permission dialog) ────────────────────────

/** Pending may be one site or a pack (array of { origin, pattern }). */
function pendingEntries(pending) {
  if (!pending || typeof pending !== "object") return [];
  if (Array.isArray(pending.sites) && pending.sites.length) {
    return pending.sites
      .filter((s) => s && typeof s.origin === "string")
      .map((s) => ({
        origin: s.origin,
        pattern: s.pattern || s.origin.replace(/\/$/, "") + "/*",
      }));
  }
  if (pending.origin) {
    return [
      {
        origin: pending.origin,
        pattern: pending.pattern || pending.origin.replace(/\/$/, "") + "/*",
      },
    ];
  }
  return [];
}

async function handleOriginsGranted(patterns) {
  if (!patterns.length) return;

  const fromPerms = [];
  for (const pattern of patterns) {
    const origin = patternToOrigin(pattern);
    if (origin && !isRedditOrigin(origin)) fromPerms.push(origin);
  }

  const local = await api.storage.local.get({ [PENDING_KEY]: null });
  const pending = local[PENDING_KEY];
  for (const entry of pendingEntries(pending)) {
    if (entry.origin && !isRedditOrigin(entry.origin)) {
      fromPerms.push(entry.origin);
    }
  }
  if (!fromPerms.length) return;

  const current = await getExtraSites();
  const next = [...new Set([...current, ...fromPerms])];
  const newly = next.filter((o) => !current.includes(o));
  await saveExtraSites(next);
  await api.storage.local.remove(PENDING_KEY);
  if (newly.length) await markSitesAdded(newly);

  for (const origin of fromPerms) {
    await injectIntoOpenTabs(origin);
  }
}

async function finalizePending() {
  const local = await api.storage.local.get({ [PENDING_KEY]: null });
  const pending = local[PENDING_KEY];
  let sites = await getExtraSites();

  const entries = pendingEntries(pending);
  if (entries.length) {
    const grantedOrigins = [];
    for (const entry of entries) {
      let granted = false;
      try {
        granted = await api.permissions.contains({
          origins: [entry.pattern],
        });
      } catch {
        granted = false;
      }
      if (granted && entry.origin && !isRedditOrigin(entry.origin)) {
        grantedOrigins.push(entry.origin);
      }
    }

    if (grantedOrigins.length) {
      const newly = grantedOrigins.filter((o) => !sites.includes(o));
      if (newly.length) {
        sites = await saveExtraSites([...sites, ...newly]);
        await markSitesAdded(newly);
      }
      await api.storage.local.remove(PENDING_KEY);
      for (const origin of grantedOrigins) {
        await injectIntoOpenTabs(origin);
      }
    } else if (pending.at && Date.now() - pending.at > 10 * 60 * 1000) {
      await api.storage.local.remove(PENDING_KEY);
    }
  }

  return sites;
}

async function markSitesAdded(origins) {
  if (!origins || !origins.length) return;
  const list = origins.filter(Boolean);
  let host = list[0];
  try {
    host = new URL(list[0]).host;
  } catch {
    /* keep */
  }
  if (list.length > 1) {
    host = list.length + " sites";
  }
  await api.storage.local.set({
    [LAST_ADDED_KEY]: {
      origin: list[list.length - 1],
      host,
      count: list.length,
      at: Date.now(),
    },
  });
}
