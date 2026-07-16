/**
 * Content script: scan the page for Base64, show decoded values inline.
 * MutationObserver handles Reddit SPA / infinite scroll.
 */
(function () {
  "use strict";

  const D = globalThis.Base64Decoder;
  if (!D) {
    console.error("[Plain Text Helper] decoder.js not loaded");
    return;
  }

  const ATTR = "data-b64d-processed";
  const WRAP_CLASS = "b64d-wrap";
  const BADGE_CLASS = "b64d-badge";
  const DECODED_CLASS = "b64d-decoded";
  const ENABLED_KEY = "enabled";

  let enabled = true;
  let observer = null;
  let scanTimer = null;

  // ---- settings ----
  try {
    chrome.storage.sync.get({ [ENABLED_KEY]: true }, (data) => {
      enabled = data[ENABLED_KEY] !== false;
      if (enabled) start();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[ENABLED_KEY]) return;
      enabled = changes[ENABLED_KEY].newValue !== false;
      if (enabled) {
        start();
        scheduleScan(document.body);
      } else {
        stop();
        removeAllDecorations();
      }
    });
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
  }

  function onMutations(mutations) {
    if (!enabled) return;
    let needsScan = false;
    for (const m of mutations) {
      if (m.type === "characterData") {
        const el = m.target.parentElement;
        if (el && !el.closest("." + WRAP_CLASS) && !isIgnored(el)) {
          needsScan = true;
          break;
        }
      } else if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.nodeType === Node.ELEMENT_NODE && n.classList?.contains(WRAP_CLASS)) {
            continue;
          }
          if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
            needsScan = true;
            break;
          }
        }
        if (needsScan) break;
      }
    }
    if (needsScan) scheduleScan(document.body);
  }

  function scheduleScan(root) {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      if (enabled && root) scanRoot(root);
    }, 200);
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
      tag === "MATH"
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
        if (parent.hasAttribute(ATTR)) return NodeFilter.FILTER_REJECT;
        // Quick prefilter: base64 alphabet density
        if (!/[A-Za-z0-9+/]{16,}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);

    for (const textNode of targets) {
      processTextNode(textNode);
    }
  }

  function processTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text) return;

    const hits = D.findDecodings(text);
    if (!hits.length) return;

    const parent = textNode.parentElement;
    if (!parent || isIgnored(parent)) return;

    // Build replacement fragment: original text with badges after each match
    const frag = document.createDocumentFragment();
    let cursor = 0;

    for (const hit of hits) {
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

    parent.replaceChild(frag, textNode);
  }

  function buildBadge(hit) {
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.setAttribute("role", "note");
    badge.setAttribute("title", "Plain text version");

    const label = document.createElement("span");
    label.className = "b64d-label";
    label.textContent = "→";
    label.setAttribute("aria-hidden", "true");
    badge.appendChild(label);

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
    decodedEl.textContent = hit.decoded;
    badge.appendChild(decodedEl);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "b64d-copy";
    copyBtn.setAttribute("aria-label", "Copy plain text");
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

  /** @returns {string|null} */
  function asHttpUrl(text) {
    if (!text || typeof text !== "string") return null;
    const t = text.trim();
    if (!/^https?:\/\/[^\s]+$/i.test(t)) return null;
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
      setTimeout(() => badge.classList.remove("b64d-copied"), 1200);
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
    document.body.removeChild(ta);
  }

  function removeAllDecorations() {
    document.querySelectorAll("." + WRAP_CLASS).forEach((wrap) => {
      const original = wrap.querySelector(".b64d-original");
      const text = original ? original.textContent : wrap.textContent;
      wrap.replaceWith(document.createTextNode(text || ""));
    });
  }

  // Expose for manual test page
  globalThis.__b64d = { scanRoot, scheduleScan, start, stop };
})();
