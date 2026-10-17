import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Race, RaceResult } from "../../src/api/types";
import { Countdown } from "../../src/components/Countdown";
import { ResultRow } from "../../src/components/ResultRow";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { Badge, Card, EmptyState, ErrorState, LiveDot, SectionHeader, Skeleton } from "../../src/components/ui";
import { useQualifying, useRaceResults, useSchedule, useSprintResults } from "../../src/hooks/queries";
import { useFavoriteDriver } from "../../src/hooks/useFavoriteDriver";
import { useNow } from "../../src/hooks/useNow";
import { countryFlag, trackDetailed } from "../../src/lib/assets";
import { formatDateRange, formatTime, formatWeekday, formatDayMonth } from "../../src/lib/format";
import { getNextSession, getSessions, isSprintWeekend, sessionEnd, type Session } from "../../src/lib/race";
import { colors, fonts, radius, space, type } from "../../src/theme";

type ResultTab = "race" | "sprint" | "qualifying";

export default function RaceScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const insets = useSafeAreaInsets();
  const schedule = useSchedule();
  const race = schedule.data?.find((r) => r.round === round);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        {race ? (
          <RaceContent race={race} topInset={insets.top} />
        ) : (
          <View style={{ paddingTop: insets.top + 64, paddingHorizontal: space.lg }}>
            {schedule.isError ? <ErrorState onRetry={() => schedule.refetch()} /> : <Skeleton height={280} />}
          </View>
        )}
      </ScrollView>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        style={[styles.back, { top: insets.top + space.sm }]}
        hitSlop={10}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function RaceContent({ race, topInset }: { race: Race; topInset: number }) {
  const now = useNow(1000);
  const sessions = getSessions(race);
  const next = getNextSession(race, now);
  const sprint = isSprintWeekend(race);

  return (
    <>
      <View style={[styles.hero, { paddingTop: topInset + 56 }]}>
        <LinearGradient colors={["#2A0707", colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.badges}>
          <Badge label={`Round ${race.round}`} color={colors.textMuted} />
          {sprint ? <Badge label="Sprint weekend" color={colors.gold} /> : null}
        </View>
        <Text style={type.display}>
          {countryFlag(race.Circuit.Location.country)} {race.raceName}
        </Text>
        <Text style={[type.label, styles.heroMeta]}>
          {race.Circuit.circuitName} · {race.Circuit.Location.locality}, {race.Circuit.Location.country}
        </Text>
        <Text style={[type.label, styles.heroMeta]}>
          {formatDateRange(sessions[0].start, sessions[sessions.length - 1].start)}
        </Text>
        <Image source={trackDetailed(race.Circuit.circuitId)} style={styles.trackMap} contentFit="contain" transition={300} />
      </View>

      <View style={styles.section}>
        {next ? (
          <Card style={styles.countdownCard}>
            <Text style={[type.caption, styles.countdownLabel]}>{next.name} in</Text>
            <Countdown target={next.start} />
          </Card>
        ) : null}

        <SectionHeader title="Sessions" />
        <Card>
          {sessions.map((s, i) => (
            <SessionRow key={s.key} session={s} now={now} last={i === sessions.length - 1} />
          ))}
        </Card>

        <Results race={race} sessions={sessions} now={now} />
      </View>
    </>
  );
}

function SessionRow({ session, now, last }: { session: Session; now: number; last: boolean }) {
  const live = session.timeKnown && session.start.getTime() <= now && sessionEnd(session).getTime() > now;
  const done = sessionEnd(session).getTime() <= now;
  return (
    <View style={[styles.sessionRow, !last && styles.sessionDivider]}>
      <View style={styles.sessionDay}>
        <Text style={styles.sessionWeekday}>{formatWeekday(session.start)}</Text>
        <Text style={styles.sessionDate}>{formatDayMonth(session.start)}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionName, done && styles.dim]}>{session.name}</Text>
        {live ? (
          <View style={styles.liveRow}>
            <LiveDot />
            <Text style={styles.liveText}>Live now</Text>
          </View>
        ) : null}
      </View>
      {done ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.textDim} />
      ) : (
        <Text style={styles.sessionTime}>{session.timeKnown ? formatTime(session.start) : "TBC"}</Text>
      )}
    </View>
  );
}

