import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Constructor, Driver } from "../api/types";
import { fitMono, useLayout } from "../hooks/useLayout";
import { teamColor, teamMeta } from "../lib/assets";
import { colors, fonts, space, tones, type, type Tone } from "../theme";

interface Props {
  position: string;
  driver: Driver;
  constructor: Constructor;
  primary: string;
  secondary?: string;
  fastestLap?: boolean;
  highlight?: boolean;
  tone?: Tone;
}

function ResultRowBase({ position, driver, constructor, primary, secondary, fastestLap, highlight, tone = "light" }: Props) {
  const t = tones[tone];
  const pos = Number(position);
  const { inner } = useLayout();
  // Position column and a right column wide enough for "1:42:00.785"; the name takes the rest.
  const nameSize = fitMono(driver.familyName + (fastestLap ? "  " : ""), inner - 32 - 112 - space.md * 2, 20);
  return (
    <View style={[styles.row, highlight && { backgroundColor: t.band }]}>
      <Text style={[styles.pos, { color: pos <= 3 ? t.text : t.dim }]}>
        {Number.isNaN(pos) ? position : String(pos).padStart(2, "0")}
      </Text>
      <View style={styles.info}>
        <Text style={[type.value, styles.name, { fontSize: nameSize, lineHeight: nameSize * 1.2, color: t.text }]} numberOfLines={1}>
          {driver.familyName}
          {fastestLap ? "  " : ""}
          {fastestLap ? <Ionicons name="timer-outline" size={14} color={colors.accent} /> : null}
        </Text>
        <View style={styles.team}>
          <View style={[styles.swatch, { backgroundColor: teamColor(constructor.constructorId) }]} />
          <Text style={[type.label, { color: t.muted }]} numberOfLines={1}>
            {teamMeta(constructor.constructorId).shortName || constructor.name}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.primary, { color: t.text }]}>{primary}</Text>
        {secondary ? <Text style={[type.label, { color: t.muted }]}>{secondary}</Text> : null}
      </View>
    </View>
  );
}

export const ResultRow = memo(ResultRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    marginHorizontal: -space.gutter,
    paddingHorizontal: space.gutter,
  },
  pos: { width: 32, fontFamily: fonts.mono, fontSize: 20 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 20, lineHeight: 24, textTransform: "uppercase" },
  team: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 8, height: 8 },
  right: { alignItems: "flex-end", gap: 2 },
  primary: { fontFamily: fonts.mono, fontSize: 16 },
});
