import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Race, RaceResult } from "../api/types";
import { countryFlag, driverHeadshot, teamColor } from "../lib/assets";
import { colors, fonts, podiumColor, radius, space, type } from "../theme";
import { Card } from "./ui";

// Classic podium order: P2, P1, P3.
const ORDER = [1, 0, 2];
const HEIGHTS = [64, 44, 32];

export function PodiumCard({ race, podium }: { race: Race; podium: RaceResult[] }) {
  return (
    <Card onPress={() => router.push(`/race/${race.round}`)} style={styles.card}>
      <Text style={type.heading}>
        {countryFlag(race.Circuit.Location.country)} {race.raceName}
      </Text>
      <Text style={[type.label, styles.sub]}>Round {race.round} · Race result</Text>
      <View style={styles.podium}>
        {ORDER.map((i) => {
          const r = podium[i];
          if (!r) return <View key={i} style={styles.step} />;
          const color = teamColor(r.Constructor.constructorId);
          return (
            <View key={r.Driver.driverId} style={styles.step}>
              <Image
                source={driverHeadshot(r.Driver, r.Constructor.constructorId, 200)}
                style={[styles.headshot, i === 0 && styles.headshotWinner]}
                contentFit="cover"
                contentPosition="top"
                transition={250}
              />
              <Text style={styles.code}>{r.Driver.code ?? r.Driver.familyName}</Text>
              <Text style={styles.time} numberOfLines={1}>
                {r.Time?.time ?? r.status}
              </Text>
              <View style={[styles.block, { height: HEIGHTS[i], borderTopColor: color }]}>
                <Text style={[styles.pos, { color: podiumColor(i + 1) }]}>{i + 1}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg },
  sub: { marginBottom: space.md },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  step: { flex: 1, alignItems: "center" },
  headshot: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt },
  headshotWinner: { width: 80, height: 80, borderRadius: 40 },
  code: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginTop: 6 },
  time: { ...type.label, fontSize: 11, marginBottom: 6 },
  block: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 3,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  pos: { fontFamily: fonts.black, fontSize: 20 },
});
