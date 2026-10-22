// Generates scripts/render-assets/tracks.generated.json from bacinger/f1-circuits (MIT
// licence): normalised circuit outlines that render-assets turns into 3D track renders.
// Run: node scripts/build-tracks.mjs
import { writeFileSync } from "node:fs";

const SOURCE = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson";
const OUT = new URL("./render-assets/tracks.generated.json", import.meta.url);
const SIZE = 1000; // longest side of the normalised drawing
const TOLERANCE = 2; // simplification tolerance in drawing units

// Jolpica/Ergast circuitId -> bacinger feature id.
const IDS = {
  albert_park: "au-1953",
  bahrain: "bh-2002",
  shanghai: "cn-2004",
  catalunya: "es-1991",
  monaco: "mc-1929",
  villeneuve: "ca-1978",
  ricard: "fr-1969",
  red_bull_ring: "at-1969",
  silverstone: "gb-1948",
  hockenheimring: "de-1932",
  hungaroring: "hu-1986",
  spa: "be-1925",
  monza: "it-1922",
  marina_bay: "sg-2008",
  sochi: "ru-2014",
  suzuka: "jp-1962",
  americas: "us-2012",
  rodriguez: "mx-1962",
  interlagos: "br-1940",
  yas_marina: "ae-2009",
  imola: "it-1953",
  nurburgring: "de-1927",
  portimao: "pt-2008",
  mugello: "it-1914",
  sepang: "my-1999",
  istanbul: "tr-2005",
  zandvoort: "nl-1948",
  magny_cours: "fr-1960",
  estoril: "pt-1972",
  jacarepagua: "br-1977",
  jeddah: "sa-2021",
  miami: "us-2022",
  losail: "qa-2004",
  madring: "es-2026",
  baku: "az-2016",
  vegas: "us-2023",
  indianapolis: "us-1909",
  galvez: "ar-1952",
  kyalami: "za-1961",
  watkins_glen: "us-1956",
};

/** Ramer–Douglas–Peucker line simplification. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

/** Closed loops start and end on the same point, so split at the farthest point first. */
function simplifyLoop(points, tolerance) {
  const [sx, sy] = points[0];
  let far = 1;
  points.forEach(([x, y], i) => {
    if (Math.hypot(x - sx, y - sy) > Math.hypot(points[far][0] - sx, points[far][1] - sy)) far = i;
  });
  return [...simplify(points.slice(0, far + 1), tolerance).slice(0, -1), ...simplify(points.slice(far), tolerance)];
}

const geo = await (await fetch(SOURCE)).json();
const byId = Object.fromEntries(geo.features.map((f) => [f.properties.id, f]));
const round = (n) => Math.round(n * 10) / 10;

const tracks = {};
for (const [circuitId, featureId] of Object.entries(IDS)) {
  const feature = byId[featureId];
  if (!feature) throw new Error(`Missing ${featureId}`);
  const coords = feature.geometry.coordinates;
  // Equirectangular projection, corrected for latitude so shapes keep their proportions.
  const lat0 = (coords.reduce((s, c) => s + c[1], 0) / coords.length) * (Math.PI / 180);
  const projected = coords.map(([lon, lat]) => [lon * Math.cos(lat0), -lat]);
  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = SIZE / Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  const points = simplifyLoop(
    projected.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]),
    TOLERANCE,
  ).map(([x, y]) => [round(x), round(y)]);
  const w = Math.ceil(Math.max(...points.map((p) => p[0])));
  const h = Math.ceil(Math.max(...points.map((p) => p[1])));
  const closed = [...points, points[0]];
  const len = Math.ceil(closed.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - closed[i][0], y - closed[i][1]), 0));
  const d = `M${points.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
  // The source lines begin at the start/finish line; the next point gives race direction.
  tracks[circuitId] = { w, h, d, len, start: points[0], next: points[1] };
}

const body = JSON.stringify(
  { source: "bacinger/f1-circuits (MIT licence)", size: SIZE, tracks },
  null,
  1,
);
writeFileSync(OUT, body);
console.log(`Wrote ${Object.keys(tracks).length} tracks, ${(body.length / 1024).toFixed(1)} KB`);
