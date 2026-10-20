import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { memo, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import type { ConstructorStanding, DriverStanding } from "../api/types";
import { fitMono, useLayout } from "../hooks/useLayout";
import { nationalityFlag, teamColor, teamMeta } from "../lib/assets";
import { colors, fonts, motion, space, tones, type } from "../theme";
import { CarRender, DriverRender } from "./art/Render";
import { FillBar, PressableScale } from "./motion";
import { haptic, RowAffordance } from "./ui";

const t = tones.dark;

/** "1" → "01"; non-numeric classifications ("R", "D") pass through. */
const pad2Str = (position: string) => (/^\d$/.test(position) ? `0${position}` : position);

/** Star that pops once when it becomes active – confirms the tap without a toast. */
function FavoriteStar({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = active
      ? withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, motion.spring))
      : withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, motion.spring));
  }, [active, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptic(active ? "select" : "light");
        onPress();
      }}
      style={[styles.star, { borderColor: active ? colors.accent : t.line }]}
    >
      <Animated.View style={style}>
        <Ionicons name={active ? "star" : "star-outline"} size={15} color={active ? colors.accent : t.muted} />
      </Animated.View>
    </Pressable>
  );
}

const Points = ({ value }: { value: string }) => (
  <View style={styles.points}>
    <Text style={[type.label, { color: t.muted }]}>Pts</Text>
    <Text style={[type.value, { color: t.text }]}>{value}</Text>
  </View>
);

interface DriverRowProps {
  standing: DriverStanding;
  constructorId: string;
  leaderPoints: number;
  isFavorite: boolean;
  onToggleFavorite: (driverId: string) => void;
  index?: number;
}

function DriverStandingRowBase({ standing, constructorId, leaderPoints, isFavorite, onToggleFavorite, index = 0 }: DriverRowProps) {
  const { Driver: driver } = standing;
  const color = teamColor(constructorId);
  const { inner, fit } = useLayout();
  // Headshots only where the name column can afford them.
  const showAvatar = inner >= 414 - space.gutter * 2;
  // Fixed columns: position, points, star and chevron (plus gaps); the name gets the rest.
  const nameWidth = inner - 34 - 52 - 46 - 30 - space.md - (showAvatar ? 56 : 0);
  const team = teamMeta(constructorId).shortName || standing.Constructors.find((c) => c.constructorId === constructorId)?.name;

  return (
    <PressableScale
      onPress={() => router.push(`/driver/${driver.driverId}`)}
      scaleTo={0.985}
      accessibilityRole="link"
      accessibilityLabel={`${driver.givenName} ${driver.familyName}, P${standing.positionText}, ${standing.points} points`}
      style={[styles.row, isFavorite && styles.favorite]}
    >
      <View style={styles.main}>
        <Text style={[styles.position, { color: Number(standing.position) <= 3 ? t.text : t.dim }]}>
          {pad2Str(standing.positionText)}
        </Text>
        {!showAvatar ? null : (
          <View style={[styles.avatar, { backgroundColor: t.band }]}>
            <DriverRender driverId={driver.driverId} constructorId={constructorId} style={styles.helmet} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[type.label, { color: t.muted }]} numberOfLines={1}>
            {driver.givenName} {nationalityFlag(driver.nationality)}
          </Text>
          <Text style={[type.value, styles.upper, { fontSize: fitMono(driver.familyName, nameWidth, fit(22)), color: t.text }]} numberOfLines={1}>
            {driver.familyName}
          </Text>
          <View style={styles.teamRow}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={[type.label, styles.flexText, { color: t.muted }]}>
              {team}
              {Number(standing.wins) > 0 ? ` · ${standing.wins} win${standing.wins === "1" ? "" : "s"}` : ""}
            </Text>
          </View>
        </View>
        <Points value={standing.points} />
        <FavoriteStar
          active={isFavorite}
          label={isFavorite ? "Remove favourite driver" : "Set as favourite driver"}
          onPress={() => onToggleFavorite(driver.driverId)}
        />
        <RowAffordance />
      </View>
      <FillBar
        ratio={leaderPoints ? Number(standing.points) / leaderPoints : 0}
        color={color}
        height={2}
        trackColor={t.line}
        delay={Math.min(index, 10) * motion.stagger + 120}
      />
    </PressableScale>
  );
}

export const DriverStandingRow = memo(DriverStandingRowBase);

/** Current team: latest race result if known, otherwise the first listed constructor. */
export const resolveTeam = (standing: DriverStanding, currentTeams?: Record<string, string>) =>
  currentTeams?.[standing.Driver.driverId] ?? standing.Constructors[0]?.constructorId ?? "";

function ConstructorStandingRowBase({
  standing,
  leaderPoints,
  index = 0,
  isFavorite = false,
}: {
  standing: ConstructorStanding;
  leaderPoints: number;
  index?: number;
  isFavorite?: boolean;
}) {
  const { constructorId, name } = standing.Constructor;
  const color = teamColor(constructorId);
  const { inner, fit } = useLayout();
  const label = teamMeta(constructorId).shortName || name;
  return (
    <View style={[styles.teamRowWrap, isFavorite && styles.favorite]}>
      <View style={styles.main}>
        <Text style={[styles.position, { color: Number(standing.position) <= 3 ? t.text : t.dim }]}>
          {pad2Str(standing.positionText)}
        </Text>
        <View style={styles.info}>
          <View style={styles.teamRow}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <Text style={[type.label, { color: isFavorite ? colors.accent : t.muted }]}>
              {isFavorite ? "Your team · " : ""}
              {Number(standing.wins) > 0 ? `${standing.wins} win${standing.wins === "1" ? "" : "s"}` : "No wins yet"}
            </Text>
          </View>
          <Text style={[type.value, styles.upper, { fontSize: fitMono(label, inner - 34 - 52 - space.md * 2, fit(22)), color: t.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Points value={standing.points} />
      </View>
      <CarRender constructorId={constructorId} style={styles.car} />
      <FillBar
        ratio={leaderPoints ? Number(standing.points) / leaderPoints : 0}
        color={color}
        height={2}
        trackColor={t.line}
        delay={Math.min(index, 10) * motion.stagger + 120}
      />
    </View>
  );
}

export const ConstructorStandingRow = memo(ConstructorStandingRowBase);

const styles = StyleSheet.create({
  upper: { textTransform: "uppercase" },
  row: { paddingVertical: space.lg, gap: space.lg },
  favorite: { backgroundColor: t.band, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter },
  main: { flexDirection: "row", alignItems: "center", gap: space.md },
  position: { width: 34, fontFamily: fonts.mono, fontSize: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  helmet: { height: 38 },
  info: { flex: 1, gap: 2 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flexText: { flexShrink: 1 },
  swatch: { width: 8, height: 8 },
  points: { alignItems: "flex-end", minWidth: 40, gap: 2 },
  star: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  teamRowWrap: { paddingVertical: space.xl },
  car: { width: "86%", alignSelf: "center", marginVertical: space.lg },
});
