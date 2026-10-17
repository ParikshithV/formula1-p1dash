import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Race } from "../api/types";
import { useNow } from "../hooks/useNow";
import { countryFlag, trackOutline } from "../lib/assets";
import { formatDateRange, formatTime, relativeDay } from "../lib/format";
import { getLiveSession, getNextSession, getSessions, isSprintWeekend } from "../lib/race";
import { colors, radius, space, type } from "../theme";
import { Countdown } from "./Countdown";
import { Badge, Card, LiveDot } from "./ui";

export function NextRaceHero({ race }: { race: Race }) {
  const now = useNow(30_000);
  const sessions = getSessions(race);
  const live = getLiveSession(race, now);
  const next = getNextSession(race, now);
  const target = next ?? sessions[sessions.length - 1];

  return (
    <Card onPress={() => router.push(`/race/${race.round}`)} style={styles.card}>
      <LinearGradient
        colors={["#3A0A0A", colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={trackOutline(race.Circuit.circuitId)}
        style={styles.track}
        contentFit="contain"
        transition={300}
      />
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label={`Round ${race.round}`} color={colors.textMuted} />
          {isSprintWeekend(race) ? <Badge label="Sprint" color={colors.gold} /> : null}
          {live ? <Badge label={`${live.short} live`} color={colors.live} icon={<LiveDot />} /> : null}
        </View>
        <Text style={styles.flag}>{countryFlag(race.Circuit.Location.country)}</Text>
        <Text style={type.title} numberOfLines={2}>
          {race.raceName}
        </Text>
        <Text style={[type.label, styles.meta]}>
          {race.Circuit.Location.locality} · {formatDateRange(sessions[0].start, sessions[sessions.length - 1].start)}
        </Text>

        <View style={styles.countdownLabelRow}>
          <Text style={type.caption}>{next ? `${next.name} starts in` : "Lights out"}</Text>
          {next ? (
            <Text style={[type.caption, styles.when]}>
              {relativeDay(next.start)} {next.timeKnown ? formatTime(next.start) : "TBC"}
            </Text>
          ) : null}
        </View>
        <Countdown target={target.start} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg + 4, borderColor: "rgba(225,6,0,0.35)" },
  track: { position: "absolute", right: -10, top: 12, width: 170, height: 130, opacity: 0.35 },
  body: { padding: space.lg + 2, gap: 2 },
  badges: { flexDirection: "row", gap: 6, marginBottom: space.md, flexWrap: "wrap" },
  flag: { fontSize: 28, marginBottom: 2 },
  meta: { marginBottom: space.lg },
  countdownLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm },
  when: { color: colors.textMuted },
});
