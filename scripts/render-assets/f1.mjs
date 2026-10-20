// Bundles official formula1.com imagery for the app: team car profiles unedited, driver
// portraits (head and shoulders) as single-ink riso-style prints in the team colour, and
// circuits as one clean sector-coloured line traced from the official map, all on transparent backgrounds. Writes assets/f1 and
// src/lib/f1art.generated.ts. Usage: npm install && node f1.mjs [--only=cars,drivers,tracks] [--sample]
//
// NOTE: these images belong to Formula One / the teams. Fine for a personal build, not for store release.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { blur1, makeRng } from "./imaging.mjs";
import { drawTrack } from "./track.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const out = join(root, "assets/f1");
const cache = join(here, ".cache/f1");
const args = process.argv.slice(2);
const sample = args.includes("--sample");
const only = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? "cars,drivers,tracks").split(",");

const CDN = "https://media.formula1.com/image/upload";
const VERSION = "v1740000001";
const SEASON = "2026";

/* Team colours come from the app source; CDN slugs and circuit slugs are F1's. */
const assetsSrc = readFileSync(join(root, "src/lib/assets.ts"), "utf8");
const teams = Object.fromEntries(
  [...assetsSrc.matchAll(/^\s+(\w+): \{ shortName: "[^"]*", color: "(#\w+)", secondary: "(#\w+)", accent: "(#\w+)" \}/gm)].map(
    ([, id, primary, secondary, accent]) => [id, { primary, secondary, accent }],
  ),
);
const TEAM_SLUGS = {
  mercedes: "mercedes", ferrari: "ferrari", red_bull: "redbullracing", mclaren: "mclaren", rb: "racingbulls", alpine: "alpine",
  haas: "haasf1team", audi: "audi", sauber: "audi", aston_martin: "astonmartin", williams: "williams", cadillac: "cadillac",
};
const TRACK_SLUGS = {
  albert_park: "melbourne", shanghai: "shanghai", suzuka: "suzuka", bahrain: "sakhir", jeddah: "jeddah", miami: "miami",
  imola: "imola", villeneuve: "montreal", monaco: "montecarlo", catalunya: "catalunya", madring: "madring",
  red_bull_ring: "spielberg", silverstone: "silverstone", spa: "spafrancorchamps", hungaroring: "hungaroring",
  zandvoort: "zandvoort", monza: "monza", baku: "baku", marina_bay: "singapore", americas: "austin",
  rodriguez: "mexicocity", interlagos: "interlagos", vegas: "lasvegas", losail: "lusail", yas_marina: "yasmarinacircuit",
};
/* Maps drawn without sector colours: start line (chequered mark on the map), direction, sector splits. */
const TRACK_FALLBACKS = {
  bahrain: { start: [0.6, 0.934], clockwise: true, sectors: [0.3, 0.66] },
};

const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();

async function currentDrivers() {
  const api = "https://api.jolpi.ca/ergast/f1";
  const [standings, last] = await Promise.all([
    fetch(`${api}/current/driverstandings.json?limit=100`).then((r) => r.json()),
    fetch(`${api}/current/last/results.json?limit=100`).then((r) => r.json()),
  ]);
  const teamOf = Object.fromEntries((last.MRData.RaceTable.Races[0]?.Results ?? []).map((r) => [r.Driver.driverId, r.Constructor.constructorId]));
  return standings.MRData.StandingsTable.StandingsLists[0].DriverStandings.map(({ Driver: d, Constructors }) => ({
    id: d.driverId,
    number: d.permanentNumber,
    ref: `${strip(d.givenName).slice(0, 3)}${strip(d.familyName).slice(0, 3)}01`,
    team: teamOf[d.driverId] ?? Constructors.at(-1).constructorId,
  }));
}

/** Downloads once into .cache; returns the bytes, or null if F1 doesn't have the file. */
async function fetchCached(name, urls) {
  const file = join(cache, name);
  if (existsSync(file)) return readFileSync(file);
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
    return buf;
  }
  return null;
}

/* ---------- driver framing ---------- */

/**
 * Crops a full-length portrait to head and shoulders. The portraits are standing
 * shots, so the frame follows fixed proportions of the figure's height.
 */
async function bust(portrait) {
  const { data, info } = await sharp(portrait).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const span = (y) => {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) { if (x0 < 0) x0 = x; x1 = x; }
    return x0 < 0 ? null : { x0, x1 };
  };
  let top = 0;
  while (top < h && !span(top)) top++;
  let bottom = h - 1;
  while (bottom > top && !span(bottom)) bottom--;
  const H = bottom - top;
  const headRow = span(top + Math.round(H * 0.06));
  const cx = headRow ? (headRow.x0 + headRow.x1) / 2 : w / 2;
  const frameTop = Math.max(0, top - 8);
  const frameH = Math.round(H * 0.34);
  const frameW = Math.min(w, Math.round(frameH * 0.9));
  const frameLeft = Math.max(0, Math.min(w - frameW, Math.round(cx - frameW / 2)));
  return sharp(portrait).extract({ left: frameLeft, top: frameTop, width: frameW, height: frameH }).png().toBuffer();
}

