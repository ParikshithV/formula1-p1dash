// Draws a circuit as one clean sector-coloured line on a transparent background, traced
// entirely from F1's official detailed track map.
//
// The map draws the asphalt as a dark band. That band is smoothed, thinned to its centreline
// (skeleton, spur pruning, gap bridging, straight through at crossings) and walked as one closed
// loop, which is smoothed again so the line has no lumps. The thin pink / yellow / blue (or
// purple / yellow / cyan) line inside the band supplies the sectors; their S1 -> S2 -> S3 order
// gives the direction of travel, and the S3 -> S1 boundary is the start / finish line.
import sharp from "sharp";
import { blur1, components, gblur } from "./imaging.mjs";

/** Sector 1, 2, 3 as drawn. */
const PALETTE = [[236, 38, 132], [255, 200, 0], [24, 146, 255]];

/* ---------- reading the map ---------- */

const hueOf = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max < 110 || (max - min) / max < 0.5) return -1;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

/**
 * F1 draws the sector line in one of two palettes:
 *  - pink / yellow / blue (red is only kerbs and straight-mode dashes, lime the speed trap)
 *  - red / cyan / yellow (magenta is the speed-trap box)
 */
const PALETTES = {
  pinkYellowBlue: (h) => (h >= 315 && h <= 345 ? 0 : h >= 38 && h <= 54 ? 1 : h >= 200 && h <= 228 ? 2 : -1),
  redCyanYellow: (h) => (h >= 350 || h <= 12 ? 0 : h >= 182 && h <= 200 ? 1 : h >= 38 && h <= 54 ? 2 : -1),
};

/**
 * Reads the map: `cls` is the sector of each pixel of the coloured centre line, `track` the asphalt
 * band (largest dark shape, which also includes the turn-number discs touching it) and `centre`
 * the drawn centre line (sector colours, or the plain grey line on maps without sectors).
 */
async function readMap(mapBuf, width) {
  const { data, info } = await sharp(mapBuf).trim().resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const hue = new Float32Array(n).fill(-1);
  let pink = 0, cyan = 0;
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 200) continue;
    hue[i] = hueOf(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (hue[i] >= 315 && hue[i] <= 345) pink++;
    if (hue[i] >= 182 && hue[i] <= 200) cyan++;
  }
  const sectorOf = pink >= cyan ? PALETTES.pinkYellowBlue : PALETTES.redCyanYellow;
  const cls = new Int8Array(n).fill(-1);
  const track = new Uint8Array(n);
  const grey = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 200) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (hue[i] >= 0) cls[i] = sectorOf(hue[i]);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 70 || (max - min < 40 && max <= 120)) track[i] = 1;
    else if (max - min < 30 && max > 120) grey[i] = 1; // centre stripe and label boxes on the band
  }
  // Light areas on the band (centre stripe, label boxes) count as asphalt, but not an opaque
  // white background (some maps have one): large near-white areas, or ones along the image edges.
  const white = new Uint8Array(n);
  for (let i = 0; i < n; i++) white[i] = grey[i] && Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= 235 ? 1 : 0;
  for (const c of components(white, w, h, true)) {
    const border = c.filter((p) => p % w === 0 || p < w || p % w === w - 1 || p >= w * (h - 1)).length;
    if (border > (w + h) / 4 || c.length > n * 0.01) for (const p of c) grey[p] = 0;
  }
  // Speed-trap and overtake dots (lime / green) sit on the line; their anti-aliased rims can
  // read as a sector colour and ring the dot, so sector pixels right beside them are dropped.
  const marker = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (hue[i] >= 62 && hue[i] < 175) marker[i] = 1;
  for (const c of components(marker, w, h, true)) if (c.length < 25) for (const p of c) marker[p] = 0;
  for (let i = 0; i < n; i++) {
    if (cls[i] < 0) continue;
    const x = i % w, y = (i / w) | 0;
    for (let dy = -3; dy <= 3 && cls[i] >= 0; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && marker[ny * w + nx]) { cls[i] = -1; break; }
    }
  }
  // Kerb dashes and small text share the sector hues; keep only sizeable strokes.
  const sector = new Uint8Array(n);
  for (let i = 0; i < n; i++) sector[i] = cls[i] >= 0 ? 1 : 0;
  for (const c of components(sector, w, h, true)) if (c.length < 200 * (w / 1000) ** 2 * 1.4) for (const p of c) { cls[p] = -1; sector[p] = 0; }
  let coloured = 0;
  for (let i = 0; i < n; i++) coloured += sector[i];
  const hasSectors = coloured > 400;
  for (let i = 0; i < n; i++) if (sector[i] || grey[i]) track[i] = 1;
  // Close the anti-aliased seams between the dark band and the lines drawn on it.
  const solid = await blur1(track, w, h, 1.5);
  for (let i = 0; i < n; i++) track[i] = solid[i] > 0.3 ? 1 : 0;
  // Keep the band's large pieces (a chequered line or marker can cut it into a few).
  const pieces = components(track, w, h, true);
  const largest = Math.max(...pieces.map((c) => c.length));
  track.fill(0);
  for (const c of pieces) if (c.length > largest * 0.05) for (const p of c) track[p] = 1;
  let centre = sector;
  if (!hasSectors) {
    // No sector line: use the middle of the asphalt band (its widest-inside pixels).
    const inside = distanceTo(track.map((v) => 1 - v), w, h);
    const depth = [];
    for (let i = 0; i < n; i++) if (track[i]) depth.push(inside[i]);
    depth.sort((a, b) => a - b);
    const deep = depth[Math.floor(depth.length * 0.9)] * 0.75;
    centre = new Uint8Array(n);
    for (let i = 0; i < n; i++) centre[i] = track[i] && inside[i] >= deep ? 1 : 0;
  }
  for (let i = 0; i < n; i++) if (!track[i]) { centre[i] = 0; cls[i] = -1; }
  return { w, h, cls, track, centre };
}

