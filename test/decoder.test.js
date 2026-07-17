/**
 * Node test suite for Base64Decoder (no browser required).
 * Run: node test/decoder.test.js
 */
const assert = require("assert");
const path = require("path");
const D = require(path.join(__dirname, "..", "src", "decoder.js"));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log("\nBase64Decoder tests\n");

// --- samples from the product request ---
const SAMPLES = [
  {
    // truncated / unpadded variant from the user example
    raw: "HR0cHM6Ly9wdGZsaXguY2Mv",
    // may or may not decode to a full URL; we assert decode doesn't throw
  },
  {
    raw: "aHR0cHM6Ly9tZWdhdHVnYS5pby8=",
    expect: "https://megatuga.io/",
  },
  {
    raw: "aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==",
    expect: "https://www.bestfreestreaming.org/",
  },
  {
    raw: "aHR0cHM6Ly9wdGZsaXguY2Mv",
    expect: "https://ptflix.cc/",
  },
];

test("decodes padded https megatuga URL", () => {
  assert.strictEqual(D.decode(SAMPLES[1].raw), SAMPLES[1].expect);
});

test("decodes padded https bestfreestreaming URL", () => {
  assert.strictEqual(D.decode(SAMPLES[2].raw), SAMPLES[2].expect);
});

test("decodes unpadded https ptflix URL", () => {
  assert.strictEqual(D.decode(SAMPLES[3].raw), SAMPLES[3].expect);
});

test("pads base64 correctly", () => {
  assert.strictEqual(D.padBase64("YQ"), "YQ==");
  assert.strictEqual(D.padBase64("YWE"), "YWE=");
  assert.strictEqual(D.padBase64("YWFh"), "YWFh");
  assert.strictEqual(D.padBase64("Y"), null);
});

test("rejects non-base64 garbage", () => {
  assert.strictEqual(D.decode("not-base64!!!@@@"), null);
  assert.strictEqual(D.decode("short"), null);
  assert.strictEqual(D.decode(""), null);
});

test("rejects binary-looking output", () => {
  // "\x00\x01\x02..." as base64
  const binary = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString(
    "base64"
  );
  assert.strictEqual(D.decode(binary), null);
});

test("looksLikeBase64 positive", () => {
  assert.strictEqual(D.looksLikeBase64(SAMPLES[1].raw), true);
  assert.strictEqual(D.looksLikeBase64(SAMPLES[2].raw), true);
});

test("looksLikeBase64 negative", () => {
  assert.strictEqual(D.looksLikeBase64("hello world"), false);
  assert.strictEqual(D.looksLikeBase64("abc"), false);
});

test("findDecodings in multi-line post text", () => {
  const post = `maria was looking for a book, but all books title were in base64, the list is the following:

aHR0cHM6Ly9tZWdhdHVnYS5pby8=

aHR0cHM6Ly93d3cuYmVzdGZyZWVzdHJlYW1pbmcub3JnLw==

aHR0cHM6Ly9wdGZsaXguY2Mv
`;
  const hits = D.findDecodings(post);
  assert.ok(hits.length >= 3, `expected >= 3 hits, got ${hits.length}`);
  const decoded = hits.map((h) => h.decoded);
  assert.ok(decoded.includes("https://megatuga.io/"));
  assert.ok(decoded.includes("https://www.bestfreestreaming.org/"));
  assert.ok(decoded.includes("https://ptflix.cc/"));
});

test("findDecodings ignores prose", () => {
  const prose =
    "maria was looking for a book, but all books title were in base64, the list is the following:";
  const hits = D.findDecodings(prose);
  assert.strictEqual(hits.length, 0);
});

test("tryDecode helper", () => {
  const r = D.tryDecode(SAMPLES[1].raw);
  assert.ok(r);
  assert.strictEqual(r.decoded, SAMPLES[1].expect);
  assert.strictEqual(D.tryDecode("nope"), null);
});

test("decodes plain text message", () => {
  const msg = "Hello, Base64 world!";
  const b64 = Buffer.from(msg, "utf8").toString("base64");
  assert.strictEqual(D.decode(b64), msg);
});

test("unwraps nested base64 (2 layers) to URL", () => {
  const url = "https://github.com/27mfp/plainly";
  const inner = Buffer.from(url, "utf8").toString("base64");
  const outer = Buffer.from(inner, "utf8").toString("base64");
  assert.strictEqual(D.decodeOnce(outer), inner);
  assert.strictEqual(D.decode(outer), url);
});

test("unwraps nested base64 (3 layers) to plain text", () => {
  const msg = "nested-plainly-ok";
  let layer = msg;
  for (let i = 0; i < 3; i++) {
    layer = Buffer.from(layer, "utf8").toString("base64");
  }
  assert.strictEqual(D.decode(layer), msg);
});

test("findDecodings unwraps nested hits", () => {
  const url = "https://megatuga.io/";
  const inner = Buffer.from(url, "utf8").toString("base64");
  const outer = Buffer.from(inner, "utf8").toString("base64");
  const hits = D.findDecodings(`check this:\n\n${outer}\n`);
  assert.ok(hits.length >= 1);
  assert.strictEqual(hits[0].decoded, url);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