/** Lapped cars carry a gap to the car ahead on the same lap, so show laps down instead. */
function resultGap(r: RaceResult, leaderLaps: number) {
  if (r.status === "Lapped" || /^\+\d+ Laps?$/.test(r.status ?? "")) {
    const down = leaderLaps - Number(r.laps ?? leaderLaps);
    if (down > 0) return `+${down} Lap${down > 1 ? "s" : ""}`;
  }
  return r.Time?.time || r.status || "";
}

function Results({ race, sessions, now }: { race: Race; sessions: Session[]; now: number }) {
  const { favoriteDriverId } = useFavoriteDriver();
  const ended = (key: Session["key"]) => {
    const s = sessions.find((x) => x.key === key);
    return !!s && sessionEnd(s).getTime() < now;
  };

  const tabs = [
    ended("Race") && { value: "race" as const, label: "Race" },
    ended("Sprint") && { value: "sprint" as const, label: "Sprint" },
    ended("Qualifying") && { value: "qualifying" as const, label: "Qualifying" },
  ].filter((t): t is { value: ResultTab; label: string } => !!t);

  const [tab, setTab] = useState<ResultTab | null>(null);
  const current = tab ?? tabs[0]?.value;

  const raceQ = useRaceResults(race.season as `${number}`, race.round, current === "race");
  const sprintQ = useSprintResults(race.season as `${number}`, race.round, current === "sprint");
  const qualiQ = useQualifying(race.season as `${number}`, race.round, current === "qualifying");

  if (!tabs.length || !current) return null;

  const query = current === "race" ? raceQ : current === "sprint" ? sprintQ : qualiQ;

  let rows: ReactNode = null;
  if (current === "qualifying" && qualiQ.data) {
    rows = qualiQ.data.map((q) => (
      <ResultRow
        key={q.Driver.driverId}
        position={q.position}
        driver={q.Driver}
        constructor={q.Constructor}
        primary={q.Q3 || q.Q2 || q.Q1 || "—"}
        secondary={q.Q3 ? "Q3" : q.Q2 ? "Q2" : "Q1"}
        highlight={q.Driver.driverId === favoriteDriverId}
      />
    ));
  } else if (current !== "qualifying") {
    const data = current === "race" ? raceQ.data : sprintQ.data;
    const leaderLaps = Number(data?.[0]?.laps ?? 0);
    rows = data?.map((r) => (
      <ResultRow
        key={r.Driver.driverId}
        position={r.positionText}
        driver={r.Driver}
        constructor={r.Constructor}
        primary={resultGap(r, leaderLaps)}
        secondary={Number(r.points) > 0 ? `+${r.points} pts` : undefined}
        fastestLap={r.FastestLap?.rank === "1"}
        highlight={r.Driver.driverId === favoriteDriverId}
      />
    ));
  }

  return (
    <>
      <SectionHeader title="Results" />
      {tabs.length > 1 ? (
        <View style={styles.resultTabs}>
          <SegmentedControl options={tabs} value={current} onChange={setTab} />
        </View>
      ) : null}
      <Card>
        {query.isPending ? (
          <View style={styles.resultsLoading}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} height={40} />
            ))}
          </View>
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : Array.isArray(rows) && rows.length ? (
          rows
        ) : (
          <EmptyState icon="hourglass-outline" message="Results aren't published yet. Pull down on Home to refresh later." />
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: {
    position: "absolute",
    left: space.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,30,40,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  hero: { paddingHorizontal: space.lg, paddingBottom: space.md },
  badges: { flexDirection: "row", gap: 6, marginBottom: space.md },
  heroMeta: { marginTop: 2 },
  trackMap: { width: "100%", aspectRatio: 1.45, marginTop: space.lg },
  section: { paddingHorizontal: space.lg },
  countdownCard: { padding: space.lg, backgroundColor: "#1A1013", borderColor: "rgba(225,6,0,0.35)" },
  countdownLabel: { marginBottom: space.sm },
  sessionRow: { flexDirection: "row", alignItems: "center", paddingVertical: space.md, paddingHorizontal: space.lg, gap: space.lg },
  sessionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sessionDay: { width: 52 },
  sessionWeekday: { ...type.caption, color: colors.accent },
  sessionDate: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  sessionInfo: { flex: 1 },
  sessionName: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  dim: { color: colors.textMuted },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveText: { ...type.caption, color: colors.live },
  sessionTime: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    fontVariant: ["tabular-nums"],
  },
  resultTabs: { marginBottom: space.md },
  resultsLoading: { padding: space.md, gap: space.sm },
});
