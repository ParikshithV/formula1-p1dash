import type { Race, SessionTime } from "../api/types";

export type SessionKey =
  | "FirstPractice"
  | "SecondPractice"
  | "ThirdPractice"
  | "SprintQualifying"
  | "Sprint"
  | "Qualifying"
  | "Race";

export interface Session {
  key: SessionKey;
  name: string;
  short: string;
  start: Date;
  /** Session times without a clock time are TBC and treated as date-only. */
  timeKnown: boolean;
}

const SESSION_META: Record<SessionKey, { name: string; short: string; minutes: number }> = {
  FirstPractice: { name: "Practice 1", short: "FP1", minutes: 60 },
  SecondPractice: { name: "Practice 2", short: "FP2", minutes: 60 },
  ThirdPractice: { name: "Practice 3", short: "FP3", minutes: 60 },
  SprintQualifying: { name: "Sprint Qualifying", short: "SQ", minutes: 45 },
  Sprint: { name: "Sprint", short: "SPR", minutes: 60 },
  Qualifying: { name: "Qualifying", short: "QUALI", minutes: 60 },
  Race: { name: "Grand Prix", short: "RACE", minutes: 120 },
};

const toDate = ({ date, time }: SessionTime) => new Date(`${date}T${time ?? "00:00:00Z"}`);

export function getSessions(race: Race): Session[] {
  const raw: [SessionKey, SessionTime | undefined][] = [
    ["FirstPractice", race.FirstPractice],
    ["SecondPractice", race.SecondPractice],
    ["ThirdPractice", race.ThirdPractice],
    ["SprintQualifying", race.SprintQualifying],
    ["Sprint", race.Sprint],
    ["Qualifying", race.Qualifying],
    ["Race", { date: race.date, time: race.time }],
  ];
  return raw
    .filter((entry): entry is [SessionKey, SessionTime] => !!entry[1])
    .map(([key, t]) => ({
      key,
      name: SESSION_META[key].name,
      short: SESSION_META[key].short,
      start: toDate(t),
      timeKnown: !!t.time,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const sessionEnd = (s: Session) =>
  new Date(s.start.getTime() + SESSION_META[s.key].minutes * 60_000);

export const raceStart = (race: Race) => toDate({ date: race.date, time: race.time });

/** A weekend is "complete" a few hours after lights out, once results are usually published. */
export const isRaceComplete = (race: Race, now = Date.now()) =>
  raceStart(race).getTime() + 3 * 3600_000 < now;

export const isSprintWeekend = (race: Race) => !!race.Sprint;

export function getNextRace(races: Race[], now = Date.now()) {
  return races.find((r) => !isRaceComplete(r, now));
}

export function getLastCompletedRace(races: Race[], now = Date.now()) {
  return [...races].reverse().find((r) => isRaceComplete(r, now));
}

export function getLiveSession(race: Race, now = Date.now()) {
  return getSessions(race).find(
    (s) => s.timeKnown && s.start.getTime() <= now && sessionEnd(s).getTime() > now,
  );
}

export function getNextSession(race: Race, now = Date.now()) {
  return getSessions(race).find((s) => s.start.getTime() > now);
}

/** "Mexico City Grand Prix" -> "Mexico City"; keeps oddities like "Bahrain Grand Prix in Malaysia" readable. */
export const shortRaceName = (race: Race) => race.raceName.replace(/\s*Grand Prix\s*/, " ").trim();
