/**
 * Content script: scan the page for Base64, show decoded values inline.
 * MutationObserver handles SPA / infinite scroll (scoped batches).
 */
(function () {
  "use strict";

  // Guard against double inject (manifest + executeScript / re-inject).
  if (globalThis.__plainlyLoaded) return;
  globalThis.__plainlyLoaded = true;

  const api = globalThis.browser ?? globalThis.chrome;

  const D = globalThis.Base64Decoder;
  if (!D) {
    console.error("[Plainly] decoder.js not loaded");
    globalThis.__plainlyLoaded = false;
    return;
  }

  const ATTR = "data-b64d-processed";
  const WRAP_CLASS = "b64d-wrap";
  const BADGE_CLASS = "b64d-badge";
  const DECODED_CLASS = "b64d-decoded";
  const ENABLED_KEY = "enabled";
  const SCAN_DEBOUNCE_MS = 200;
  const MAX_TEXT_NODES_PER_SCAN = 250;
  const MAX_MUTATION_ROOTS = 40;

  let enabled = true;
  let observer = null;
  let scanTimer = null;
  let copyTimer = null;
  /** @type {Set<Element|Document>} */
  let pendingRoots = new Set();
  let storageListener = null;

  // ---- settings ----
  try {
    Promise.resolve(api.storage.sync.get({ [ENABLED_KEY]: true }))
      .then((data) => {
        enabled = data[ENABLED_KEY] !== false;
        if (enabled) start();
      })
      .catch(() => {
        start();
      });

    storageListener = (changes, area) => {
      if (area !== "sync" || !changes[ENABLED_KEY]) return;
      enabled = changes[ENABLED_KEY].newValue !== false;
      if (enabled) {
        start();
        scheduleScan(document.body);
      } else {
        stop();
        removeAllDecorations();
      }
    };
    api.storage.onChanged.addListener(storageListener);
  } catch {
    // storage may be unavailable in file:// tests — default on
    start();
  }

  function start() {
    if (observer) return;
    scheduleScan(document.body);
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    pendingRoots.clear();
    if (copyTimer) {
      clearTimeout(copyTimer);
      copyTimer = null;
    }
  }

  function onMutations(mutations) {
    if (!enabled) return;

    /** @type {Set<Element>} */
    const roots = new Set();

    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === "characterData") {
        const el = m.target && m.target.parentElement;
        if (el && !isIgnored(el)) roots.add(el);
      } else if (m.addedNodes && m.addedNodes.length) {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n.nodeType === Node.ELEMENT_NODE) {
            if (n.classList && n.classList.contains(WRAP_CLASS)) continue;
            if (!isIgnored(n)) roots.add(n);
          } else if (n.nodeType === Node.TEXT_NODE && n.parentElement) {
            if (!isIgnored(n.parentElement)) roots.add(n.parentElement);
          }
        }
      }
      if (roots.size >= MAX_MUTATION_ROOTS) break;
    }

    if (!roots.size) return;
    for (const r of roots) scheduleScan(r);
  }

  function scheduleScan(root) {
    if (!root) return;
    pendingRoots.add(root);
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(flushScans, SCAN_DEBOUNCE_MS);
  }

  function flushScans() {
    scanTimer = null;
    if (!enabled) {
      pendingRoots.clear();
      return;
    }
    const batch = Array.from(pendingRoots);
    pendingRoots.clear();
    for (let i = 0; i < batch.length; i++) {
      const root = batch[i];
      // Drop disconnected nodes (memory / SPA unmounts)
      if (root === document.body || root === document.documentElement) {
        scanRoot(root);
      } else if (root.isConnected) {
        scanRoot(root);
      }
    }
  }

  function isIgnored(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    const tag = el.tagName;
    if (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "NOSCRIPT" ||
      tag === "TEXTAREA" ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "OPTION" ||
      tag === "SVG" ||
      tag === "MATH" ||
      tag === "HEAD" ||
      tag === "IFRAME"
    ) {
      return true;
    }
    if (el.isContentEditable) return true;
    if (el.closest("." + WRAP_CLASS)) return true;
    if (el.closest("[contenteditable='true']")) return true;
    return false;
  }

  function scanRoot(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isIgnored(parent)) return NodeFilter.FILTER_REJECT;
        // Already handled by our wraps
        if (parent.closest("." + WRAP_CLASS)) return NodeFilter.FILTER_REJECT;
        if (!/[A-Za-z0-9+/]{16,}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let n;
    while ((n = walker.nextNode()) && targets.length < MAX_TEXT_NODES_PER_SCAN) {
      targets.push(n);
    }

    for (let i = 0; i < targets.length; i++) {
      processTextNode(targets[i]);
    }
  }

  function processTextNode(textNode) {
    if (!textNode.isConnected) return;
    const text = textNode.nodeValue;
    if (!text) return;

    const hits = D.findDecodings(text);
    if (!hits.length) return;

    const parent = textNode.parentElement;
    if (!parent || isIgnored(parent)) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const start = text.indexOf(hit.raw, cursor);
      if (start === -1) continue;

      if (start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      }

      const wrap = document.createElement("span");
      wrap.className = WRAP_CLASS;
      wrap.setAttribute(ATTR, "1");

      const original = document.createElement("span");
      original.className = "b64d-original";
      original.textContent = hit.raw;
      wrap.appendChild(original);

      wrap.appendChild(buildBadge(hit));
      frag.appendChild(wrap);
      cursor = start + hit.raw.length;
    }

    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    if (cursor === 0) return; // nothing applied
    parent.replaceChild(frag, textNode);
  }

  function buildBadge(hit) {
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.setAttribute("role", "note");
    badge.setAttribute("title", "Readable version");

    const url = asHttpUrl(hit.decoded);
    let decodedEl;
    if (url) {
      decodedEl = document.createElement("a");
      decodedEl.href = url;
      decodedEl.target = "_blank";
      decodedEl.rel = "noopener noreferrer";
      decodedEl.title = "Open link";
      decodedEl.addEventListener("click", (e) => e.stopPropagation());
    } else {
      decodedEl = document.createElement("span");
    }
    decodedEl.className = DECODED_CLASS;
    // textContent only — never innerHTML (XSS-safe for decoded payloads)
    decodedEl.textContent = hit.decoded;
    badge.appendChild(decodedEl);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "b64d-copy";
    copyBtn.setAttribute("aria-label", "Copy readable text");
    copyBtn.setAttribute("title", "Copy");
    copyBtn.innerHTML =
      '<svg class="b64d-icon-copy" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/>' +
      '<path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/>' +
      "</svg>" +
      '<svg class="b64d-icon-check" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75">' +
      '<path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyText(hit.decoded, badge);
    });
    badge.appendChild(copyBtn);

    return badge;
  }

  /** Only allow http(s) navigable URLs — blocks javascript:/data: etc. */
  function asHttpUrl(text) {
    if (!text || typeof text !== "string") return null;
    const t = text.trim();
    if (t.length > 2048) return null;
    if (!/^https?:\/\/[^\s<>"'`]+$/i.test(t)) return null;
    try {
      const u = new URL(t);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch {
      return null;
    }
  }

  function copyText(str, badge) {
    const done = () => {
      badge.classList.add("b64d-copied");
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        badge.classList.remove("b64d-copied");
        copyTimer = null;
      }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(done).catch(() => fallbackCopy(str, done));
    } else {
      fallbackCopy(str, done);
    }
  }

  function fallbackCopy(str, done) {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      /* ignore */
    }
    ta.remove();
  }

  function removeAllDecorations() {
    document.querySelectorAll("." + WRAP_CLASS).forEach((wrap) => {
      const original = wrap.querySelector(".b64d-original");
      const text = original ? original.textContent : wrap.textContent;
      wrap.replaceWith(document.createTextNode(text || ""));
    });
  }

  globalThis.__b64d = { scanRoot, scheduleScan, start, stop };
})();
