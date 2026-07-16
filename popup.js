(function () {
  "use strict";

  /** Set this to your public repo when you publish. */
  const GITHUB_URL = "https://github.com/";

  const SITES_KEY = "extraSites";
  const PENDING_KEY = "pendingSite";

  const enabledEl = document.getElementById("enabled");
  const inputEl = document.getElementById("input");
  const outputEl = document.getElementById("output");
  const siteForm = document.getElementById("site-form");
  const siteInput = document.getElementById("site-input");
  const siteList = document.getElementById("site-list");
  const siteError = document.getElementById("site-error");
  const githubEl = document.getElementById("github");
  const D = globalThis.Base64Decoder;

  if (githubEl) githubEl.href = GITHUB_URL;

  init();

  async function init() {
    const data = await storageGet({ enabled: true, [SITES_KEY]: [] });
    enabledEl.checked = data.enabled !== false;

    // Permission dialog usually closes this popup mid-request.
    // Finish any pending add, then paint the list.
    let sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : [];
    try {
      const res = await chrome.runtime.sendMessage({ type: "finalize-pending" });
      if (res && res.ok && Array.isArray(res.sites)) sites = res.sites;
    } catch {
      /* service worker waking */
    }

    // Also re-read storage after finalize
    const fresh = await storageGet({ [SITES_KEY]: [] });
    if (Array.isArray(fresh[SITES_KEY])) sites = fresh[SITES_KEY];

    renderSites(sites);
  }

  enabledEl.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: enabledEl.checked });
  });

  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearSiteError();

    const parsed = parseSiteInput(siteInput.value);
    if (!parsed) {
      showSiteError("Enter a valid site, e.g. x.com");
      return;
    }
    if (isRedditOrigin(parsed.origin)) {
      showSiteError("Reddit is already included.");
      return;
    }

    // Already in the list?
    const existing = await storageGet({ [SITES_KEY]: [] });
    const current = Array.isArray(existing[SITES_KEY]) ? existing[SITES_KEY] : [];
    if (current.includes(parsed.origin)) {
      siteInput.value = "";
      renderSites(current);
      return;
    }

    // Already have permission? Skip dialog and save immediately.
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
      siteInput.value = "";
      renderSites(sites);
      await notifyBackground(parsed.origin);
      return;
    }

    /*
     * Save pending BEFORE the permission dialog.
     * Chrome closes the popup when the dialog opens, so code after
     * permissions.request often never runs. background.js finishes the add.
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
      return;
    }

    // Only runs if the popup stayed open (some Chrome builds).
    if (granted) {
      const sites = await addOriginToList(parsed.origin);
      await chrome.storage.local.remove(PENDING_KEY);
      siteInput.value = "";
      renderSites(sites);
      await notifyBackground(parsed.origin);
    } else {
      await chrome.storage.local.remove(PENDING_KEY);
      showSiteError("Permission was not granted.");
    }
  });

  siteList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const origin = btn.getAttribute("data-remove");
    const data = await storageGet({ [SITES_KEY]: [] });
    const sites = (Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : []).filter(
      (o) => o !== origin
    );
    await storageSet({ [SITES_KEY]: sites });
    renderSites(sites);

    try {
      await chrome.permissions.remove({ origins: [origin + "/*"] });
    } catch {
      /* ignore */
    }
    try {
      await chrome.runtime.sendMessage({ type: "sync-scripts" });
    } catch {
      /* ignore */
    }
  });

  inputEl.addEventListener("input", updateOutput);

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
      let host = origin;
      try {
        host = new URL(origin).host;
      } catch {
        /* keep raw */
      }
      const li = document.createElement("li");
      li.className = "site-item";
      li.innerHTML =
        '<span class="site-host"></span>' +
        '<button type="button" class="remove-btn" data-remove="" title="Remove" aria-label="Remove site">×</button>';
      li.querySelector(".site-host").textContent = host;
      li.querySelector(".remove-btn").setAttribute("data-remove", origin);
      siteList.appendChild(li);
    }
  }

  /**
   * @param {string} raw
   * @returns {{ origin: string, pattern: string }|null}
   */
  function parseSiteInput(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    try {
      const u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      if (!u.hostname || !u.hostname.includes(".")) return null;
      const origin = u.origin;
      return { origin, pattern: origin + "/*" };
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