/** 3-4 chamfer distance from every pixel to the nearest set pixel of `mask`. */
function distanceTo(mask, w, h) {
  const D = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) D[i] = mask[i] ? 0 : 1e9;
  const pass = (i, j, c) => { if (D[j] + c < D[i]) D[i] = D[j] + c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x > 0) pass(i, i - 1, 3);
    if (y > 0) {
      pass(i, i - w, 3);
      if (x > 0) pass(i, i - w - 1, 4);
      if (x < w - 1) pass(i, i - w + 1, 4);
    }
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (x < w - 1) pass(i, i + 1, 3);
    if (y < h - 1) {
      pass(i, i + w, 3);
      if (x < w - 1) pass(i, i + w + 1, 4);
      if (x > 0) pass(i, i + w - 1, 4);
    }
  }
  for (let i = 0; i < w * h; i++) D[i] /= 3;
  return D;
}

/* ---------- skeleton ---------- */

const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

/** Neighbour count and crossing number (0->1 transitions around the ring) of a pixel. */
function analyze(sk, w, h, i) {
  const x = i % w, y = (i / w) | 0;
  let count = 0, cn = 0, prev = 0;
  const ring = [];
  for (let k = 0; k < 8; k++) {
    const nx = x + DX[k], ny = y + DY[k];
    ring.push(nx >= 0 && ny >= 0 && nx < w && ny < h ? sk[ny * w + nx] : 0);
  }
  prev = ring[7];
  for (let k = 0; k < 8; k++) {
    count += ring[k];
    if (!prev && ring[k]) cn++;
    prev = ring[k];
  }
  return { count, cn };
}

function neighbours(sk, w, h, i) {
  const x = i % w, y = (i / w) | 0;
  const out = [];
  for (let k = 0; k < 8; k++) {
    const nx = x + DX[k], ny = y + DY[k];
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && sk[ny * w + nx]) out.push(ny * w + nx);
  }
  return out;
}

/** Zhang-Suen thinning, in place. */
function thin(img, w, h) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const del = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!img[i]) continue;
          const n = img[i - w], ne = img[i - w + 1], e = img[i + 1], se = img[i + w + 1];
          const s = img[i + w], sw = img[i + w - 1], wv = img[i - 1], nw = img[i - w - 1];
          const B = n + ne + e + se + s + sw + wv + nw;
          if (B < 2 || B > 6) continue;
          const A = (!n && ne ? 1 : 0) + (!ne && e ? 1 : 0) + (!e && se ? 1 : 0) + (!se && s ? 1 : 0) +
            (!s && sw ? 1 : 0) + (!sw && wv ? 1 : 0) + (!wv && nw ? 1 : 0) + (!nw && n ? 1 : 0);
          if (A !== 1) continue;
          if (step === 0 ? n * e * s || e * s * wv : n * e * wv || n * s * wv) continue;
          del.push(i);
        }
      }
      if (del.length) changed = true;
      for (const i of del) img[i] = 0;
    }
  }
}

/** Removes staircase-redundant pixels so only true endpoints have a single neighbour. */
function tidy(sk, w, h) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < sk.length; i++) {
      if (!sk[i]) continue;
      const { count, cn } = analyze(sk, w, h, i);
      if (cn === 1 && count >= 2) { sk[i] = 0; changed = true; }
    }
  }
}

const endpoints = (sk, w, h) => {
  const out = [];
  for (let i = 0; i < sk.length; i++) if (sk[i] && analyze(sk, w, h, i).count === 1) out.push(i);
  return out;
};

/** Removes branches shorter than `maxLen` that run from an endpoint into a junction. */
function pruneSpurs(sk, w, h, maxLen, keepWhole = false) {
  for (let round = 0; round < 3; round++) {
    let removed = 0;
    // With `keepWhole`, pieces without a real fork are taken as lines between gaps, not spurs.
    const forked = new Uint8Array(w * h).fill(keepWhole ? 0 : 1);
    if (keepWhole) {
      for (const c of components(sk, w, h, true)) {
        if (c.some((p) => analyze(sk, w, h, p).cn >= 3)) for (const p of c) forked[p] = 1;
      }
    }
    for (const e of endpoints(sk, w, h)) {
      if (!sk[e] || !forked[e]) continue;
      const path = [e];
      const seen = new Set(path);
      let cur = e, kind = "limit";
      while (path.length <= maxLen) {
        const next = neighbours(sk, w, h, cur).filter((q) => !seen.has(q));
        if (!next.length) { kind = "end"; break; }
        if (next.length > 1) { kind = "junction"; break; }
        cur = next[0];
        seen.add(cur);
        path.push(cur);
      }
      if (kind === "junction") {
        for (const p of path.slice(0, -1)) sk[p] = 0;
        removed += path.length - 1;
      }
    }
    tidy(sk, w, h);
    if (!removed) break;
  }
}

/**
 * Candidate joins for the gaps in the skeleton (where labels and markers cover the drawn line):
 * for each pair of loose ends, the cheapest path along the asphalt band that keeps to the middle
 * of the band, leaves each end the way its line was heading, and keeps clear of other lines.
 * Joins that only roughly continue their lines are allowed at a higher cost.
 */
