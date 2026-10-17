import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Race, RaceResult } from "../api/types";
import { countryFlag, teamColor, trackOutline } from "../lib/assets";
import { formatMonth } from "../lib/format";
import { getSessions, isSprintWeekend } from "../lib/race";
import { colors, fonts, podiumColor, radius, space, type } from "../theme";
import { Badge, Card } from "./ui";

interface Props {
  race: Race;
  podium?: RaceResult[];
  isNext?: boolean;
  completed?: boolean;
}

function RaceCardBase({ race, podium, isNext, completed }: Props) {
  const sessions = getSessions(race);
  const first = sessions[0].start;
  const last = sessions[sessions.length - 1].start;

  return (
    <Card
      onPress={() => router.push(`/race/${race.round}`)}
      style={[styles.card, isNext && styles.next, completed && styles.completed]}
    >
      <View style={styles.date}>
        <Text style={styles.days}>
          {first.getDate()}
          {first.getDate() !== last.getDate() ? `–${last.getDate()}` : ""}
        </Text>
        <Text style={styles.month}>{formatMonth(last)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={type.caption}>Round {race.round}</Text>
          {isNext ? <Badge label="Next" /> : null}
          {isSprintWeekend(race) ? <Badge label="Sprint" color={colors.gold} /> : null}
        </View>
        <Text style={type.heading} numberOfLines={1}>
          {countryFlag(race.Circuit.Location.country)} {race.raceName.replace("Grand Prix", "GP")}
        </Text>
        {podium?.length ? (
          <View style={styles.podium}>
            {podium.slice(0, 3).map((r) => (
              <View key={r.Driver.driverId} style={styles.podiumChip}>
                <Text style={[styles.podiumPos, { color: podiumColor(Number(r.position)) }]}>P{r.position}</Text>
                <View style={[styles.podiumDot, { backgroundColor: teamColor(r.Constructor.constructorId) }]} />
                <Text style={styles.podiumCode}>{r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={type.label} numberOfLines={1}>
            {race.Circuit.circuitName}
          </Text>
        )}
      </View>

      <Image
        source={trackOutline(race.Circuit.circuitId)}
        style={[styles.track, completed && styles.trackDim]}
        contentFit="contain"
        transition={200}
      />
    </Card>
  );
}

export const RaceCard = memo(RaceCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: space.md, gap: space.md, marginBottom: space.sm + 2 },
  next: { borderColor: colors.accent, borderWidth: 1, backgroundColor: "#1A1013" },
  completed: { backgroundColor: "#121218" },
  date: { width: 52, alignItems: "center" },
  days: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, fontVariant: ["tabular-nums"] },
  month: { ...type.caption, color: colors.accent },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.borderStrong },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  track: { width: 64, height: 48, opacity: 0.85 },
  trackDim: { opacity: 0.4 },
  podium: { flexDirection: "row", gap: space.md, marginTop: 2 },
  podiumChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  podiumPos: { fontFamily: fonts.bold, fontSize: 12 },
  podiumDot: { width: 3, height: 12, borderRadius: radius.sm },
  podiumCode: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
});
