// Renders the app's artwork to transparent PNGs in assets/renders and writes
// src/lib/renders.generated.ts. Usage: npm install && node render.mjs [--only=cars,helmets,tracks,flag] [--sample]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const out = join(root, "assets/renders");
const args = process.argv.slice(2);
const sample = args.includes("--sample");
const only = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? "cars,helmets,tracks,flag").split(",");

/* Team liveries and circuit shapes come straight from the app source. */
const assetsSrc = readFileSync(join(root, "src/lib/assets.ts"), "utf8");
const teams = Object.fromEntries(
  [...assetsSrc.matchAll(/^\s+(\w+): \{ shortName: "[^"]*", color: "(#\w+)", secondary: "(#\w+)", accent: "(#\w+)" \}/gm)].map(
    ([, id, primary, secondary, accent]) => [id, { primary, secondary, accent }],
  ),
);
const { tracks } = JSON.parse(readFileSync(join(here, "tracks.generated.json"), "utf8"));

/* Current drivers (number + team) for numbered helmets. */
async function currentDrivers() {
  const api = "https://api.jolpi.ca/ergast/f1";
  const [standings, last] = await Promise.all([
    fetch(`${api}/current/driverstandings.json?limit=100`).then((r) => r.json()),
    fetch(`${api}/current/last/results.json?limit=100`).then((r) => r.json()),
  ]);
  const teamOf = Object.fromEntries((last.MRData.RaceTable.Races[0]?.Results ?? []).map((r) => [r.Driver.driverId, r.Constructor.constructorId]));
  return standings.MRData.StandingsTable.StandingsLists[0].DriverStandings.map((s) => ({
    id: s.Driver.driverId,
    number: s.Driver.permanentNumber,
    team: teamOf[s.Driver.driverId] ?? s.Constructors.at(-1).constructorId,
  }));
}

const bundle = await build({ entryPoints: [join(here, "scene.js")], bundle: true, format: "iife", write: false, minify: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.setContent('<html><body style="margin:0"><canvas id="c"></canvas></body></html>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.waitForFunction(() => window.ready === true);

/** Max width per asset type – the largest size the UI draws them at, at 2–3× density. */
const MAX_WIDTH = { cars: 1080, helmets: 420, tracks: 900, misc: 1100 };

const save = async (dir, name, dataUrl) => {
  mkdirSync(join(out, dir), { recursive: true });
  // Resize to what the UI needs, then palette-quantise: transparent renders compress ~5×.
  const png = await sharp(Buffer.from(dataUrl.split(",")[1], "base64"))
    .resize({ width: MAX_WIDTH[dir], withoutEnlargement: true })
    .png({ palette: true, quality: 88, effort: 10 })
    .toBuffer();
  writeFileSync(join(out, dir, `${name}.png`), png);
  const { width, height } = await sharp(png).metadata();
  ratios[`${dir}/${name}`] = Math.round((width / height) * 1000) / 1000;
  console.log(`  ${dir}/${name}.png ${(png.length / 1024).toFixed(0)} KB`);
};
const ratios = {};

const manifest = { cars: [], helmets: [], tracks: [], flag: false };

if (only.includes("cars")) {
  console.log("cars");
  for (const [id, livery] of Object.entries(teams).slice(0, sample ? 2 : undefined)) {
    await save("cars", id, await page.evaluate((l) => window.renderCar(l), livery));
    manifest.cars.push(id);
  }
}
if (only.includes("helmets")) {
  console.log("helmets");
  for (const [id, livery] of Object.entries(teams).slice(0, sample ? 1 : undefined)) {
    await save("helmets", `team-${id}`, await page.evaluate((l) => window.renderHelmet(l), livery));
    manifest.helmets.push(`team-${id}`);
  }
  for (const d of (await currentDrivers()).slice(0, sample ? 2 : undefined)) {
    const livery = teams[d.team];
    if (!livery) continue;
    await save("helmets", d.id, await page.evaluate((l) => window.renderHelmet(l), { ...livery, number: d.number }));
    manifest.helmets.push(d.id);
  }
}
if (only.includes("tracks")) {
  console.log("tracks");
  for (const [id, shape] of Object.entries(tracks).slice(0, sample ? 2 : undefined)) {
    await save("tracks", id, await page.evaluate((s) => window.renderTrack(s), shape));
    manifest.tracks.push(id);
  }
}
if (only.includes("flag")) {
  console.log("flag");
  await save("misc", "flag", await page.evaluate(() => window.renderFlag()));
  manifest.flag = true;
}
await browser.close();

if (!sample) {
  const req = (dir, name) => `  ${JSON.stringify(name)}: require("../../assets/renders/${dir}/${name}.png"),`;
  const ts = `// Generated by scripts/render-assets/render.mjs – do not edit by hand.
// Original 3D renders produced from procedural models in scripts/render-assets/scene.js.
import type { ImageSourcePropType } from "react-native";

export const CAR_RENDERS: Record<string, ImageSourcePropType> = {
${manifest.cars.map((n) => req("cars", n)).join("\n")}
};

/** Keyed by driverId, plus "team-<constructorId>" fallbacks without a number. */
export const HELMET_RENDERS: Record<string, ImageSourcePropType> = {
${manifest.helmets.map((n) => req("helmets", n)).join("\n")}
};

export const TRACK_RENDERS: Record<string, ImageSourcePropType> = {
${manifest.tracks.map((n) => req("tracks", n)).join("\n")}
};

export const FLAG_RENDER: ImageSourcePropType = require("../../assets/renders/misc/flag.png");

/** Width / height of each render, keyed "dir/name", so layouts can reserve space. */
export const RENDER_RATIOS: Record<string, number> = ${JSON.stringify(ratios, null, 2)};
`;
  if (only.length === 4) writeFileSync(join(root, "src/lib/renders.generated.ts"), ts);
}
