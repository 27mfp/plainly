(function () {
  "use strict";

  /** Set this to your public repo when you publish. */
  const GITHUB_URL = "https://github.com/";

  const SITES_KEY = "extraSites";
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

  chrome.storage.sync.get({ enabled: true, [SITES_KEY]: [] }, (data) => {
    enabledEl.checked = data.enabled !== false;
    renderSites(Array.isArray(data[SITES_KEY]) ? data[SITES_KEY] : []);
  });

  enabledEl.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: enabledEl.checked });
  });

  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearSiteError();
    const parsed = parseSiteInput(siteInput.value);
    if (!parsed) {
      showSiteError("Enter a valid site, e.g. example.com");
      return;
    }
    if (isRedditOrigin(parsed.origin)) {
      showSiteError("Reddit is already included.");
      return;
    }

    try {
      const granted = await chrome.permissions.request({
        origins: [parsed.pattern],
      });
      if (!granted) {
        showSiteError("Permission was not granted.");
        return;
      }
    } catch (err) {
      showSiteError("Could not request access for that site.");
      return;
    }

    const data = await storageGet({ [SITES_KEY]: [] });
    const sites = Array.isArray(data[SITES_KEY]) ? data[SITES_KEY].slice() : [];
    if (!sites.includes(parsed.origin)) {
      sites.push(parsed.origin);
      await storageSet({ [SITES_KEY]: sites });
    }

    siteInput.value = "";
    renderSites(sites);

    try {
      await chrome.runtime.sendMessage({ type: "sync-scripts" });
      await chrome.runtime.sendMessage({
        type: "inject-origin",
        origin: parsed.origin,
      });
    } catch {
      /* service worker may wake slowly */
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
      if (!u.hostname) return null;
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
    return new Promise((resolve) => chrome.storage.sync.get(defaults, resolve));
  }

  function storageSet(obj) {
    return new Promise((resolve) => chrome.storage.sync.set(obj, resolve));
  }
})();