function gapCandidates(sk, w, h, track, toEdge, half, maxCost) {
  const ends = endpoints(sk, w, h).map((e) => {
    const own = new Set([e]);
    let cur = e;
    for (let k = 0; k < 20; k++) {
      const next = neighbours(sk, w, h, cur).filter((q) => !own.has(q));
      if (!next.length) break;
      cur = next[0];
      own.add(cur);
    }
    const x = e % w, y = (e / w) | 0;
    const dx = x - (cur % w), dy = y - ((cur / w) | 0), dl = Math.hypot(dx, dy) || 1;
    return { e, x, y, dx: dx / dl, dy: dy / dl, own };
  });
  const index = new Map(ends.map((t, k) => [t.e, k]));
  // Paths keep clear of other stretches of drawn line (tracks running side by side).
  const toLine = distanceTo(sk, w, h);
  const endMask = new Uint8Array(w * h);
  for (const t of ends) endMask[t.e] = 1;
  const toEnd = distanceTo(endMask, w, h);
  const nearEnd = toEnd.map((v) => (v <= 5 ? 1 : 0));
  // The path must leave each loose end the way its line was heading (it may curve after that,
  // e.g. round a hairpin whose bend is covered by a marker).
  const leaves = (t, path) => {
    const q = path[Math.min(path.length - 1, 10)];
    const tx = (q % w) - t.x, ty = ((q / w) | 0) - t.y, tl = Math.hypot(tx, ty) || 1;
    return (tx * t.dx + ty * t.dy) / tl;
  };
  const candidates = [];
  for (const [ia, a] of ends.entries()) {
    const dist = new Map([[a.e, 0]]);
    const prev = new Map();
    const heap = [[0, a.e]];
    let joined = false;
    while (heap.length) {
      let bi = 0;
      for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
      const [d, p] = heap[bi];
      heap[bi] = heap[heap.length - 1];
      heap.pop();
      if (d > dist.get(p) || d > maxCost) continue;
      const ib = index.get(p);
      if (ib !== undefined && ib > ia) {
        const path = [];
        for (let q = p; q !== a.e; q = prev.get(q)) path.push(q);
        const along = Math.min(leaves(ends[ib], path), leaves(a, [...path].reverse()));
        if (along > -0.5) candidates.push({ ia, ib, cost: d + (along < 0.3 ? 80 : 0), path });
      }
      const px = p % w, py = (p / w) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = px + DX[k], ny = py + DY[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        // A T-join into the middle of another line: where a line is cut by a crossing (Suzuka's
        // bridge), its loose end continues into the line that crosses it.
        if (!joined && sk[q] && !a.own.has(q) && index.get(q) === undefined && d > 8) {
          const path = [q];
          for (let r = p; r !== a.e; r = prev.get(r)) path.push(r);
          if (leaves(a, [...path].reverse()) > 0.5) { candidates.push({ ia, ib: -1, cost: d + 150, path }); joined = true; }
        }
        if (toLine[q] < 3 && !nearEnd[q] && d > 3) continue; // don't touch other line pieces
        // Off the asphalt is allowed but dear: a chequered line or marker can cut the band.
        const off = track[q] ? 0 : 14;
        const nd = d + (k % 2 ? Math.SQRT2 : 1) * (1 + off + 6 * Math.max(0, 1 - toEdge[q] / half) ** 2 + 1.5 * Math.max(0, 1 - toLine[q] / (0.7 * half)));
        if (nd < (dist.get(q) ?? Infinity)) { dist.set(q, nd); prev.set(q, p); heap.push([nd, q]); }
      }
    }
  }
  const endNear = [];
  for (const [k, t] of ends.entries()) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = t.x + dx, y = t.y + dy;
      if (x >= 0 && y >= 0 && x < w && y < h) endNear[y * w + x] ??= k;
    }
  }
  // Straight hops: where a line is cut beside a crossing (the line passing over is drawn
  // unbroken), a short ray from the loose end meets the crossing line.
  for (const [ia, a] of ends.entries()) {
    const path = [];
    let crossed = false;
    for (let t = 1; t <= 4 * half; t++) {
      const x = Math.round(a.x + a.dx * t), y = Math.round(a.y + a.dy * t);
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      const q = y * w + x;
      if (path.at(-1) !== q) path.push(q);
      if (endNear[q] !== undefined && endNear[q] !== ia && !a.own.has(q)) {
        const ib = endNear[q];
        candidates.push({ ia, ib, cost: t + 40, path: [...path, ends[ib].e] });
        break;
      }
      if (!sk[q] || a.own.has(q)) continue;
      const ib = index.get(q) ?? endNear[q];
      if (ib === undefined) {
        // Meets a line: a T-join here, or keep going straight over it to a loose end beyond.
        if (!crossed) candidates.push({ ia, ib: -1, cost: t + 60, path: [...path] });
        crossed = true;
        continue;
      }
      if (ib !== ia) candidates.push({ ia, ib, cost: t + 40, path: [...path] });
      break;
    }
  }
  candidates.sort((p, q) => p.cost - q.cost);
  if (process.env.TRACK_DEBUG) console.log("ends", ends.map((t) => `${t.x},${t.y}`).join(" "), "\ncands", candidates.map((c) => `${c.ia}-${c.ib}:${c.cost.toFixed(0)}`).join(" "));
  return { count: ends.length, candidates };
}

