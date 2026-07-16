/**
 * Generate simple PNG icons without external deps (pure Node).
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size) {
  // Solid green rounded-ish square with simple "64" feel via two blocks
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      // margin
      const m = 0.08;
      const inside = nx > m && nx < 1 - m && ny > m && ny < 1 - m;
      // soft corner distance
      const cx = Math.min(nx - m, 1 - m - nx, ny - m, 1 - m - ny);
      const cornerCut = cx < 0.06 && (nx < 0.2 || nx > 0.8) && (ny < 0.2 || ny > 0.8);

      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      if (inside && !cornerCut) {
        // gradient green
        r = Math.round(26 + ny * 10);
        g = Math.round(140 + (1 - ny) * 30);
        b = Math.round(90 + nx * 20);
        a = 255;
        // lighter "64" bars
        const bar1 =
          nx > 0.28 && nx < 0.42 && ny > 0.28 && ny < 0.72;
        const bar2 =
          nx > 0.48 && nx < 0.72 && ny > 0.28 && ny < 0.42;
        const bar3 =
          nx > 0.48 && nx < 0.62 && ny > 0.42 && ny < 0.72;
        if (bar1 || bar2 || bar3) {
          r = 255;
          g = 255;
          b = 255;
        }
      }
      const i = 1 + x * 4;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
      row[i + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, createPng(size));
  console.log("wrote", file);
}
