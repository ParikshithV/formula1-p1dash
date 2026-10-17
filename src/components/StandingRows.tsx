import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConstructorStanding, DriverStanding } from "../api/types";
import { driverHeadshot, nationalityFlag, teamCar, teamColor, teamLogo, teamMeta } from "../lib/assets";
import { colors, fonts, podiumColor, radius, space, type } from "../theme";
import { haptic } from "./ui";

const PointsBar = ({ ratio, color }: { ratio: number; color: string }) => (
  <View style={styles.barTrack}>
    <View style={[styles.barFill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }]} />
  </View>
);

const Position = ({ value }: { value: string }) => (
  <Text style={[styles.position, { color: Number(value) <= 3 ? podiumColor(Number(value)) : colors.textMuted }]}>
    {value}
  </Text>
);

interface DriverRowProps {
  standing: DriverStanding;
  constructorId: string;
  leaderPoints: number;
  isFavorite: boolean;
  onToggleFavorite: (driverId: string) => void;
}

function DriverStandingRowBase({ standing, constructorId, leaderPoints, isFavorite, onToggleFavorite }: DriverRowProps) {
  const { Driver: driver } = standing;
  const color = teamColor(constructorId);
  const points = Number(standing.points);

  return (
    <View style={[styles.row, isFavorite && { borderColor: color, backgroundColor: `${color}14` }]}>
      <Position value={standing.positionText} />
      <View style={[styles.avatar, { backgroundColor: `${color}33` }]}>
        <Image source={driverHeadshot(driver, constructorId, 160)} style={styles.headshot} contentFit="cover" contentPosition="top" transition={200} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {driver.givenName} <Text style={styles.surname}>{driver.familyName}</Text>
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {nationalityFlag(driver.nationality)} {teamMeta(constructorId).shortName || standing.Constructors.find((c) => c.constructorId === constructorId)?.name}
          {Number(standing.wins) > 0 ? `  ·  ${standing.wins} win${standing.wins === "1" ? "" : "s"}` : ""}
        </Text>
        <PointsBar ratio={leaderPoints ? points / leaderPoints : 0} color={color} />
      </View>
      <View style={styles.pointsCol}>
        <Text style={styles.points}>{standing.points}</Text>
        <Text style={styles.pts}>PTS</Text>
      </View>
      <Pressable
        hitSlop={10}
        accessibilityLabel={isFavorite ? "Remove favourite driver" : "Set as favourite driver"}
        onPress={() => {
          haptic();
          onToggleFavorite(driver.driverId);
        }}
      >
        <Ionicons name={isFavorite ? "star" : "star-outline"} size={18} color={isFavorite ? colors.gold : colors.textDim} />
      </Pressable>
    </View>
  );
}

export const DriverStandingRow = memo(DriverStandingRowBase);

/** Current team: latest race result if known, otherwise the first listed constructor. */
export const resolveTeam = (standing: DriverStanding, currentTeams?: Record<string, string>) =>
  currentTeams?.[standing.Driver.driverId] ?? standing.Constructors[0]?.constructorId ?? "";

function ConstructorStandingRowBase({ standing, leaderPoints }: { standing: ConstructorStanding; leaderPoints: number }) {
  const { constructorId, name } = standing.Constructor;
  const color = teamColor(constructorId);
  return (
    <View style={[styles.teamCard, { borderLeftColor: color }]}>
      <View style={styles.teamTop}>
        <Position value={standing.positionText} />
        <View style={[styles.logoWrap, { backgroundColor: color }]}>
          <Image source={teamLogo(constructorId)} style={styles.logo} contentFit="contain" />
        </View>
        <View style={styles.info}>
          <Text style={styles.surname} numberOfLines={1}>
            {teamMeta(constructorId).shortName || name}
          </Text>
          <Text style={styles.sub}>
            {Number(standing.wins) > 0 ? `${standing.wins} win${standing.wins === "1" ? "" : "s"}` : "No wins yet"}
          </Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={styles.points}>{standing.points}</Text>
          <Text style={styles.pts}>PTS</Text>
        </View>
      </View>
      <Image source={teamCar(constructorId, 600)} style={styles.car} contentFit="contain" transition={250} />
      <PointsBar ratio={leaderPoints ? Number(standing.points) / leaderPoints : 0} color={color} />
    </View>
  );
}

export const ConstructorStandingRow = memo(ConstructorStandingRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  position: { width: 22, fontFamily: fonts.bold, fontSize: 16, textAlign: "center", fontVariant: ["tabular-nums"] },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  headshot: { width: 44, height: 44 },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  surname: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, textTransform: "uppercase" },
  sub: { ...type.label, fontSize: 12 },
  pointsCol: { alignItems: "flex-end", minWidth: 40 },
  points: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, fontVariant: ["tabular-nums"] },
  pts: { ...type.caption, fontSize: 9 },
  barTrack: { height: 3, borderRadius: 2, backgroundColor: colors.surfaceAlt, marginTop: 4, overflow: "hidden" },
  barFill: { height: 3, borderRadius: 2 },
  teamCard: {
    padding: space.md,
    marginBottom: space.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  teamTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  logoWrap: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", padding: 6 },
  logo: { width: "100%", height: "100%" },
  car: { width: "100%", height: 70, marginVertical: space.sm },
});