/**
 * Joins the gaps so the skeleton becomes one loop: pairings of loose ends are tried cheapest
 * first, and the first that traces as a closed loop covering (nearly) the whole line wins.
 * Returns the traced loop.
 */
function closeLoop(sk, w, h, track, toEdge, half, maxCost) {
  const { count, candidates } = gapCandidates(sk, w, h, track, toEdge, half, maxCost);
  const byEnd = Array.from({ length: count }, () => []);
  for (const c of candidates) { byEnd[c.ia].push(c); if (c.ib >= 0) byEnd[c.ib].push(c); }
  const LEAVE = 400; // an end left open (a stub the walk will skip)
  const solutions = [];
  const LIMIT = 200;
  let visits = 0;
  const matched = new Uint8Array(count);
  const chosen = [];
  const dfs = (cost) => {
    if (++visits > 1000000) return;
    if (solutions.length >= LIMIT && cost >= solutions[solutions.length - 1].cost) return;
    const i = matched.indexOf(0);
    if (i < 0) {
      solutions.push({ cost, picks: [...chosen] });
      solutions.sort((a, b) => a.cost - b.cost);
      if (solutions.length > LIMIT) solutions.pop();
      return;
    }
    matched[i] = 1;
    for (const c of byEnd[i]) {
      const j = c.ia === i ? c.ib : c.ia;
      if (j >= 0 && matched[j]) continue;
      if (j >= 0) matched[j] = 1;
      chosen.push(c);
      dfs(cost + c.cost);
      chosen.pop();
      if (j >= 0) matched[j] = 0;
    }
    dfs(cost + LEAVE);
    matched[i] = 0;
  };
  dfs(0);
  let best = null;
  for (const { picks } of solutions) {
    const trial = Uint8Array.from(sk);
    for (const c of picks) for (const p of c.path) trial[p] = 1;
    tidy(trial, w, h);
    const loop = components(trial, w, h, true).reduce((a, c) => (c.length > a.length ? c : a), []);
    const one = new Uint8Array(w * h);
    for (const p of loop) one[p] = 1;
    let traced;
    try { traced = traceLoop(one, w, h); } catch { continue; }
    let total = 0;
    for (let i = 0; i < sk.length; i++) total += sk[i];
    const result = { ...traced, sk: one, coverage: traced.pts.length / Math.max(total, 1) };
    if (traced.closed && result.coverage > 0.85) return result;
    if (!best || (traced.closed && !best.closed) || (traced.closed === best.closed && result.coverage > best.coverage)) best = result;
  }
  if (!best) throw new Error("no skeleton to trace");
  return best;
}

/**
 * Walks the skeleton as one closed loop. The skeleton is split into segments between junctions;
 * the walk goes straight through every junction (so a figure-of-eight crossing is crossed, not
 * turned at), uses each segment at most once and skips dead ends.
 */
function traceLoop(sk, w, h) {
  const n = w * h;
  // Junction pixels (three or more branches leave them), clustered into nodes.
  const node = new Int32Array(n).fill(-1);
  const jmask = new Uint8Array(n);
  // Skeleton pixels near a junction belong to it, so two junctions a few pixels apart (a cut line
  // meeting the line that crosses it) form one crossing.
  const R = 4;
  for (let i = 0; i < n; i++) {
    if (!sk[i] || analyze(sk, w, h, i).cn < 3) continue;
    const x = i % w, y = (i / w) | 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && sk[ny * w + nx]) jmask[ny * w + nx] = 1;
    }
  }
  const clusters = components(jmask, w, h, true);
  clusters.forEach((c, k) => { for (const p of c) node[p] = k; });
  const centreOf = clusters.map((c) => [c.reduce((s, p) => s + (p % w), 0) / c.length, c.reduce((s, p) => s + ((p / w) | 0), 0) / c.length]);
  // Segments: chains of non-junction pixels.
  const used = new Uint8Array(n);
  const edges = [];
  const chain = (start, from) => {
    const px = [start];
    used[start] = 1;
    let cur = start, end = -1;
    for (;;) {
      const next = neighbours(sk, w, h, cur).filter((q) => !used[q] || (node[q] >= 0 && node[q] !== from));
      const j = next.find((q) => node[q] >= 0 && (node[q] !== from || px.length > 2));
      if (j !== undefined) { end = node[j]; break; }
      // Straight neighbours first, so no pixel of a diagonal staircase is left behind.
      const free = next.filter((q) => node[q] < 0 && !used[q]);
      const q = free.find((q) => q === cur + 1 || q === cur - 1 || q === cur + w || q === cur - w) ?? free[0];
      if (q === undefined) break;
      used[q] = 1;
      px.push(q);
      cur = q;
    }
    return { px, a: from, b: end };
  };
  clusters.forEach((c, k) => {
    for (const p of c) for (const q of neighbours(sk, w, h, p)) if (node[q] < 0 && !used[q]) edges.push(chain(q, k));
  });
  for (let i = 0; i < n; i++) if (sk[i] && !used[i] && node[i] < 0) {
    // A loop without junctions, or a stray piece.
    const e = chain(i, -1);
    if (e.px.length > 40) {
      const [x0, y0] = [e.px[0] % w, (e.px[0] / w) | 0], last = e.px.at(-1);
      const closes = Math.abs((last % w) - x0) <= 2 && Math.abs(((last / w) | 0) - y0) <= 2;
      edges.push({ ...e, loop: closes });
    }
  }
  if (!edges.length) throw new Error("no skeleton to trace");
  if (process.env.TRACK_DEBUG) console.log("nodes", clusters.map((c, k) => `${k}@${centreOf[k].map(Math.round)}`).join(" "), "\nedges", edges.map((e) => `${e.a}>${e.b}:${e.px.length}${e.loop ? "L" : ""}`).join(" "));
  const xy = (p) => [p % w, (p / w) | 0];
  const dirOut = (px) => {
    const a = xy(px[0]), b = xy(px[Math.min(px.length - 1, 12)]);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const longest = edges.reduce((a, e) => (e.px.length > a.px.length ? e : a));
  if (longest.loop) return { pts: longest.px.map(xy), closed: true };
  // Dead ends (segments to nowhere) are skipped when a junction offers anything else.
  const incident = clusters.map(() => []);
  edges.forEach((e, k) => {
    if (e.a >= 0) incident[e.a].push({ k, fwd: true });
    if (e.b >= 0) incident[e.b].push({ k, fwd: false });
  });
  const done = new Uint8Array(edges.length);
  const startK = edges.indexOf(longest);
  let k = startK, fwd = true;
  const pts = [];
  for (let guard = 0; guard < edges.length + 1; guard++) {
    const e = edges[k];
    done[k] = 1;
    const px = fwd ? e.px : [...e.px].reverse();
    for (const p of px) pts.push(xy(p));
    const at = fwd ? e.b : e.a;
    if (at < 0) return { pts, closed: false };
    pts.push(centreOf[at].map(Math.round));
    const tail = px.slice(-13);
    const [ix, iy] = (() => {
      const a = xy(tail[0]), b = xy(tail.at(-1));
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    })();
    let best = null, bestScore = -Infinity;
    for (const { k: k2, fwd: f2 } of incident[at]) {
      if (k2 === k && f2 === !fwd) continue;
      if (done[k2] && k2 !== startK) continue;
      const e2 = edges[k2];
      const [ox, oy] = dirOut(f2 ? e2.px : [...e2.px].reverse());
      const deadEnd = (f2 ? e2.b : e2.a) < 0 && e2.px.length < 60;
      const score = ox * ix + oy * iy - (deadEnd ? 3 : 0);
      if (score > bestScore) { bestScore = score; best = { k: k2, fwd: f2 }; }
    }
    if (!best) return { pts, closed: false };
    if (best.k === startK) return { pts, closed: best.fwd };
    k = best.k;
    fwd = best.fwd;
  }
  return { pts, closed: false };
}