/* ---------- driver: single-ink print ---------- */

const { gauss } = makeRng(16);

/** Team colour as a print ink: very light colours are darkened so they read on paper. */
function inkFor(hexColor) {
  let [r, g, b] = hex(hexColor);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const k = lum > 0.42 ? 0.42 / lum : 1;
  return [r * k, g * k, b * k].map(Math.round);
}

/**
 * Riso-style single-ink print of a portrait: lightness becomes ink density (light areas are
 * left as paper, i.e. transparent), sharpened, with seeded print grain. Output is the ink
 * colour with alpha = ink, so the background shows through wherever there's no ink.
 */
async function risoPrint(portrait, inkHex, width) {
  const { data, info } = await sharp(portrait).resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  const soft = await blur1(lum, w, h, 0.6);
  const wide = await blur1(lum, w, h, 3);
  const local = await blur1(lum, w, h, Math.max(6, w / 45));
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = gauss();
  const grainA = await blur1(noise, w, h, 0.75, { scale: 40, offset: 128 });
  for (let i = 0; i < n; i++) noise[i] = gauss();
  const grainB = await blur1(noise, w, h, 0.7, { scale: 40, offset: 128 });
  const [ir, ig, ib] = inkFor(inkHex);
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    // Sharpen, then add local contrast so features survive in uniformly dark areas
    // (darker skin tones, dark suits) instead of flooding to solid ink.
    const sharpened = soft[i] * 1.6 - wide[i] * 0.6 + (soft[i] - local[i]) * 1.6 + (0.5 - local[i]) * 0.35;
    const dens = Math.max(0, Math.min(1, (0.9 - sharpened) / 0.75)) ** 0.85;
    let a = Math.max(0, Math.min(1, (dens + grainA[i] * 0.2 - 0.06) * 1.55)) * (data[i * 4 + 3] / 255);
    a = a * 0.92 + a * 0.08 * Math.max(0, Math.min(1, grainB[i] * 0.6 + 0.6)) - (grainB[i] < -1.6 ? a * 0.6 : 0);
    out[i * 4] = ir;
    out[i * 4 + 1] = ig;
    out[i * 4 + 2] = ib;
    out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/* ---------- output ---------- */

const MAX_WIDTH = { cars: 1080, drivers: 520, tracks: 1000 };
const ratios = {};
const manifest = { cars: [], drivers: [], tracks: [] };

async function save(dir, name, png) {
  mkdirSync(join(out, dir), { recursive: true });
  // Tracks are flat colour with smooth edges: full-colour PNG, as palette dithering adds grain.
  const encode = dir === "tracks" ? { compressionLevel: 9 } : { palette: true, quality: 95, effort: 10, dither: 0.6 };
  const buf = await sharp(png).resize({ width: MAX_WIDTH[dir], withoutEnlargement: true }).png(encode).toBuffer();
  writeFileSync(join(out, dir, `${name}.png`), buf);
  const { width, height } = await sharp(buf).metadata();
  ratios[`${dir}/${name}`] = Math.round((width / height) * 1000) / 1000;
  manifest[dir].push(name);
  console.log(`  ${dir}/${name}.png ${(buf.length / 1024).toFixed(0)} KB`);
}

if (only.includes("cars")) {
  console.log("cars");
  for (const [id, slug] of Object.entries(TEAM_SLUGS).slice(0, sample ? 2 : undefined)) {
    if (!teams[id]) continue;
    const src = await fetchCached(`cars/${id}.webp`, [`${CDN}/c_fit,w_1600/q_auto/${VERSION}/common/f1/${SEASON}/${slug}/${SEASON}${slug}carright.webp`]);
    if (!src) { console.warn(`  no car for ${id}`); continue; }
    await save("cars", id, await sharp(src).trim().png().toBuffer());
  }
}

if (only.includes("drivers")) {
  console.log("drivers");
  for (const d of (await currentDrivers()).slice(0, sample ? 3 : undefined)) {
    const team = teams[d.team];
    if (!team) continue;
    // Try the driver's current team first, then any team (mid-season swaps lag on the CDN).
    const slugs = [TEAM_SLUGS[d.team], ...new Set(Object.values(TEAM_SLUGS))];
    const src = await fetchCached(
      `drivers/${d.id}-right.webp`,
      slugs.map((s) => `${CDN}/c_fit,w_900/q_auto/${VERSION}/common/f1/${SEASON}/${s}/${d.ref}/${SEASON}${s}${d.ref}right.webp`),
    );
    if (!src) { console.warn(`  no portrait for ${d.id}`); continue; }
    await save("drivers", d.id, await risoPrint(await bust(src), team.primary, MAX_WIDTH.drivers));
  }
}

if (only.includes("tracks")) {
  console.log("tracks");
  for (const [id, slug] of Object.entries(TRACK_SLUGS).slice(0, sample ? 2 : undefined)) {
    const src = await fetchCached(`tracks/${id}.webp`, [`${CDN}/c_fit,w_1400/q_auto/${VERSION}/common/f1/${SEASON}/track/${SEASON}track${slug}detailed.webp`]);
    if (!src) { console.warn(`  no map for ${id}`); continue; }
    try {
      await save("tracks", id, await drawTrack(src, { fallback: TRACK_FALLBACKS[id] }));
    } catch (e) {
      console.warn(`  ${id}: ${e.message}`);
    }
  }
}

if (!sample && only.length === 3) {
  const req = (dir, name) => `  ${JSON.stringify(name)}: require("../../assets/f1/${dir}/${name}.png"),`;
  const ts = `// Generated by scripts/render-assets/f1.mjs – do not edit by hand.
// Official formula1.com imagery, unedited (personal builds only: Formula One / team rights apply).
import type { ImageSourcePropType } from "react-native";

export const F1_CARS: Record<string, ImageSourcePropType> = {
${manifest.cars.map((n) => req("cars", n)).join("\n")}
};

/** Driver portraits as single-ink prints in the team colour (transparent), keyed by driverId. */
export const F1_DRIVERS: Record<string, ImageSourcePropType> = {
${manifest.drivers.map((n) => req("drivers", n)).join("\n")}
};

export const F1_TRACKS: Record<string, ImageSourcePropType> = {
${manifest.tracks.map((n) => req("tracks", n)).join("\n")}
};

/** Width / height of each image, keyed "dir/name". */
export const F1_RATIOS: Record<string, number> = ${JSON.stringify(ratios, null, 2)};
`;
  writeFileSync(join(root, "src/lib/f1art.generated.ts"), ts);
}
