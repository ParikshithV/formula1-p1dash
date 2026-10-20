import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Race, RaceResult } from "../../src/api/types";
import { Countdown } from "../../src/components/Countdown";
import { GlassTrack } from "../../src/components/art/GlassTrack";
import { Appear, useScrollY } from "../../src/components/motion";
import { ResultRow } from "../../src/components/ResultRow";
import { TopBar, useTopBarSpace } from "../../src/components/TopBar";
import {
  BigTitle,
  CircleButton,
  EmptyState,
  ErrorState,
  Field,
  FieldRow,
  LiveDot,
  PillButton,
  SectionHeader,
  Skeleton,
  Segmented,
} from "../../src/components/ui";
import { useQualifying, useRaceResults, useSchedule, useSprintResults } from "../../src/hooks/queries";
import { useFavoriteDriver, usePreferences } from "../../src/hooks/usePreferences";
import { useNow } from "../../src/hooks/useNow";
import { formatDayMonth, formatTime, formatWeekday, pad2 } from "../../src/lib/format";
import { getNextSession, getSessions, isSprintWeekend, sessionEnd, shortRaceName, type Session } from "../../src/lib/race";
import { colors, fonts, frameStyle, space, tones, type } from "../../src/theme";

type ResultTab = "race" | "sprint" | "qualifying";

const t = tones.light;

export default function RaceScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const insets = useSafeAreaInsets();
  const top = useTopBarSpace();
  const schedule = useSchedule();
  const races = schedule.data ?? [];
  const index = races.findIndex((r) => r.round === round);
  const race = races[index];
  const nextRace = races[index + 1];
  const { scrollY, onScroll } = useScrollY();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, frameStyle, { paddingTop: top, paddingBottom: insets.bottom + space.section }]}
      >
        <PillButton
          tone="light"
          label="Back"
          icon="chevron-back"
          iconPosition="start"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/schedule"))}
          style={styles.back}
        />

        {race ? (
          // Keyed by round so stepping to the next weekend replays the entrance.
          <RaceContent key={race.round} race={race} total={races.length} scrollY={scrollY} />
        ) : schedule.isError ? (
          <ErrorState tone="light" onRetry={() => schedule.refetch()} />
        ) : (
          <View style={styles.skeleton}>
            <Skeleton tone="light" height={70} />
            <Skeleton tone="light" height={260} />
          </View>
        )}

        {nextRace ? (
          <View style={styles.footer}>
            <View style={styles.footerText}>
              <Text style={[type.label, { color: t.muted }]}>Up next · Round {nextRace.round}</Text>
              <Text style={[type.value, styles.upper, { color: t.text }]}>{shortRaceName(nextRace)}</Text>
            </View>
            <CircleButton
              tone="light"
              label="Next"
              onPress={() => {
                router.setParams({ round: nextRace.round });
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
            />
          </View>
        ) : null}
      </Animated.ScrollView>
      <TopBar tone="light" scrollY={scrollY} />
    </View>
  );
}

function RaceContent({ race, total, scrollY }: { race: Race; total: number; scrollY: SharedValue<number> }) {
  const now = useNow(1000);
  const sessions = getSessions(race);
  const next = getNextSession(race, now);
  const first = sessions[0].start;
  const last = sessions[sessions.length - 1].start;

  // The glow behind the glass drifts a little slower than the page – just enough depth to feel physical.
  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 400], [0, 60], Extrapolation.CLAMP) }, { scale: 1.15 }],
  }));

  return (
    <>
      <BigTitle tone="light" text={shortRaceName(race)} size={84} />

      <Appear index={1} style={styles.band}>
        <GlassTrack circuitId={race.Circuit.circuitId} bloomStyle={bloomStyle} />
      </Appear>

      <Appear index={2}>
        <FieldRow style={styles.fields}>
          <Field tone="light" label="Circuit" value={race.Circuit.circuitName} />
          <Field tone="light" label="Date" value={`${pad2(first.getDate())}—${pad2(last.getDate())}/${pad2(last.getMonth() + 1)}`} />
        </FieldRow>
        <FieldRow style={styles.fields}>
          <Field tone="light" label="Location" value={race.Circuit.Location.locality} sub={race.Circuit.Location.country} />
          <Field
            tone="light"
            label="Round"
            value={`${race.round}/${total}`}
            sub={isSprintWeekend(race) ? "Sprint weekend" : undefined}
          />
        </FieldRow>
      </Appear>

      {next ? (
        <Appear index={3} style={styles.countdown}>
          <Text style={[type.label, styles.countdownLabel]}>{next.name} starts in</Text>
          <Countdown tone="light" target={next.start} />
        </Appear>
      ) : null}

      <Appear index={4}>
        <SectionHeader tone="light" title="Sessions" />
        {sessions.map((s) => (
          <SessionRow key={s.key} session={s} now={now} />
        ))}
      </Appear>

      <Results race={race} sessions={sessions} now={now} />
    </>
  );
}

