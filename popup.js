(function () {
  "use strict";

  // Firefox: browser.* returns promises; Chrome: chrome.* does when no callback.
  const api = globalThis.browser ?? globalThis.chrome;

  const GITHUB_URL = "https://github.com/27mfp/plainly";

  const SITES_KEY = "extraSites";
  const PENDING_KEY = "pendingSite";
  const LAST_ADDED_KEY = "lastSiteAdded";

  /**
   * Same places the FMHY list ecosystem uses for coded links
   * (rentry, pastebin, private pastes, the wiki itself).
   */
  const PASTE_PACK = [
    "https://rentry.co",
    "https://rentry.org",
    "https://pastes.fmhy.net",
    "https://pastebin.com",
    "https://bin.disroot.org",
    "https://privatebin.net",
    "https://textbin.xyz",
    "https://bin.idrix.fr",
    "https://privatebin.rinuploads.org",
    "https://fmhy.net",
    "https://www.fmhy.net",
  ];

  /**
   * Short labels shown before the user clicks “Add these sites”.
   * Grouped so the list stays easy to scan.
   */
  const PASTE_PACK_PREVIEW = [
    { label: "rentry.co", origins: ["https://rentry.co"] },
    { label: "rentry.org", origins: ["https://rentry.org"] },
    { label: "pastebin.com", origins: ["https://pastebin.com"] },
    { label: "pastes.fmhy.net", origins: ["https://pastes.fmhy.net"] },
    { label: "fmhy.net", origins: ["https://fmhy.net", "https://www.fmhy.net"] },
    {
      label: "privatebin…",
      origins: [
        "https://bin.disroot.org",
        "https://privatebin.net",
        "https://textbin.xyz",
        "https://bin.idrix.fr",
        "https://privatebin.rinuploads.org",
      ],
    },
  ];

  const enabledEl = document.getElementById("enabled");
  const enabledLabelEl = document.getElementById("enabled-label");
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
  const addPasteBtn = document.getElementById("add-paste-sites");
  const packPreviewEl = document.getElementById("pack-preview");
  const D = globalThis.Base64Decoder;

  /** @type {{ origin: string, pattern: string, host: string }|null} */
  let activeTabSite = null;

  if (githubEl) githubEl.href = GITHUB_URL;

  init();

  async function init() {
    const data = await storageGet({ enabled: true, [SITES_KEY]: [] });
    enabledEl.checked = data.enabled !== false;
    syncEnabledLabel();

    let sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : [];
    try {
      const res = await api.runtime.sendMessage({ type: "finalize-pending" });
      if (res && res.ok && Array.isArray(res.sites)) sites = res.sites;
    } catch {
      /* background waking */
    }

    const fresh = await storageGet({ [SITES_KEY]: [] });
    if (Array.isArray(fresh[SITES_KEY])) sites = fresh[SITES_KEY];

    renderSites(sites);
    updatePastePackUI(sites);
    await showPendingSuccessToast();
    await refreshActiveTabButton(sites);
  }

  enabledEl.addEventListener("change", () => {
    api.storage.sync.set({ enabled: enabledEl.checked });
    syncEnabledLabel();
  });

  function syncEnabledLabel() {
    if (!enabledLabelEl) return;
    enabledLabelEl.textContent = enabledEl.checked
      ? "Plainly is on"
      : "Plainly is off";
  }

  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearSiteError();
    hideToast();

    const parsed = parseSiteInput(siteInput.value);
    if (!parsed) {
      showSiteError("Enter a site name, like example.com");
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
    const sites = await storageGet({ [SITES_KEY]: [] }).then((d) =>
      Array.isArray(d[SITES_KEY]) ? d[SITES_KEY] : []
    );
    updateThisSiteButton(sites);

    if (!site) {
      showErrorToast("Open a normal web page first, then try again.");
      return;
    }

    await tryAddSite(site);
  });

  if (addPasteBtn) {
    addPasteBtn.addEventListener("click", async () => {
      clearSiteError();
      hideToast();
      await tryAddPastePack();
    });
  }

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
    updatePastePackUI(sites);
    showSuccess(host + " removed.");

    try {
      await api.permissions.remove({ origins: [origin + "/*"] });
    } catch {
      /* ignore — list is already updated */
    }
  });

  inputEl.addEventListener("input", updateOutput);

  // Try text: collapsed by default; focus field when opened
  const tryPanel = document.getElementById("try-panel");
  if (tryPanel) {
    tryPanel.addEventListener("toggle", () => {
      if (tryPanel.open && inputEl) {
        // Defer so layout finishes after open
        requestAnimationFrame(() => inputEl.focus());
      }
    });
  }

  /**
   * Add the FMHY-style paste sites in one go (same idea as their helper script).
   */
  async function tryAddPastePack() {
    const existing = await storageGet({ [SITES_KEY]: [] });
    const current = Array.isArray(existing[SITES_KEY]) ? existing[SITES_KEY] : [];

    const pack = PASTE_PACK.map((origin) => ({
      origin,
      pattern: origin + "/*",
      host: hostOf(origin),
    })).filter((s) => !isRedditOrigin(s.origin));

    const missing = pack.filter((s) => !current.includes(s.origin));
    if (!missing.length) {
      showSuccess("Those paste sites are already added.");
      updatePastePackUI(current);
      return { ok: true };
    }

    // Which ones still need browser access?
    const needAccess = [];
    for (const site of missing) {
      let has = false;
      try {
        has = await api.permissions.contains({ origins: [site.pattern] });
      } catch {
        has = false;
      }
      if (!has) needAccess.push(site);
    }

    // Already allowed — just save to the list.
    if (!needAccess.length) {
      const sites = await addOriginsToList(missing.map((s) => s.origin));
      renderSites(sites);
      updateThisSiteButton(sites);
      updatePastePackUI(sites);
      for (const site of missing) {
        await notifyBackground(site.origin);
      }
      showSuccess(
        missing.length === 1
          ? missing[0].host + " added. Refresh open pages to see plain text."
          : missing.length +
              " sites added. Refresh open pages to see plain text."
      );
      return { ok: true };
    }

    /*
     * Save pending BEFORE the access dialog.
     * Chrome closes the popup when the dialog opens; background finishes the add.
     */
    await api.storage.local.set({
      [PENDING_KEY]: {
        sites: missing.map((s) => ({
          origin: s.origin,
          pattern: s.pattern,
        })),
        at: Date.now(),
      },
    });

    let granted = false;
    try {
      granted = await api.permissions.request({
        origins: needAccess.map((s) => s.pattern),
      });
    } catch {
      showErrorToast("Couldn't ask for access to those sites.");
      await api.storage.local.remove(PENDING_KEY);
      return { ok: false };
    }

    if (granted) {
      // Also pull in any missing that already had access (edge case).
      const sites = await addOriginsToList(missing.map((s) => s.origin));
      await api.storage.local.remove(PENDING_KEY);
      renderSites(sites);
      updateThisSiteButton(sites);
      updatePastePackUI(sites);
      for (const site of missing) {
        await notifyBackground(site.origin);
      }
      await markAndShowPackSuccess(missing.map((s) => s.origin));
      return { ok: true };
    }

    await api.storage.local.remove(PENDING_KEY);
    showErrorToast("You didn't allow access.");
    return { ok: false };
  }

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
      updatePastePackUI(current);
      return { ok: true };
    }

    let already = false;
    try {
      already = await api.permissions.contains({
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
      updatePastePackUI(sites);
      return { ok: true };
    }

    /*
     * Save pending BEFORE the access dialog.
     * Chrome closes the popup when the dialog opens; background finishes the add.
     * Firefox often keeps the popup open — either path works.
     */
    await api.storage.local.set({
      [PENDING_KEY]: {
        origin: parsed.origin,
        pattern: parsed.pattern,
        sites: [{ origin: parsed.origin, pattern: parsed.pattern }],
        at: Date.now(),
      },
    });

    let granted = false;
    try {
      granted = await api.permissions.request({
        origins: [parsed.pattern],
      });
    } catch {
      showErrorToast("Couldn't ask for access to that site.");
      await api.storage.local.remove(PENDING_KEY);
      return { ok: false };
    }

    if (granted) {
      const sites = await addOriginToList(parsed.origin);
      await api.storage.local.remove(PENDING_KEY);
      renderSites(sites);
      await notifyBackground(parsed.origin);
      await markAndShowSuccess(parsed.origin);
      updateThisSiteButton(sites);
      updatePastePackUI(sites);
      return { ok: true };
    }

    await api.storage.local.remove(PENDING_KEY);
    showErrorToast("You didn't allow access.");
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
      const tabs = await api.tabs.query({
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
      addThisBtn.textContent = "Add";
      addThisBtn.classList.remove("is-done");
      addThisBtn.setAttribute("aria-label", "Open a web page first");
      thisSiteHostEl.textContent = "Not a web page";
      thisSiteHostEl.classList.add("is-empty");
      return;
    }

    const host = activeTabSite.host;
    thisSiteHostEl.textContent = host;
    thisSiteHostEl.classList.remove("is-empty");

    if (isRedditOrigin(activeTabSite.origin)) {
      addThisBtn.disabled = true;
      addThisBtn.textContent = "On";
      addThisBtn.classList.add("is-done");
      addThisBtn.setAttribute("aria-label", "Reddit is already included");
      return;
    }

    if (sites.includes(activeTabSite.origin)) {
      addThisBtn.disabled = true;
      addThisBtn.textContent = "On";
      addThisBtn.classList.add("is-done");
      addThisBtn.setAttribute("aria-label", host + " is already in your list");
      return;
    }

    addThisBtn.disabled = false;
    addThisBtn.textContent = "Add";
    addThisBtn.classList.remove("is-done");
    addThisBtn.setAttribute(
      "aria-label",
      "Add " + host + " so Plainly runs on this site"
    );
  }

  function updatePastePackUI(sites) {
    const missing = PASTE_PACK.filter((origin) => !sites.includes(origin));
    const pendingLabels = PASTE_PACK_PREVIEW.filter((g) =>
      g.origins.some((o) => missing.includes(o))
    ).map((g) => g.label);

    if (packPreviewEl) {
      if (!missing.length) {
        packPreviewEl.textContent = "All of these are already in your list.";
      } else if (pendingLabels.length <= 4) {
        packPreviewEl.textContent = "Will add: " + pendingLabels.join(" · ");
      } else {
        // Keep the line short so it never forces a horizontal scrollbar
        packPreviewEl.textContent =
          "Will add: " +
          pendingLabels.slice(0, 3).join(" · ") +
          " · +" +
          (pendingLabels.length - 3) +
          " more";
      }
    }

    if (!addPasteBtn) return;
    if (!missing.length) {
      addPasteBtn.disabled = true;
      addPasteBtn.textContent = "All added";
    } else {
      addPasteBtn.disabled = false;
      addPasteBtn.textContent =
        missing.length === PASTE_PACK.length
          ? "Add these"
          : "Add " + missing.length + " more";
    }
  }

  async function addOriginToList(origin) {
    return addOriginsToList([origin]);
  }

  async function addOriginsToList(origins) {
    const data = await storageGet({ [SITES_KEY]: [] });
    const sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY].slice() : [];
    let changed = false;
    for (const origin of origins) {
      if (origin && !sites.includes(origin) && !isRedditOrigin(origin)) {
        sites.push(origin);
        changed = true;
      }
    }
    if (changed) {
      await storageSet({ [SITES_KEY]: sites });
    }
    return sites;
  }

  async function notifyBackground(origin) {
    try {
      // Inject into open tabs for this origin (no registerContentScripts).
      await api.runtime.sendMessage({ type: "inject-origin", origin });
    } catch {
      /* background may wake slowly */
    }
  }

  async function markAndShowSuccess(origin) {
    const host = hostOf(origin);
    await api.storage.local.set({
      [LAST_ADDED_KEY]: { origin, host, at: Date.now() },
    });
    showSuccess(host + " added. Refresh the page to see plain text.");
  }

  async function markAndShowPackSuccess(origins) {
    const n = origins.length;
    const host = n === 1 ? hostOf(origins[0]) : n + " sites";
    await api.storage.local.set({
      [LAST_ADDED_KEY]: {
        origin: origins[origins.length - 1],
        host,
        count: n,
        at: Date.now(),
      },
    });
    showSuccess(
      n === 1
        ? host + " added. Refresh open pages to see plain text."
        : n + " sites added. Refresh open pages to see plain text."
    );
  }

  async function showPendingSuccessToast() {
    try {
      const local = await api.storage.local.get({ [LAST_ADDED_KEY]: null });
      const last = local[LAST_ADDED_KEY];
      if (!last || !last.host || !last.at) return;
      if (Date.now() - last.at > 60 * 1000) {
        await api.storage.local.remove(LAST_ADDED_KEY);
        return;
      }
      const count = typeof last.count === "number" ? last.count : 1;
      showSuccess(
        count > 1
          ? count + " sites added. Refresh open pages to see plain text."
          : last.host + " added. Refresh the page to see plain text."
      );
      await api.storage.local.remove(LAST_ADDED_KEY);
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

  function showErrorToast(msg) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.className = "toast toast--err";
    toastEl.textContent = msg;
  }

  function hideToast() {
    if (!toastEl) return;
    toastEl.hidden = true;
    toastEl.className = "toast";
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
      '<span class="site-host">reddit.com</span><span class="site-tag">always on</span>';
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

  async function storageGet(defaults) {
    try {
      return await api.storage.sync.get(defaults);
    } catch {
      return defaults;
    }
  }

  async function storageSet(obj) {
    await api.storage.sync.set(obj);
  }
})();