/**
 * Re-draws each bridged gap (a run of points not on the drawn line) as a smooth Hermite curve
 * between the line ends either side, so a gap doesn't bulge towards a marker or label box beside
 * the line. The band-following path is kept where the curve would leave the asphalt (a hairpin
 * whose bend is hidden).
 */
function smoothGaps(pts, drawn, track, w, h) {
  const n = pts.length;
  const onLine = pts.map(([x, y]) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && drawn[ny * w + nx]) return true;
    }
    return false;
  });
  const first = onLine.indexOf(true);
  if (first < 0) return pts;
  const out = pts.map((p) => [...p]);
  const at = (i) => pts[((i % n) + n) % n];
  for (let k = 0; k < n; k++) {
    const i0 = (first + k) % n;
    if (onLine[i0] || !onLine[(i0 - 1 + n) % n]) continue;
    let len = 0;
    while (len < n && !onLine[(i0 + len) % n]) len++;
    if (len >= n) break;
    const a = at(i0 - 1), b = at(i0 + len);
    const a0 = at(i0 - 9), b1 = at(i0 + len + 8);
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const unit = (u, v) => { const l = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; return [(v[0] - u[0]) / l, (v[1] - u[1]) / l]; };
    const ta = unit(a0, a), tb = unit(b, b1);
    const curve = [];
    let inside = true;
    for (let j = 1; j <= len; j++) {
      const t = j / (len + 1), t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      const x = h00 * a[0] + h10 * ta[0] * chord + h01 * b[0] + h11 * tb[0] * chord;
      const y = h00 * a[1] + h10 * ta[1] * chord + h01 * b[1] + h11 * tb[1] * chord;
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h || !track[yi * w + xi]) inside = false;
      curve.push([x, y]);
    }
    if (inside) curve.forEach((p, j) => { out[(i0 + j) % n] = p; });
  }
  return out;
}

/* ---------- polyline helpers ---------- */

