import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Race } from "../api/types";
import { useLayout } from "../hooks/useLayout";
import { useNow } from "../hooks/useNow";
import { usePreferences } from "../hooks/usePreferences";
import { formatTime, pad2, relativeDay } from "../lib/format";
import { getLiveSession, getNextSession, getSessions, isSprintWeekend, shortRaceName } from "../lib/race";
import { fonts, space, tones, type } from "../theme";
import { Countdown } from "./Countdown";
import { Appear } from "./motion";
import { Checker, CircleButton, Field, FieldRow, LiveDot } from "./ui";

/** Average uppercase advance of Share Tech as a fraction of font size. */
const GLYPH = 0.45;
/** Cap height of Share Tech as a fraction of font size – the checker matches it. */
const CAP = 0.7;
const MAX_SIZE = 128;

/**
 * Poster-style hero: the race name set huge, one word per line, with the chequered block
 * butting into the second line. Font size is derived from the longest line so every name
 * fills the width without wrapping.
 */
export function NextRaceHero({ race, roundsTotal }: { race: Race; roundsTotal: number }) {
  const { frame } = useLayout();
  const now = useNow(30_000);
  const { prefs } = usePreferences();
  const sessions = getSessions(race);
  const live = getLiveSession(race, now);
  const next = getNextSession(race, now);
  const target = next ?? sessions[sessions.length - 1];

  const lines = [...shortRaceName(race).toUpperCase().split(/\s+/), "GP."];
  const available = frame - space.gutter - 8;
  const checkerWidth = (size: number) => size * CAP + size * 0.08;
  const size = Math.min(
    MAX_SIZE,
    ...lines.map((line, i) => available / (line.length * GLYPH + (i === 1 ? CAP + 0.08 : 0))),
  );
  const cell = (size * CAP) / 3;
  const first = sessions[0].start;

  return (
    <View>
      <Appear>
        <Text style={[type.label, styles.kicker]}>
          {live ? "Live now · " : "Next race · "}Round {race.round}
          {isSprintWeekend(race) ? " · Sprint weekend" : ""}
        </Text>
      </Appear>

      <View style={styles.poster}>
        {lines.map((line, i) => (
          <Appear key={`${line}-${i}`} index={i + 1} style={i === 1 ? styles.checkerLine : undefined}>
            {i === 1 ? (
              <Checker cell={cell} style={{ marginLeft: -space.gutter, marginRight: checkerWidth(size) - cell * 3 }} />
            ) : null}
            <Text style={[styles.line, { fontSize: size, lineHeight: size * 0.92 }]}>{line}</Text>
          </Appear>
        ))}
      </View>

      <Appear index={lines.length + 1}>
        <FieldRow>
          <Field label="Round" value={`${race.round}/${roundsTotal}`} />
          <Field label="Circuit" value={race.Circuit.Location.locality} />
          <Field label="Date" value={`${pad2(first.getDate())}/${pad2(first.getMonth() + 1)}`} />
        </FieldRow>
      </Appear>

      <Appear index={lines.length + 2} style={styles.countdown}>
        <Countdown target={target.start} />
      </Appear>

      <Appear index={lines.length + 3} style={styles.footer}>
        <View style={styles.session}>
          <View style={styles.sessionLabel}>
            {live ? <LiveDot /> : null}
            <Text style={[type.label, { color: tones.dark.muted }]}>{live ? `${live.name} live` : next ? next.name : "Lights out"}</Text>
          </View>
          {next ? (
            <Text style={[type.body, { color: tones.dark.text }]}>
              {relativeDay(next.start)} {next.timeKnown ? formatTime(next.start, prefs.clock) : "TBC"}
            </Text>
          ) : null}
        </View>
        <CircleButton label="Weekend" onPress={() => router.push(`/race/${race.round}`)} />
      </Appear>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: tones.dark.muted },
  poster: { marginTop: space.xl, marginBottom: space.xxl },
  checkerLine: { flexDirection: "row", alignItems: "center" },
  line: { fontFamily: fonts.display, color: tones.dark.text, letterSpacing: -1, includeFontPadding: false },
  countdown: { marginTop: space.xxl },
  footer: { marginTop: space.xxl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  session: { gap: 6, flex: 1 },
  sessionLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
});
