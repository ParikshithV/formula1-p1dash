import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { DriverStanding } from "../api/types";
import { driverHeadshot, teamColor, teamMeta } from "../lib/assets";
import { colors, fonts, space, type } from "../theme";
import { Card } from "./ui";

interface Props {
  standing: DriverStanding;
  constructorId: string;
  leaderPoints: number;
}

/** Hero card for the user's followed driver. */
export function DriverSpotlight({ standing, constructorId, leaderPoints }: Props) {
  const color = teamColor(constructorId);
  const gap = leaderPoints - Number(standing.points);
  const stats = [
    { label: "Position", value: `P${standing.positionText}` },
    { label: "Points", value: standing.points },
    { label: "Wins", value: standing.wins },
    { label: "To leader", value: gap === 0 ? "—" : `-${gap}` },
  ];

  return (
    <Card onPress={() => router.navigate("/standings")} style={styles.card}>
      <LinearGradient colors={[`${color}55`, colors.surface]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={styles.number}>{standing.Driver.permanentNumber}</Text>
      <Image
        source={driverHeadshot(standing.Driver, constructorId, 400)}
        style={styles.headshot}
        contentFit="cover"
        contentPosition="top"
        transition={300}
      />
      <View style={styles.body}>
        <Text style={[type.caption, { color }]}>Your driver · {teamMeta(constructorId).shortName}</Text>
        <Text style={styles.given}>{standing.Driver.givenName}</Text>
        <Text style={styles.family}>{standing.Driver.familyName}</Text>
        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 190 },
  number: {
    position: "absolute",
    right: 12,
    top: -8,
    fontFamily: fonts.black,
    fontSize: 120,
    color: "rgba(255,255,255,0.06)",
  },
  headshot: { position: "absolute", right: 0, bottom: 0, width: 170, height: 190 },
  body: { padding: space.lg, gap: 0, maxWidth: "70%" },
  given: { fontFamily: fonts.regular, fontSize: 18, color: colors.textMuted, marginTop: space.sm, lineHeight: 22 },
  family: { fontFamily: fonts.black, fontSize: 26, color: colors.text, textTransform: "uppercase", lineHeight: 30 },
  stats: { flexDirection: "row", gap: space.lg, marginTop: space.lg },
  statValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.text, fontVariant: ["tabular-nums"] },
  statLabel: { ...type.caption, fontSize: 9 },
});
