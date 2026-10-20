// Small image-processing helpers shared by f1.mjs and spray.mjs.
import sharp from "sharp";

/** Seeded random numbers, so generated art is identical between runs. */
export function makeRng(seed) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  return { rand, gauss };
}

/** Gaussian blur of a float channel via sharp, encoded as 8-bit as (v * scale + offset). */
export async function blur1(values, w, h, sigma, { scale = 255, offset = 0 } = {}) {
  const enc = Buffer.alloc(values.length);
  for (let i = 0; i < values.length; i++) enc[i] = Math.max(0, Math.min(255, Math.round(values[i] * scale + offset)));
  const raw = await sharp(enc, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = (raw[i] - offset) / scale;
  return out;
}

/** Connected components of a 0/1 mask (4-connected, or 8-connected with `eight`). */
export function components(mask, w, h, eight = false) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!mask[s0] || seen[s0]) continue;
    const pixels = [];
    stack.push(s0);
    seen[s0] = 1;
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (!eight && dx && dy)) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
    }
    out.push(pixels);
  }
  return out;
}

/** Float Gaussian blur (three box-blur passes), keeps full precision for faint glows. */
export function gblur(src, w, h, sigma) {
  const n = 3;
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  for (let i = 0; i < n; i++) {
    const r = Math.max(1, ((i < m ? wl : wl + 2) - 1) / 2);
    boxPass(a, b, w, h, r, 1, w, h);
    boxPass(b, a, w, h, r, w, 1, w);
  }
  return a;
}

/** One box blur along an axis: `step` between samples, `lineStep` between lines. */
function boxPass(src, dst, w, h, r, step, lineStep, _w) {
  const len = step === 1 ? w : h;
  const lines = step === 1 ? h : w;
  const k = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    const base = line * lineStep;
    let val = 0;
    for (let j = -r; j <= r; j++) val += src[base + Math.min(len - 1, Math.max(0, j)) * step];
    for (let j = 0; j < len; j++) {
      dst[base + j * step] = val * k;
      val += src[base + Math.min(len - 1, j + r + 1) * step] - src[base + Math.max(0, j - r) * step];
    }
  }
}
