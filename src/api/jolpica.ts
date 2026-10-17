import type {
  ConstructorStanding,
  DriverStanding,
  QualifyingResult,
  Race,
  RaceResult,
} from "./types";

// Jolpica is the community-maintained successor to the Ergast API. Unlike the
// previous eCal ICS subscription (a rolling window of upcoming events only), it
// returns the whole season, so completed rounds and their results are available.
const BASE_URL = "https://api.jolpi.ca/ergast/f1";

export type Season = "current" | `${number}`;

interface RaceTableResponse<T> {
  MRData: { RaceTable: { season: string; Races: (Race & T)[] } };
}

interface StandingsResponse<T> {
  MRData: { StandingsTable: { StandingsLists: ({ season: string; round: string } & T)[] } };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Jolpica ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchSchedule(season: Season = "current"): Promise<Race[]> {
  const data = await get<RaceTableResponse<object>>(`${season}.json?limit=100`);
  return data.MRData.RaceTable.Races;
}

/** Results for a single finishing position across every completed round. */
async function fetchResultsAtPosition(season: Season, position: number) {
  const data = await get<RaceTableResponse<{ Results: RaceResult[] }>>(
    `${season}/results/${position}.json?limit=100`,
  );
  return data.MRData.RaceTable.Races;
}

export type PodiumsByRound = Record<string, RaceResult[]>;

/** Top-three finishers keyed by round. Three small requests instead of paging every result row. */
export async function fetchSeasonPodiums(season: Season = "current"): Promise<PodiumsByRound> {
  const positions = await Promise.all([1, 2, 3].map((p) => fetchResultsAtPosition(season, p)));
  const podiums: PodiumsByRound = {};
  for (const races of positions) {
    for (const race of races) {
      (podiums[race.round] ??= []).push(...race.Results);
    }
  }
  return podiums;
}

export async function fetchRaceResults(season: Season, round: string): Promise<RaceResult[]> {
  const data = await get<RaceTableResponse<{ Results: RaceResult[] }>>(
    `${season}/${round}/results.json?limit=100`,
  );
  return data.MRData.RaceTable.Races[0]?.Results ?? [];
}

export async function fetchSprintResults(season: Season, round: string): Promise<RaceResult[]> {
  const data = await get<RaceTableResponse<{ SprintResults: RaceResult[] }>>(
    `${season}/${round}/sprint.json?limit=100`,
  );
  return data.MRData.RaceTable.Races[0]?.SprintResults ?? [];
}

export async function fetchQualifying(season: Season, round: string): Promise<QualifyingResult[]> {
  const data = await get<RaceTableResponse<{ QualifyingResults: QualifyingResult[] }>>(
    `${season}/${round}/qualifying.json?limit=100`,
  );
  return data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
}

export async function fetchDriverStandings(season: Season = "current") {
  const data = await get<StandingsResponse<{ DriverStandings: DriverStanding[] }>>(
    `${season}/driverstandings.json?limit=100`,
  );
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return { round: list?.round, standings: list?.DriverStandings ?? [] };
}

export async function fetchConstructorStandings(season: Season = "current") {
  const data = await get<StandingsResponse<{ ConstructorStandings: ConstructorStanding[] }>>(
    `${season}/constructorstandings.json?limit=100`,
  );
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return { round: list?.round, standings: list?.ConstructorStandings ?? [] };
}
