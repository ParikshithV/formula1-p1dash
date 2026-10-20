// Team colours and liveries: used for UI accents and by the 3D fallback renders
// (scripts/render-assets). Official F1 artwork lives in assets/f1.

interface TeamMeta {
  shortName: string;
  /** Primary livery colour; also the team swatch across the UI. */
  color: string;
  /** Secondary livery colour (wings, stripes). */
  secondary: string;
  /** Small accent details (helmet number, highlights). */
  accent: string;
}

const TEAMS: Record<string, TeamMeta> = {
  mercedes: { shortName: "Mercedes", color: "#00D7B6", secondary: "#0A0A0A", accent: "#C8CCCE" },
  ferrari: { shortName: "Ferrari", color: "#ED1131", secondary: "#FFE200", accent: "#111111" },
  red_bull: { shortName: "Red Bull", color: "#4781D7", secondary: "#13213F", accent: "#FFD200" },
  mclaren: { shortName: "McLaren", color: "#F47600", secondary: "#111111", accent: "#4BC8F4" },
  rb: { shortName: "Racing Bulls", color: "#6C98FF", secondary: "#FFFFFF", accent: "#E10600" },
  alpine: { shortName: "Alpine", color: "#00A1E8", secondary: "#FF87BC", accent: "#0A0A0A" },
  haas: { shortName: "Haas", color: "#9C9FA2", secondary: "#E10600", accent: "#111111" },
  audi: { shortName: "Audi", color: "#F50537", secondary: "#1C1C1C", accent: "#C0C0C0" },
  sauber: { shortName: "Sauber", color: "#52E252", secondary: "#111111", accent: "#FFFFFF" },
  aston_martin: { shortName: "Aston Martin", color: "#229971", secondary: "#CEDC00", accent: "#0A0A0A" },
  williams: { shortName: "Williams", color: "#1868DB", secondary: "#0A1A3A", accent: "#FFFFFF" },
  cadillac: { shortName: "Cadillac", color: "#909090", secondary: "#111111", accent: "#E8C547" },
};

const FALLBACK_TEAM: TeamMeta = { shortName: "", color: "#62626E", secondary: "#2A2A2A", accent: "#CCCCCC" };

export const teamMeta = (constructorId?: string): TeamMeta =>
  (constructorId && TEAMS[constructorId]) || FALLBACK_TEAM;

export const teamColor = (constructorId?: string) => teamMeta(constructorId).color;

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
