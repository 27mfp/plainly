/**
 * Pure Base64 detection & decoding utilities.
 * Works in both Chrome content scripts and Node (for tests).
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.Base64Decoder = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Min length for a candidate string (chars). Shorter = too many false positives. */
  const MIN_LENGTH = 16;

  /** Max length to avoid scanning huge blobs. */
  const MAX_LENGTH = 4096;

  /**
   * Max nested base64 layers (e.g. b64 → b64 → URL).
   * Common on wiki/list sites that wrap pastebin URLs or re-encode links.
   */
  const MAX_NEST_DEPTH = 5;

  /**
   * Base64 alphabet chunk. Requires enough entropy to look intentional.
   * Allows optional whitespace that we strip before decode.
   */
  const BASE64_TOKEN =
    /(?:^|[\s"'`()[\]{}<>|\\,;:!?#*=+\-_/])([A-Za-z0-9+/]{16,}={0,2})(?=$|[\s"'`()[\]{}<>|\\,;:!?#*]|\.(?:\s|$))/g;

  /** Simpler whole-string / line-oriented matcher for isolated tokens. */
  const BASE64_LINE = /^[A-Za-z0-9+/]{16,}={0,2}$/;

  /**
   * Pad base64 so length is a multiple of 4.
   * @param {string} s
   * @returns {string|null}
   */
  function padBase64(s) {
    const cleaned = s.replace(/\s+/g, "");
    const mod = cleaned.length % 4;
    if (mod === 1) return null; // invalid
    if (mod === 2) return cleaned + "==";
    if (mod === 3) return cleaned + "=";
    return cleaned;
  }

  /**
   * Single-layer base64 → UTF-8. Returns null on failure.
   * @param {string} input
   * @returns {string|null}
   */
  function decodeOnce(input) {
    if (typeof input !== "string") return null;
    const padded = padBase64(input);
    if (!padded || padded.length < MIN_LENGTH || padded.length > MAX_LENGTH) {
      return null;
    }
    // Must only contain base64 alphabet after pad
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) return null;

    try {
      let binary;
      if (typeof atob === "function") {
        binary = atob(padded);
      } else if (typeof Buffer !== "undefined") {
        binary = Buffer.from(padded, "base64").toString("binary");
      } else {
        return null;
      }

      // Convert binary string to UTF-8
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i) & 0xff;
      }

      let text;
      if (typeof TextDecoder !== "undefined") {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else if (typeof Buffer !== "undefined") {
        text = Buffer.from(bytes).toString("utf8");
        // Reject if replacement chars dominate (Node doesn't throw)
        if (text.includes("\uFFFD")) return null;
      } else {
        return null;
      }

      if (!isPlausibleDecodedText(text)) return null;
      return text;
    } catch {
      return null;
    }
  }

  /**
   * Decode base64 to UTF-8, unwrapping nested layers when the result is
   * still pure base64 (e.g. b64 → b64 → https://…).
   * @param {string} input
   * @returns {string|null}
   */
  function decode(input) {
    let text = decodeOnce(input);
    if (!text) return null;

    for (let depth = 1; depth < MAX_NEST_DEPTH; depth++) {
      const layer = text.trim();
      if (!looksLikeBase64(layer)) break;
      const next = decodeOnce(layer);
      if (!next || next === text) break;
      text = next;
    }
    return text;
  }

  /**
   * Heuristic: decoded output should look like readable text / URL / JSON, not binary junk.
   * @param {string} text
   * @returns {boolean}
   */
  function isPlausibleDecodedText(text) {
    if (!text || text.length === 0) return false;
    if (text.length > MAX_LENGTH) return false;

    // Reject control chars (except common whitespace)
    let printable = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c === 9 || c === 10 || c === 13) {
        printable++;
        continue;
      }
      if (c < 32 || c === 127) return false;
      printable++;
    }
    if (printable / text.length < 0.95) return false;

    // Prefer strings with letters/digits (not just punctuation)
    const alnum = (text.match(/[A-Za-z0-9]/g) || []).length;
    if (alnum < 3 && text.length > 8) return false;

    // Reject if it looks like still-raw base64 of similar length (optional soft check)
    return true;
  }

  /**
   * True if string is a plausible base64 candidate (syntax only).
   * @param {string} s
   * @returns {boolean}
   */
  function looksLikeBase64(s) {
    if (typeof s !== "string") return false;
    const t = s.trim();
    if (t.length < MIN_LENGTH || t.length > MAX_LENGTH) return false;
    return BASE64_LINE.test(t);
  }

  /**
   * Find all decodable base64 substrings in a text blob.
   * @param {string} text
   * @returns {Array<{ raw: string, decoded: string, index: number }>}
   */
  function findDecodings(text) {
    if (!text || typeof text !== "string") return [];
    const results = [];
    const seen = new Set();

    // Line-by-line first (common on Reddit posts / lists)
    const lines = text.split(/\r?\n/);
    let offset = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (looksLikeBase64(trimmed)) {
        const decoded = decode(trimmed);
        if (decoded && !seen.has(trimmed)) {
          seen.add(trimmed);
          const index = offset + line.indexOf(trimmed);
          results.push({ raw: trimmed, decoded, index });
        }
      }
      offset += line.length + 1;
    }

    // Token scan for inline base64
    BASE64_TOKEN.lastIndex = 0;
    let m;
    const re = new RegExp(BASE64_TOKEN.source, BASE64_TOKEN.flags);
    while ((m = re.exec(text)) !== null) {
      const raw = m[1];
      if (seen.has(raw)) continue;
      if (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH) continue;
      const decoded = decode(raw);
      if (decoded) {
        seen.add(raw);
        results.push({ raw, decoded, index: m.index + (m[0].length - raw.length) });
      }
    }

    results.sort((a, b) => a.index - b.index);
    return results;
  }

  /**
   * Decode a single string if possible.
   * @param {string} s
   * @returns {{ raw: string, decoded: string }|null}
   */
  function tryDecode(s) {
    const decoded = decode(s);
    if (!decoded) return null;
    return { raw: s.trim(), decoded };
  }

  return {
    MIN_LENGTH,
    MAX_LENGTH,
    MAX_NEST_DEPTH,
    padBase64,
    decodeOnce,
    decode,
    looksLikeBase64,
    findDecodings,
    tryDecode,
    isPlausibleDecodedText,
  };
});
