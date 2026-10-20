import { useQuery } from "@tanstack/react-query";
import {
  fetchConstructorStandings,
  fetchDriverResults,
  fetchDriverStandings,
  fetchQualifying,
  fetchRaceResults,
  fetchSchedule,
  fetchSeasonPodiums,
  fetchSprintResults,
  type Season,
} from "../api/jolpica";
import { fetchNews } from "../api/news";
import { NEWS_SUPPORTED } from "../lib/platform";

const HOUR = 3600_000;

export const useSchedule = (season: Season = "current") =>
  useQuery({ queryKey: ["schedule", season], queryFn: () => fetchSchedule(season), staleTime: 6 * HOUR });

export const usePodiums = (season: Season = "current") =>
  useQuery({ queryKey: ["podiums", season], queryFn: () => fetchSeasonPodiums(season), staleTime: HOUR });

export const useRaceResults = (season: Season, round: string, enabled = true) =>
  useQuery({
    queryKey: ["results", season, round],
    queryFn: () => fetchRaceResults(season, round),
    enabled,
    staleTime: HOUR,
  });

export const useSprintResults = (season: Season, round: string, enabled = true) =>
  useQuery({
    queryKey: ["sprint", season, round],
    queryFn: () => fetchSprintResults(season, round),
    enabled,
    staleTime: HOUR,
  });

export const useQualifying = (season: Season, round: string, enabled = true) =>
  useQuery({
    queryKey: ["qualifying", season, round],
    queryFn: () => fetchQualifying(season, round),
    enabled,
    staleTime: HOUR,
  });

export const useDriverStandings = (season: Season = "current") =>
  useQuery({ queryKey: ["driverStandings", season], queryFn: () => fetchDriverStandings(season), staleTime: HOUR });

export const useDriverResults = (driverId: string, season: Season = "current") =>
  useQuery({
    queryKey: ["driverResults", season, driverId],
    queryFn: () => fetchDriverResults(season, driverId),
    enabled: !!driverId,
    staleTime: HOUR,
  });

export const useConstructorStandings = (season: Season = "current") =>
  useQuery({
    queryKey: ["constructorStandings", season],
    queryFn: () => fetchConstructorStandings(season),
    staleTime: HOUR,
  });

export const useNews = () =>
  useQuery({ queryKey: ["news"], queryFn: fetchNews, staleTime: 15 * 60_000, enabled: NEWS_SUPPORTED });

/**
 * Standings list every constructor a driver raced for, in no guaranteed order, so the
 * driver's current team is taken from the most recent race classification.
 */
export const useCurrentTeams = () =>
  useQuery({
    queryKey: ["results", "current", "last"],
    queryFn: () => fetchRaceResults("current", "last"),
    staleTime: HOUR,
    select: (results) =>
      Object.fromEntries(results.map((r) => [r.Driver.driverId, r.Constructor.constructorId])) as Record<string, string>,
  });
