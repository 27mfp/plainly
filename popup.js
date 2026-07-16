(function () {
  "use strict";

  const GITHUB_URL = "https://github.com/27mfp/plainly";

  const SITES_KEY = "extraSites";
  const PENDING_KEY = "pendingSite";
  const LAST_ADDED_KEY = "lastSiteAdded";

  const enabledEl = document.getElementById("enabled");
  const inputEl = document.getElementById("input");
  const outputEl = document.getElementById("output");
  const siteForm = document.getElementById("site-form");
  const siteInput = document.getElementById("site-input");
  const siteList = document.getElementById("site-list");
  const siteError = document.getElementById("site-error");
  const toastEl = document.getElementById("toast");
  const githubEl = document.getElementById("github");
  const addThisBtn = document.getElementById("add-this-site");
  const thisSiteHostEl = document.getElementById("this-site-host");
  const D = globalThis.Base64Decoder;

  /** @type {{ origin: string, pattern: string, host: string }|null} */
  let activeTabSite = null;

  if (githubEl) githubEl.href = GITHUB_URL;

  init();

  async function init() {
    const data = await storageGet({ enabled: true, [SITES_KEY]: [] });
    enabledEl.checked = data.enabled !== false;

    let sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : [];
    try {
      const res = await chrome.runtime.sendMessage({ type: "finalize-pending" });
      if (res && res.ok && Array.isArray(res.sites)) sites = res.sites;
    } catch {
      /* service worker waking */
    }

    const fresh = await storageGet({ [SITES_KEY]: [] });
    if (Array.isArray(fresh[SITES_KEY])) sites = fresh[SITES_KEY];

    renderSites(sites);
    await showPendingSuccessToast();
    await refreshActiveTabButton(sites);
  }

  enabledEl.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: enabledEl.checked });
  });

  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearSiteError();
    hideToast();

    const parsed = parseSiteInput(siteInput.value);
    if (!parsed) {
      showSiteError("Enter a valid site, e.g. x.com");
      return;
    }

    const result = await tryAddSite(parsed);
    if (result.ok) {
      siteInput.value = "";
    }
  });

  addThisBtn.addEventListener("click", async () => {
    clearSiteError();
    hideToast();

    // Re-read tab on click (user gesture + activeTab).
    const site = await readActiveTabSite();
    activeTabSite = site;
    updateThisSiteButton(await storageGet({ [SITES_KEY]: [] }).then((d) =>
      Array.isArray(d[SITES_KEY]) ? d[SITES_KEY] : []
    ));

    if (!site) {
      showSiteError("Open a normal web page (http/https), then try again.");
      return;
    }

    await tryAddSite(site);
  });

  siteList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn || btn.disabled) return;
    const origin = btn.getAttribute("data-remove");
    if (!origin) return;

    const host = hostOf(origin);
    btn.disabled = true;

    const data = await storageGet({ [SITES_KEY]: [] });
    const sites = (Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : []).filter(
      (o) => o !== origin
    );
    try {
      await storageSet({ [SITES_KEY]: sites });
    } catch {
      btn.disabled = false;
      showSiteError("Couldn't remove " + host + ".");
      return;
    }

    renderSites(sites);
    updateThisSiteButton(sites);
    showSuccess(host + " removed.");

    try {
      await chrome.permissions.remove({ origins: [origin + "/*"] });
    } catch {
      /* ignore — list is already updated */
    }
    try {
      await chrome.runtime.sendMessage({ type: "sync-scripts" });
    } catch {
      /* ignore */
    }
  });

  inputEl.addEventListener("input", updateOutput);

  /**
   * Shared add path for typed URLs and “Add this site”.
   * @param {{ origin: string, pattern: string, host?: string }} parsed
   * @returns {Promise<{ ok: boolean }>}
   */
  async function tryAddSite(parsed) {
    if (isRedditOrigin(parsed.origin)) {
      showSiteError("Reddit is already included.");
      return { ok: false };
    }

    const existing = await storageGet({ [SITES_KEY]: [] });
    const current = Array.isArray(existing[SITES_KEY]) ? existing[SITES_KEY] : [];
    if (current.includes(parsed.origin)) {
      renderSites(current);
      showSuccess(hostOf(parsed.origin) + " is already added.");
      updateThisSiteButton(current);
      return { ok: true };
    }

    let already = false;
    try {
      already = await chrome.permissions.contains({
        origins: [parsed.pattern],
      });
    } catch {
      already = false;
    }

    if (already) {
      const sites = await addOriginToList(parsed.origin);
      renderSites(sites);
      await notifyBackground(parsed.origin);
      await markAndShowSuccess(parsed.origin);
      updateThisSiteButton(sites);
      return { ok: true };
    }

    /*
     * Save pending BEFORE the permission dialog.
     * Chrome closes the popup when the dialog opens; background finishes the add.
     */
    await chrome.storage.local.set({
      [PENDING_KEY]: {
        origin: parsed.origin,
        pattern: parsed.pattern,
        at: Date.now(),
      },
    });

    let granted = false;
    try {
      granted = await chrome.permissions.request({
        origins: [parsed.pattern],
      });
    } catch {
      showSiteError("Could not request access for that site.");
      await chrome.storage.local.remove(PENDING_KEY);
      return { ok: false };
    }

    if (granted) {
      const sites = await addOriginToList(parsed.origin);
      await chrome.storage.local.remove(PENDING_KEY);
      renderSites(sites);
      await notifyBackground(parsed.origin);
      await markAndShowSuccess(parsed.origin);
      updateThisSiteButton(sites);
      return { ok: true };
    }

    await chrome.storage.local.remove(PENDING_KEY);
    showSiteError("Permission was not granted.");
    return { ok: false };
  }

  async function refreshActiveTabButton(sites) {
    activeTabSite = await readActiveTabSite();
    updateThisSiteButton(sites || []);
  }

  /**
   * Read the active tab and normalize to site origin.
   * Uses activeTab (granted when the user opens the popup).
   * @returns {Promise<{ origin: string, pattern: string, host: string }|null>}
   */
  async function readActiveTabSite() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) return null;
      return parseTabUrl(tab.url);
    } catch {
      return null;
    }
  }

  /**
   * Normalize any tab URL to https? origin (path/query/hash stripped).
   * @param {string} rawUrl
   * @returns {{ origin: string, pattern: string, host: string }|null}
   */
  function parseTabUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return null;
    let url = rawUrl.trim();

    // view-source:https://example.com/foo
    if (url.toLowerCase().startsWith("view-source:")) {
      url = url.slice("view-source:".length);
    }

    let u;
    try {
      u = new URL(url);
    } catch {
      return null;
    }

    // Only real web pages
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }

    // origin already drops path, query, hash; keeps host + port
    const origin = u.origin;
    const host = u.host; // includes port if non-default
    if (!host) return null;

    return {
      origin,
      pattern: origin + "/*",
      host,
    };
  }

  function updateThisSiteButton(sites) {
    if (!addThisBtn || !thisSiteHostEl) return;

    if (!activeTabSite) {
      addThisBtn.disabled = true;
      thisSiteHostEl.textContent = "not a web page";
      addThisBtn.title = "Open an http(s) page, then use this button";
      addThisBtn.classList.remove("this-site-btn--done");
      return;
    }

    const host = activeTabSite.host;
    thisSiteHostEl.textContent = host;

    if (isRedditOrigin(activeTabSite.origin)) {
      addThisBtn.disabled = true;
      addThisBtn.title = "Reddit is already included";
      addThisBtn.classList.add("this-site-btn--done");
      return;
    }

    if (sites.includes(activeTabSite.origin)) {
      addThisBtn.disabled = true;
      addThisBtn.title = host + " is already in your list";
      addThisBtn.classList.add("this-site-btn--done");
      return;
    }

    addThisBtn.disabled = false;
    addThisBtn.title = "Add " + host + " (uses the site only, not the full page path)";
    addThisBtn.classList.remove("this-site-btn--done");
  }

  async function addOriginToList(origin) {
    const data = await storageGet({ [SITES_KEY]: [] });
    const sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY].slice() : [];
    if (!sites.includes(origin)) {
      sites.push(origin);
      await storageSet({ [SITES_KEY]: sites });
    }
    return sites;
  }

  async function notifyBackground(origin) {
    try {
      await chrome.runtime.sendMessage({ type: "sync-scripts" });
      await chrome.runtime.sendMessage({ type: "inject-origin", origin });
    } catch {
      /* service worker may wake slowly */
    }
  }

  async function markAndShowSuccess(origin) {
    const host = hostOf(origin);
    await chrome.storage.local.set({
      [LAST_ADDED_KEY]: { origin, host, at: Date.now() },
    });
    showSuccess(host + " added. Refresh that tab to see tags.");
  }

  async function showPendingSuccessToast() {
    try {
      const local = await chrome.storage.local.get({ [LAST_ADDED_KEY]: null });
      const last = local[LAST_ADDED_KEY];
      if (!last || !last.host || !last.at) return;
      if (Date.now() - last.at > 60 * 1000) {
        await chrome.storage.local.remove(LAST_ADDED_KEY);
        return;
      }
      showSuccess(last.host + " added. Refresh that tab to see tags.");
      await chrome.storage.local.remove(LAST_ADDED_KEY);
    } catch {
      /* ignore */
    }
  }

  function hostOf(origin) {
    try {
      return new URL(origin).host;
    } catch {
      return origin;
    }
  }

  function showSuccess(msg) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.className = "toast toast--ok";
    toastEl.textContent = msg;
  }

  function hideToast() {
    if (!toastEl) return;
    toastEl.hidden = true;
    toastEl.textContent = "";
  }

  function updateOutput() {
    const raw = inputEl.value.trim();
    if (!raw) {
      outputEl.hidden = true;
      outputEl.textContent = "";
      outputEl.classList.remove("error");
      return;
    }
    const decoded = D.decode(raw);
    outputEl.hidden = false;
    if (decoded) {
      outputEl.classList.remove("error");
      outputEl.textContent = decoded;
    } else {
      outputEl.classList.add("error");
      outputEl.textContent = "Couldn't turn this into plain text.";
    }
  }

  function renderSites(sites) {
    siteList.innerHTML = "";

    const reddit = document.createElement("li");
    reddit.className = "site-item site-item--built-in";
    reddit.innerHTML =
      '<span class="site-host">reddit.com</span><span class="site-tag">built-in</span>';
    siteList.appendChild(reddit);

    for (const origin of sites) {
      const host = hostOf(origin);

      const li = document.createElement("li");
      li.className = "site-item";

      const hostEl = document.createElement("span");
      hostEl.className = "site-host";
      hostEl.textContent = host;
      hostEl.title = origin;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-btn";
      btn.setAttribute("data-remove", origin);
      btn.title = "Remove " + host;
      btn.setAttribute("aria-label", "Remove " + host);
      btn.innerHTML =
        '<svg class="remove-icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">' +
        '<path d="M4 4l8 8M12 4l-8 8"/>' +
        "</svg>";

      li.appendChild(hostEl);
      li.appendChild(btn);
      siteList.appendChild(li);
    }
  }

  /**
   * Typed input: hostname or full URL → origin only.
   * @param {string} raw
   * @returns {{ origin: string, pattern: string, host: string }|null}
   */
  function parseSiteInput(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    if (!s) return null;

    // If user pasted a full page URL, strip to origin via URL parser.
    if (/^https?:\/\//i.test(s) || s.toLowerCase().startsWith("view-source:")) {
      return parseTabUrl(s);
    }

    // Bare host: x.com, www.x.com, localhost:3000
    // Strip path if they typed example.com/foo
    s = s.replace(/\/.*$/, "");
    s = s.replace(/^\/*/, "");
    if (!s) return null;

    return parseTabUrl("https://" + s);
  }

  function isRedditOrigin(origin) {
    try {
      const host = new URL(origin).hostname.replace(/^www\./, "");
      return host === "reddit.com" || host.endsWith(".reddit.com");
    } catch {
      return false;
    }
  }

  function showSiteError(msg) {
    siteError.hidden = false;
    siteError.textContent = msg;
  }

  function clearSiteError() {
    siteError.hidden = true;
    siteError.textContent = "";
  }

  function storageGet(defaults) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaults, (data) => {
        if (chrome.runtime.lastError) {
          resolve(defaults);
          return;
        }
        resolve(data);
      });
    });
  }

  function storageSet(obj) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(obj, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }
})();