function SessionRow({ session, now }: { session: Session; now: number }) {
  const { prefs } = usePreferences();
  const live = session.timeKnown && session.start.getTime() <= now && sessionEnd(session).getTime() > now;
  const done = sessionEnd(session).getTime() <= now;
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionDay}>
        <Text style={[type.label, { color: done ? t.dim : t.muted }]}>{formatWeekday(session.start)}</Text>
        <Text style={[type.label, { color: done ? t.dim : t.muted }]}>{formatDayMonth(session.start)}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[type.value, styles.upper, { color: done ? t.dim : t.text }]}>{session.name}</Text>
        {live ? (
          <View style={styles.liveRow}>
            <LiveDot />
            <Text style={[type.label, { color: t.text }]}>Live now</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.sessionTime, { color: done ? t.dim : t.text }]}>
        {done ? "Done" : session.timeKnown ? formatTime(session.start, prefs.clock) : "TBC"}
      </Text>
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
  ].filter((x): x is { value: ResultTab; label: string } => !!x);

  const [tab, setTab] = useState<ResultTab | null>(null);
  const current = tab ?? tabs[0]?.value;

  const raceQ = useRaceResults(race.season as `${number}`, race.round, current === "race");
  const sprintQ = useSprintResults(race.season as `${number}`, race.round, current === "sprint");
  const qualiQ = useQualifying(race.season as `${number}`, race.round, current === "qualifying");

  if (!tabs.length || !current) return null;

  const query = current === "race" ? raceQ : current === "sprint" ? sprintQ : qualiQ;

  let rows: ReactNode[] | null = null;
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
    rows =
      data?.map((r) => (
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
      )) ?? null;
  }

  return (
    <Appear index={5}>
      <SectionHeader tone="light" title="Results" />
      {tabs.length > 1 ? (
        <View style={styles.resultTabs}>
          <Segmented tone="light" options={tabs} value={current} onChange={setTab} />
        </View>
      ) : null}
      {query.isPending ? (
        <View style={styles.resultsLoading}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} tone="light" height={40} />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState tone="light" onRetry={() => query.refetch()} />
      ) : rows?.length ? (
        // Remount per tab so the table fades in instead of snapping.
        <Appear key={current}>{rows}</Appear>
      ) : (
        <EmptyState tone="light" message="Results aren't published yet. Check back shortly." />
      )}
    </Appear>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { paddingHorizontal: space.gutter },
  upper: { textTransform: "uppercase" },
  back: { marginTop: space.lg },
  skeleton: { gap: space.xl, marginTop: space.xl },
  band: {
    marginHorizontal: -space.gutter,
    marginTop: space.xl,
    // The neon circuit and its glass only read on dark.
    backgroundColor: tones.dark.bg,
    overflow: "hidden",
  },
  fields: { marginTop: space.xl + 8 },
  countdown: { marginTop: space.xxl },
  countdownLabel: { color: t.muted, marginBottom: space.md },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingVertical: space.md },
  sessionDay: { width: 52, gap: 2 },
  sessionInfo: { flex: 1, gap: 4 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionTime: { fontFamily: fonts.mono, fontSize: 16 },
  resultTabs: { marginBottom: space.lg },
  resultsLoading: { gap: space.sm },
  footer: { marginTop: space.section, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerText: { flex: 1, gap: space.sm },
});
