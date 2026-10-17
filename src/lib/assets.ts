import type { Driver } from "../api/types";

// Imagery is served from the formula1.com media CDN (Cloudinary). Paths follow a
// stable per-season scheme, so they are derived from Jolpica ids rather than scraped
// at runtime. `d_` transforms make Cloudinary fall back to a silhouette if a path is missing.
const CDN = "https://media.formula1.com/image/upload";
const VERSION = "v1740000001";
export const ASSET_SEASON = "2026";

interface TeamMeta {
  slug: string;
  shortName: string;
  color: string;
}

const TEAMS: Record<string, TeamMeta> = {
  mercedes: { slug: "mercedes", shortName: "Mercedes", color: "#00D7B6" },
  ferrari: { slug: "ferrari", shortName: "Ferrari", color: "#ED1131" },
  red_bull: { slug: "redbullracing", shortName: "Red Bull", color: "#4781D7" },
  mclaren: { slug: "mclaren", shortName: "McLaren", color: "#F47600" },
  rb: { slug: "racingbulls", shortName: "Racing Bulls", color: "#6C98FF" },
  alpine: { slug: "alpine", shortName: "Alpine", color: "#00A1E8" },
  haas: { slug: "haasf1team", shortName: "Haas", color: "#9C9FA2" },
  audi: { slug: "audi", shortName: "Audi", color: "#F50537" },
  sauber: { slug: "audi", shortName: "Sauber", color: "#52E252" },
  aston_martin: { slug: "astonmartin", shortName: "Aston Martin", color: "#229971" },
  williams: { slug: "williams", shortName: "Williams", color: "#1868DB" },
  cadillac: { slug: "cadillac", shortName: "Cadillac", color: "#909090" },
};

const FALLBACK_TEAM: TeamMeta = { slug: "", shortName: "", color: "#62626E" };

export const teamMeta = (constructorId?: string): TeamMeta =>
  (constructorId && TEAMS[constructorId]) || FALLBACK_TEAM;

export const teamColor = (constructorId?: string) => teamMeta(constructorId).color;

export function teamLogo(constructorId: string) {
  const { slug } = teamMeta(constructorId);
  if (!slug) return undefined;
  return `${CDN}/c_fit,h_96/q_auto/${VERSION}/common/f1/${ASSET_SEASON}/${slug}/${ASSET_SEASON}${slug}logowhite.webp`;
}

export function teamCar(constructorId: string, width = 800) {
  const { slug } = teamMeta(constructorId);
  if (!slug) return undefined;
  return `${CDN}/c_fit,w_${width}/q_auto/${VERSION}/common/f1/${ASSET_SEASON}/${slug}/${ASSET_SEASON}${slug}carright.webp`;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();

/** F1's driver reference, e.g. Max Verstappen -> "maxver01". */
const driverRef = (driver: Driver) =>
  `${strip(driver.givenName).slice(0, 3)}${strip(driver.familyName).slice(0, 3)}01`;

export function driverHeadshot(driver: Driver, constructorId: string, width = 440) {
  const { slug } = teamMeta(constructorId);
  const fallback = `d_common:f1:${ASSET_SEASON}:fallback:driver:${ASSET_SEASON}fallbackdriverright.webp`;
  const ref = driverRef(driver);
  return `${CDN}/c_lfill,w_${width}/q_auto/${fallback}/${VERSION}/common/f1/${ASSET_SEASON}/${slug || "fallback"}/${ref}/${ASSET_SEASON}${slug}${ref}right.webp`;
}

// Jolpica circuitId -> F1 CDN track slug.
const TRACKS: Record<string, string> = {
  albert_park: "melbourne",
  shanghai: "shanghai",
  suzuka: "suzuka",
  bahrain: "sakhir",
  jeddah: "jeddah",
  miami: "miami",
  imola: "imola",
  villeneuve: "montreal",
  monaco: "montecarlo",
  catalunya: "catalunya",
  madring: "madring",
  red_bull_ring: "spielberg",
  silverstone: "silverstone",
  spa: "spafrancorchamps",
  hungaroring: "hungaroring",
  zandvoort: "zandvoort",
  monza: "monza",
  baku: "baku",
  sepang: "kualalumpur",
  marina_bay: "singapore",
  americas: "austin",
  rodriguez: "mexicocity",
  interlagos: "interlagos",
  vegas: "lasvegas",
  losail: "lusail",
  yas_marina: "yasmarinacircuit",
};

/** Minimal white outline, good for list thumbnails on dark surfaces. */
export function trackOutline(circuitId: string) {
  const slug = TRACKS[circuitId];
  if (!slug) return undefined;
  return `${CDN}/${VERSION}/common/f1/${ASSET_SEASON}/track/${ASSET_SEASON}track${slug}whiteoutline.svg`;
}

/** Annotated map with corner numbers and DRS zones. */
export function trackDetailed(circuitId: string, width = 1000) {
  const slug = TRACKS[circuitId];
  if (!slug) return undefined;
  return `${CDN}/c_fit,w_${width}/q_auto/${VERSION}/common/f1/${ASSET_SEASON}/track/${ASSET_SEASON}track${slug}detailed.webp`;
}

const COUNTRY_CODES: Record<string, string> = {
  Australia: "AU", China: "CN", Japan: "JP", Bahrain: "BH", "Saudi Arabia": "SA", USA: "US",
  "United States": "US", Italy: "IT", Monaco: "MC", Canada: "CA", Spain: "ES", Austria: "AT",
  UK: "GB", "United Kingdom": "GB", Belgium: "BE", Hungary: "HU", Netherlands: "NL",
  Azerbaijan: "AZ", Singapore: "SG", Malaysia: "MY", Mexico: "MX", Brazil: "BR", Qatar: "QA",
  UAE: "AE", "United Arab Emirates": "AE", Portugal: "PT", France: "FR", Germany: "DE",
};

const NATIONALITY_CODES: Record<string, string> = {
  Italian: "IT", British: "GB", Dutch: "NL", Monegasque: "MC", Australian: "AU", French: "FR",
  Argentine: "AR", Argentinian: "AR", "New Zealander": "NZ", Thai: "TH", German: "DE",
  Brazilian: "BR", Spanish: "ES", Canadian: "CA", Japanese: "JP", Finnish: "FI", Mexican: "MX",
  Swedish: "SE", Danish: "DK", Chinese: "CN", American: "US", Austrian: "AT", Swiss: "CH",
  Belgian: "BE", Polish: "PL", Russian: "RU", Indian: "IN", Estonian: "EE",
};

const toFlag = (iso?: string) =>
  iso ? String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "";

export const countryFlag = (country: string) => toFlag(COUNTRY_CODES[country]);
export const nationalityFlag = (nationality: string) => toFlag(NATIONALITY_CODES[nationality]);