function resampleClosed(pts, step) {
  const n = pts.length;
  const cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = pts[i - 1], b = pts[i % n];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[n];
  const m = Math.max(8, Math.round(total / step));
  const out = [];
  let seg = 0;
  for (let k = 0; k < m; k++) {
    const t = (k * total) / m;
    while (cum[seg + 1] < t) seg++;
    const a = pts[seg], b = pts[(seg + 1) % n];
    const f = (t - cum[seg]) / (cum[seg + 1] - cum[seg] || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

function smoothClosed(pts, sigma) {
  const n = pts.length;
  const r = Math.ceil(sigma * 3);
  const kern = [];
  let sum = 0;
  for (let k = -r; k <= r; k++) { const v = Math.exp(-(k * k) / (2 * sigma * sigma)); kern.push(v); sum += v; }
  return pts.map((_, i) => {
    let x = 0, y = 0;
    for (let k = -r; k <= r; k++) {
      const p = pts[(((i + k) % n) + n) % n];
      x += p[0] * kern[k + r];
      y += p[1] * kern[k + r];
    }
    return [x / sum, y / sum];
  });
}

/** GPS coordinates to a flat, north-up plane (y down), centred on the origin. */

/** Per-sample sector from the map's sector colours, gaps filled from the nearest known. */
function sectorsAlong(pts, cls, w, h, r) {
  const n = pts.length;
  const raw = pts.map(([px, py]) => {
    const counts = [0, 0, 0];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = Math.round(px) + dx, y = Math.round(py) + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && cls[y * w + x] >= 0) counts[cls[y * w + x]]++;
    }
    const best = counts.indexOf(Math.max(...counts));
    return counts[best] >= 3 ? best : -1;
  });
  if (raw.filter((c) => c >= 0).length < n * 0.3) return null;
  const filled = raw.map((c, i) => {
    if (c >= 0) return c;
    for (let d = 1; d < n; d++) {
      const a = raw[(i - d + n) % n], b = raw[(i + d) % n];
      if (a >= 0) return a;
      if (b >= 0) return b;
    }
    return 0;
  });
  // Majority filter, then drop runs too short to be a sector (crossings, stray label colour).
  let s = filled.map((c, i) => {
    const counts = [0, 0, 0];
    for (let k = -8; k <= 8; k++) counts[filled[(i + k + n) % n]]++;
    return counts.indexOf(Math.max(...counts));
  });
  for (let pass = 0; pass < 3; pass++) {
    const runs = [];
    for (let i = 0; i < n; i++) if (s[i] !== s[(i - 1 + n) % n]) runs.push(i);
    if (runs.length < 2) break;
    let changed = false;
    for (let r0 = 0; r0 < runs.length; r0++) {
      const a = runs[r0], b = runs[(r0 + 1) % runs.length];
      const len = (b - a + n) % n;
      if (len < n * 0.04) {
        const prev = s[(a - 1 + n) % n];
        for (let k = 0; k < len; k++) s[(a + k) % n] = prev;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s;
}

/* ---------- debugging ---------- */

/** Set TRACK_DEBUG=<dir> to dump each tracing stage as a PNG (skeleton in white, extras in colour). */
async function dump(name, layers, w, h) {
  const dir = process.env.TRACK_DEBUG;
  if (!dir) return;
  const buf = Buffer.alloc(w * h * 3);
  for (const [arr, rgb] of layers) for (let i = 0; i < arr.length; i++) if (arr[i]) { buf[i * 3] = rgb[0]; buf[i * 3 + 1] = rgb[1]; buf[i * 3 + 2] = rgb[2]; }
  await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toFile(`${dir}/${name}.png`);
}

/* ---------- drawing ---------- */

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * @param mapBuf  F1's detailed circuit map image
 * @param fallback  for maps drawn without sector colours: `{ start: [fx, fy], clockwise, sectors: [s2, s3] }`,
 *                  the start line as a fraction of the map's size and sector starts as lap fractions
 */
export async function drawTrack(mapBuf, { width = 1000, fallback } = {}) {
  const inner = width - 160;
  const map = await readMap(mapBuf, inner);
  const { w: mw, h: mh, cls } = map;
  const scale = inner / 1000;

  /*
   * A narrow ribbon around the drawn centre line, limited to the asphalt: it closes the short
   * gaps where dots and markers sit on the line, but stays clear of the turn-number discs beside
   * the band and keeps neighbouring stretches of track apart.
   */
  const toCentre = distanceTo(map.centre, mw, mh);
  const toEdge = distanceTo(map.track.map((v) => 1 - v), mw, mh);
  const widths = [];
  for (let i = 0; i < mw * mh; i++) if (map.centre[i]) widths.push(toEdge[i]);
  widths.sort((a, b) => a - b);
  const half = widths[widths.length >> 1];
  if (process.env.TRACK_DEBUG) console.log("half", half, widths[widths.length >> 3], widths[(widths.length * 7) >> 3]);
  const ribbon = new Uint8Array(mw * mh);
  for (let i = 0; i < ribbon.length; i++) ribbon[i] = map.track[i] && toCentre[i] <= half * 0.3 ? 1 : 0;
  const soft = await blur1(ribbon, mw, mh, 1);
  const band = new Uint8Array(mw * mh);
  for (let i = 0; i < band.length; i++) band[i] = soft[i] > 0.5 ? 1 : 0;
  // Different-coloured lines running side by side (e.g. Baku's old-town neck) stay apart: cut a
  // thin separator where they are about equally near.
  const perSector = [0, 1, 2].map((c) => distanceTo(cls.map((v) => (v === c ? 1 : 0)), mw, mh));
  for (let i = 0; i < band.length; i++) {
    if (!band[i]) continue;
    const d = perSector.map((D) => D[i]).sort((a, b) => a - b);
    if (d[1] <= half * 0.5 && d[1] - d[0] < 1.5) band[i] = 0;
  }
  for (const c of components(band, mw, mh, true)) if (c.length < 400 * scale) for (const p of c) band[p] = 0;
  // Fill pinholes (inside sector label text) so they don't become loops in the skeleton.
  for (const c of components(band.map((v) => 1 - v), mw, mh, false)) {
    const touchesEdge = c.some((p) => p % mw === 0 || p < mw || p % mw === mw - 1 || p >= mw * (mh - 1));
    if (!touchesEdge && c.length < 400 * scale * scale) for (const p of c) band[p] = 1;
  }
  await dump("1-band", [[map.track, [60, 60, 60]], [band, [255, 255, 255]]], mw, mh);

  /* centreline: thinned, spurs pruned, gaps joined into one loop */
  const centreline = (keepWhole) => {
    const sk = Uint8Array.from(band);
    thin(sk, mw, mh);
    tidy(sk, mw, mh);
    pruneSpurs(sk, mw, mh, 40 * scale, keepWhole);
    return { drawn: Uint8Array.from(sk), ...closeLoop(sk, mw, mh, map.track, toEdge, half, 0.9 * mw) };
  };
  // Pruning every short branch is right almost everywhere, but a short line piece cut off by a
  // crossing (Suzuka) has to be kept whole. Both are tried; the closed loop that runs along more
  // of the map's drawn centre line wins.
  const centrePx = [];
  for (let i = 0; i < mw * mh; i++) if (map.centre[i]) centrePx.push(i);
  const alongCentre = (t) => {
    const near = new Uint8Array(mw * mh);
    for (const [x, y] of t.pts) near[y * mw + x] = 1;
    const d = distanceTo(near, mw, mh);
    return centrePx.filter((i) => d[i] <= 3).length / centrePx.length;
  };
  const options = [centreline(false), centreline(true)].map((t) => ({ ...t, score: t.closed ? alongCentre(t) : -1 + t.coverage }));
  const traced = options[1].score > options[0].score + 0.005 ? options[1] : options[0];
  const { pts: rough, closed, sk: loopSk, coverage, drawn } = traced;
  const walked = new Uint8Array(mw * mh);
  for (const [x, y] of rough) walked[y * mw + x] = 1;
  await dump("3-trace", [[band, [60, 60, 60]], [loopSk, [255, 60, 60]], [walked, [255, 255, 255]]], mw, mh);
  if (!closed) throw new Error(`trace did not close (${Math.round(coverage * 100)}% of the line)`);
  if (coverage < 0.9) console.warn(`    trace covers ${Math.round(coverage * 100)}% of the line`);
  let pts = resampleClosed(smoothClosed(resampleClosed(smoothGaps(rough, drawn, map.track, mw, mh), 2), 5), 2);
  const N = pts.length;

  /* sectors, direction, start */
  let sectors = sectorsAlong(pts, cls, mw, mh, Math.round(7 * scale));
  if (sectors) {
    let fwd = 0, bwd = 0;
    for (let i = 0; i < N; i++) {
      const a = sectors[i], b = sectors[(i + 1) % N];
      if (a === b) continue;
      if (b === (a + 1) % 3) fwd++;
      else bwd++;
    }
    if (bwd > fwd) { pts.reverse(); sectors.reverse(); }
    let a0 = 0, bestRun = -1;
    for (let i = 0; i < N; i++) {
      if (sectors[i] !== 0 || sectors[(i - 1 + N) % N] !== 2) continue;
      let run = 0;
      while (run < N && sectors[(i + run) % N] === 0) run++;
      if (run > bestRun) { bestRun = run; a0 = i; }
    }
    pts = [...pts.slice(a0), ...pts.slice(0, a0)];
    sectors = [...sectors.slice(a0), ...sectors.slice(0, a0)];
  } else {
    if (!fallback) throw new Error("map has no sector colours and no fallback");
    const [fx, fy] = [fallback.start[0] * mw, fallback.start[1] * mh];
    let a0 = 0, bd = Infinity;
    pts.forEach(([x, y], i) => { const d = (x - fx) ** 2 + (y - fy) ** 2; if (d < bd) { bd = d; a0 = i; } });
    pts = [...pts.slice(a0), ...pts.slice(0, a0)];
    let area = 0;
    for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N]; area += a[0] * b[1] - b[0] * a[1]; }
    // y points down, so a positive shoelace area is clockwise on screen.
    if (area > 0 !== fallback.clockwise) pts = [pts[0], ...pts.slice(1).reverse()];
    sectors = pts.map((_, i) => (i / N < fallback.sectors[0] ? 0 : i / N < fallback.sectors[1] ? 1 : 2));
  }
  const tang = pts.map((_, i) => {
    const a = pts[(i - 3 + N) % N], b = pts[(i + 3) % N];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  });

  /* distance field to the centreline, with the nearest sample */
  const Rtube = 4.2 * scale, Rcore = 1.5 * scale;
  const pad = Math.ceil(60 * scale);
  const W = mw + pad * 2, H = mh + pad * 2;
  const P = pts.map(([x, y]) => [x + pad, y + pad]);
  const D = new Float32Array(W * H).fill(1e9);
  const ID = new Int32Array(W * H);
  const near = Math.ceil(40 * scale);
  for (let k = 0; k < N; k++) {
    const [cx, cy] = P[k];
    const y0 = Math.max(0, Math.floor(cy - near)), y1 = Math.min(H - 1, Math.ceil(cy + near));
    const x0 = Math.max(0, Math.floor(cx - near)), x1 = Math.min(W - 1, Math.ceil(cx + near));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const i = y * W + x;
      if (d < D[i]) { D[i] = d; ID[i] = k; }
    }
  }

  /* light sources: the sector-coloured tube, and white marks (chevrons, start line) */
  const tube = new Float32Array(W * H);
  const core = new Float32Array(W * H);
  const tint = [new Float32Array(W * H), new Float32Array(W * H), new Float32Array(W * H)];
  for (let i = 0; i < W * H; i++) {
    if (D[i] > Rtube + 1) continue;
    tube[i] = clamp01(Rtube - D[i] + 0.5);
    core[i] = clamp01(Rcore - D[i] + 0.5);
    const c = PALETTE[sectors[ID[i]]];
    for (let k = 0; k < 3; k++) tint[k][i] = (c[k] / 255) * tube[i];
  }
  const marks = new Float32Array(W * H);
  const stroke = (ax, ay, bx, by, thick) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - thick)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + thick));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - thick)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + thick));
    const vx = bx - ax, vy = by - ay, vl = vx * vx + vy * vy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = clamp01(((x - ax) * vx + (y - ay) * vy) / vl);
      const d = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
      const i = y * W + x;
      marks[i] = Math.max(marks[i], clamp01(thick / 2 - d + 0.5));
    }
  };

  /* direction chevrons beside the tube, evenly spaced, skipping tight corners */
  const spacing = Math.round((130 * scale) / 2);
  const bend = (k) => tang[k][0] * tang[(k + 6) % N][0] + tang[k][1] * tang[(k + 6) % N][1];
  const off = Rtube + 9 * scale;
  for (let k = Math.round(spacing * 0.75); k < N - spacing * 0.4; k += spacing) {
    let kk = k;
    for (let d = 0; d < spacing / 3 && bend(kk) < 0.93; d++) kk = (k + d) % N;
    if (bend(kk) < 0.85) continue;
    const [tx, ty] = tang[kk];
    const nx = -ty, ny = tx;
    // On whichever side is clear of other track.
    const clear = (s) => {
      const x = Math.round(P[kk][0] + nx * s * off * 1.6), y = Math.round(P[kk][1] + ny * s * off * 1.6);
      return x < 0 || y < 0 || x >= W || y >= H ? 1e9 : D[y * W + x];
    };
    const s = clear(1) >= clear(-1) ? 1 : -1;
    if (clear(s) < off) continue;
    const px = P[kk][0] + nx * s * off, py = P[kk][1] + ny * s * off;
    const tip = [px + tx * 4 * scale, py + ty * 4 * scale];
    for (const sgn of [1, -1]) stroke(...tip, px - tx * 3.5 * scale + nx * sgn * 5 * scale, py - ty * 3.5 * scale + ny * sgn * 5 * scale, 2.2 * scale);
  }

  /* start / finish: a white bar across the line at sample 0 */
  const [sx, sy] = P[0], [stx, sty] = tang[0];
  const snx = -sty, sny = stx;
  const across = Rtube + 8 * scale;
  stroke(sx - snx * across, sy - sny * across, sx + snx * across, sy + sny * across, 2.6 * scale);

  /* glow: the tube's colour and the marks' white, blurred wide and close */
  const wide = 11 * scale, close = 3.5 * scale;
  const glowA = [gblur(tube, W, H, wide), gblur(tube, W, H, close)];
  const glowC = tint.map((ch) => [gblur(ch, W, H, wide), gblur(ch, W, H, close)]);
  const markGlow = gblur(marks, W, H, 3 * scale);
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    // Premultiplied light, added up: wide haze, close glow, the tube, a near-white core, marks.
    const wA = glowA[0][i] * 0.75, cA = glowA[1][i] * 0.9, mA = markGlow[i] * 0.6;
    let a = 0;
    const rgb = [0, 0, 0];
    const add = (r, g, b, alpha) => { rgb[0] += r * alpha; rgb[1] += g * alpha; rgb[2] += b * alpha; a += alpha; };
    for (let k = 0; k < 3; k++) rgb[k] += glowC[k][0][i] * 0.75 + glowC[k][1][i] * 0.9;
    a += wA + cA;
    if (tube[i] > 0) {
      const c = PALETTE[sectors[ID[i]]].map((v) => v / 255);
      const hot = c.map((v) => v * 0.45 + 0.55);
      const t = tube[i] * (1 - core[i]), k2 = core[i];
      add(c[0], c[1], c[2], t);
      add(hot[0], hot[1], hot[2], k2);
    }
    add(1, 1, 1, mA + marks[i]);
    const alpha = clamp01(a);
    const scaleOut = a > 0 ? 1 / Math.max(a, alpha) : 0;
    for (let k = 0; k < 3; k++) buf[i * 4 + k] = Math.round(clamp01(rgb[k] * scaleOut) * 255);
    buf[i * 4 + 3] = Math.round(alpha * 255);
  }

  /* START label on the side of the line with more free space, white with a soft glow */
  const free = (sd) => {
    let sum = 0;
    for (let t = 1; t <= 6; t++) {
      const d = across + t * 8 * scale;
      const x = Math.round(sx + snx * sd * d), y = Math.round(sy + sny * sd * d);
      sum += x < 0 || y < 0 || x >= W || y >= H ? 0 : Math.min(60, D[y * W + x]);
    }
    return sum;
  };
  const side = free(1) >= free(-1) ? 1 : -1;
  const fs = 18 * scale;
  const lx = sx + snx * side * (across + 6 * scale), ly = sy + sny * side * (across + 6 * scale) + fs * 0.35;
  const anchor = snx * side > 0.45 ? "start" : snx * side < -0.45 ? "end" : "middle";
  const ty = sny * side > 0.45 ? fs * 0.45 : sny * side < -0.45 ? -fs * 0.2 : 0;
  const text = (extra) =>
    `<text x="${lx.toFixed(1)}" y="${(ly + ty).toFixed(1)}" font-family="Arial Black, Impact, Helvetica, sans-serif" font-weight="900" font-size="${fs.toFixed(1)}" letter-spacing="${(1.6 * scale).toFixed(1)}" text-anchor="${anchor}" fill="#fff" ${extra}>START</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(3 * scale).toFixed(1)}"/></filter>${text('filter="url(#g)" opacity="0.7"')}${text("")}</svg>`;

  const png = await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
  return sharp(png).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

