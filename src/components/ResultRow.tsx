import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Constructor, Driver } from "../api/types";
import { driverHeadshot, teamColor, teamMeta } from "../lib/assets";
import { colors, fonts, podiumColor, radius, space, type } from "../theme";

interface Props {
  position: string;
  driver: Driver;
  constructor: Constructor;
  primary: string;
  secondary?: string;
  fastestLap?: boolean;
  highlight?: boolean;
}

function ResultRowBase({ position, driver, constructor, primary, secondary, fastestLap, highlight }: Props) {
  const color = teamColor(constructor.constructorId);
  const pos = Number(position);
  return (
    <View style={[styles.row, highlight && { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.pos, pos <= 3 && { color: podiumColor(pos) }]}>{Number.isNaN(pos) ? position : pos}</Text>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      {pos <= 3 ? (
        <Image
          source={driverHeadshot(driver, constructor.constructorId, 120)}
          style={[styles.avatar, { backgroundColor: `${color}33` }]}
          contentFit="cover"
          contentPosition="top"
        />
      ) : null}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {driver.familyName}
          {fastestLap ? "  " : ""}
          {fastestLap ? <Ionicons name="timer-outline" size={13} color="#B36BFF" /> : null}
        </Text>
        <Text style={styles.team} numberOfLines={1}>
          {teamMeta(constructor.constructorId).shortName || constructor.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.primary}>{primary}</Text>
        {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
      </View>
    </View>
  );
}

export const ResultRow = memo(ResultRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + 2,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pos: { width: 26, fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted, textAlign: "center", fontVariant: ["tabular-nums"] },
  stripe: { width: 3, height: 26, borderRadius: radius.sm },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  info: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, textTransform: "uppercase" },
  team: { ...type.label, fontSize: 12 },
  right: { alignItems: "flex-end" },
  primary: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] },
  secondary: { ...type.caption, fontSize: 10, letterSpacing: 0.5 },
});
