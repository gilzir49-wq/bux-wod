// Build branded logo assets from the official CrossFit Bux PNGs.
//
// Reads brand-src/*.png (white-background exports), removes the near-white
// background to transparent, trims to content, and emits:
//   public/brand/logo-icon.png        transparent deer roundel
//   public/brand/logo-horizontal.png  transparent horizontal lockup
//   public/icons/icon-192.png         deer on brand-green square (PWA "any")
//   public/icons/icon-512.png
//   public/icons/icon-maskable-512.png  extra safe-zone padding
//
// Pure Node (zlib only) — no native image deps. Run: npm run build-logo
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'brand-src');
const BRAND_OUT = join(ROOT, 'public', 'brand');
const ICON_OUT = join(ROOT, 'public', 'icons');
mkdirSync(BRAND_OUT, { recursive: true });
mkdirSync(ICON_OUT, { recursive: true });

const GREEN = [0x1e, 0x4d, 0x2b];

// ---------- PNG decode (8-bit RGBA, filters 0-4, non-interlaced) ----------
function decodePNG(buf) {
  let p = 8;
  let w, h, bd, ct;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bd = data[8];
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8 || ct !== 6) throw new Error(`unsupported PNG bd=${bd} ct=${ct}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = new Uint8Array(w * h * bpp);
  let pos = 0;
  const paeth = (a, b, c) => {
    const pp = a + b - c;
    const pa = Math.abs(pp - a),
      pb = Math.abs(pp - b),
      pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const val = raw[pos++];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let recon;
      switch (filter) {
        case 0: recon = val; break;
        case 1: recon = val + a; break;
        case 2: recon = val + b; break;
        case 3: recon = val + ((a + b) >> 1); break;
        case 4: recon = val + paeth(a, b, c); break;
        default: throw new Error('bad filter ' + filter);
      }
      out[y * stride + x] = recon & 0xff;
    }
  }
  return { w, h, data: out };
}

// ---------- PNG encode (8-bit RGBA, filter 0) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, data) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = data[y * stride + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- background removal (flood-fill the light, desaturated bg) ----------
// The export background is a light, *textured* near-white. A global threshold
// leaves speckles, so instead we flood-fill inward from the four borders,
// keying only connected light+desaturated pixels. The saturated green/yellow
// logo halts the fill, so nothing inside it is ever touched.
function removeWhiteBg(img) {
  const { w, h, data } = img;
  const isBg = (o) => {
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const mn = Math.min(r, g, b);
    const sat = Math.max(r, g, b) - mn;
    return mn >= 175 && sat <= 60; // light & roughly neutral
  };
  const visited = new Uint8Array(w * h);
  const stack = [];
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    visited[i] = 1;
    if (isBg(i * 4)) stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    pushIf(x, 0);
    pushIf(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIf(0, y);
    pushIf(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    data[i * 4 + 3] = 0; // transparent
    const x = i % w;
    const y = (i / w) | 0;
    pushIf(x + 1, y);
    pushIf(x - 1, y);
    pushIf(x, y + 1);
    pushIf(x, y - 1);
  }
  // soften the 1px antialiased fringe: kept-but-light pixels touching a
  // transparent neighbor get partial alpha so no hard halo remains.
  const snapshot = visited; // reuse not needed; compute fresh
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] === 0) continue;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const mn = Math.min(r, g, b);
      const sat = Math.max(r, g, b) - mn;
      if (mn < 150 || sat > 70) continue; // clearly logo, keep opaque
      const neighbors = [
        (y * w + Math.min(w - 1, x + 1)) * 4 + 3,
        (y * w + Math.max(0, x - 1)) * 4 + 3,
        (Math.min(h - 1, y + 1) * w + x) * 4 + 3,
        (Math.max(0, y - 1) * w + x) * 4 + 3,
      ];
      if (neighbors.some((n) => data[n] === 0)) {
        // ramp: lighter -> more transparent
        data[o + 3] = Math.max(0, Math.min(255, Math.round((220 - mn) * 4)));
      }
    }
  }
  void snapshot;
  return img;
}

// ---------- trim to content (alpha > threshold) ----------
function trim(img, pad = 0) {
  const { w, h, data } = img;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++) {
      const so = ((y + minY) * w + (x + minX)) * 4;
      const do_ = (y * nw + x) * 4;
      out[do_] = data[so];
      out[do_ + 1] = data[so + 1];
      out[do_ + 2] = data[so + 2];
      out[do_ + 3] = data[so + 3];
    }
  return { w: nw, h: nh, data: out };
}

// ---------- box-filter resize (premultiplied alpha) ----------
function resize(img, tw, th) {
  const { w, h, data } = img;
  const out = new Uint8Array(tw * th * 4);
  for (let ty = 0; ty < th; ty++) {
    const sy0 = Math.floor((ty * h) / th);
    const sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * h) / th));
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = Math.floor((tx * w) / tw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * w) / tw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++)
        for (let sx = sx0; sx < sx1; sx++) {
          const o = (sy * w + sx) * 4;
          const al = data[o + 3] / 255;
          r += data[o] * al;
          g += data[o + 1] * al;
          b += data[o + 2] * al;
          a += data[o + 3];
          n++;
        }
      const o = (ty * tw + tx) * 4;
      const aMean = a / n;
      const alphaSum = a / 255 || 1e-6;
      out[o] = Math.round(r / alphaSum);
      out[o + 1] = Math.round(g / alphaSum);
      out[o + 2] = Math.round(b / alphaSum);
      out[o + 3] = Math.round(aMean);
    }
  }
  return { w: tw, h: th, data: out };
}

// ---------- compose onto a solid square (for app icons) ----------
function onSquare(logo, size, bg, fillFraction) {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    out[o] = bg[0];
    out[o + 1] = bg[1];
    out[o + 2] = bg[2];
    out[o + 3] = 255;
  }
  // scale logo to fit fillFraction of the square (preserve aspect)
  const target = Math.round(size * fillFraction);
  const scale = Math.min(target / logo.w, target / logo.h);
  const lw = Math.max(1, Math.round(logo.w * scale));
  const lh = Math.max(1, Math.round(logo.h * scale));
  const r = resize(logo, lw, lh);
  const ox = Math.round((size - lw) / 2);
  const oy = Math.round((size - lh) / 2);
  for (let y = 0; y < lh; y++)
    for (let x = 0; x < lw; x++) {
      const so = (y * lw + x) * 4;
      const a = r.data[so + 3] / 255;
      if (a <= 0) continue;
      const do_ = ((y + oy) * size + (x + ox)) * 4;
      out[do_] = Math.round(r.data[so] * a + out[do_] * (1 - a));
      out[do_ + 1] = Math.round(r.data[so + 1] * a + out[do_ + 1] * (1 - a));
      out[do_ + 2] = Math.round(r.data[so + 2] * a + out[do_ + 2] * (1 - a));
      out[do_ + 3] = 255;
    }
  return { w: size, h: size, data: out };
}

// ================= run =================
console.log('processing icon…');
const iconClean = trim(removeWhiteBg(decodePNG(readFileSync(join(SRC, 'icon.png')))), 6);
writeFileSync(
  join(BRAND_OUT, 'logo-icon.png'),
  encodePNG(...resizeToBuf(iconClean, 640)),
);

console.log('processing horizontal…');
const horiz = trim(removeWhiteBg(decodePNG(readFileSync(join(SRC, 'horizontal.png')))), 6);
writeFileSync(
  join(BRAND_OUT, 'logo-horizontal.png'),
  encodePNG(...resizeToBuf(horiz, 1000)),
);

console.log('building app icons…');
for (const size of [192, 512]) {
  const icon = onSquare(iconClean, size, GREEN, 0.84);
  writeFileSync(join(ICON_OUT, `icon-${size}.png`), encodePNG(icon.w, icon.h, icon.data));
}
const maskable = onSquare(iconClean, 512, GREEN, 0.64);
writeFileSync(join(ICON_OUT, 'icon-maskable-512.png'), encodePNG(maskable.w, maskable.h, maskable.data));

console.log('done.');

// resize keeping aspect to max dimension, return [w,h,data] for encode spread
function resizeToBuf(img, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(img.w, img.h));
  const tw = Math.max(1, Math.round(img.w * scale));
  const th = Math.max(1, Math.round(img.h * scale));
  const r = resize(img, tw, th);
  return [r.w, r.h, r.data];
}
