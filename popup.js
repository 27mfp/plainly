(function () {
  "use strict";

  const enabledEl = document.getElementById("enabled");
  const inputEl = document.getElementById("input");
  const outputEl = document.getElementById("output");
  const versionEl = document.getElementById("version");
  const D = globalThis.Base64Decoder;

  try {
    const manifest = chrome.runtime.getManifest();
    if (manifest && manifest.version && versionEl) {
      versionEl.textContent = "v" + manifest.version;
    }
  } catch {
    /* ignore outside extension */
  }

  chrome.storage.sync.get({ enabled: true }, (data) => {
    enabledEl.checked = data.enabled !== false;
  });

  enabledEl.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: enabledEl.checked });
  });

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

  inputEl.addEventListener("input", updateOutput);
})();
