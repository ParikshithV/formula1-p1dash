import { router } from "expo-router";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Race, RaceResult } from "../api/types";
import { useLayout } from "../hooks/useLayout";
import { pad2 } from "../lib/format";
import { getSessions, isSprintWeekend, shortRaceName } from "../lib/race";
import { colors, fonts, space, tones, type } from "../theme";
import { TrackRender } from "./art/Render";
import { PressableScale } from "./motion";
import { RowAffordance } from "./ui";

interface Props {
  race: Race;
  podium?: RaceResult[];
  isNext?: boolean;
  completed?: boolean;
}

const t = tones.dark;

/**
 * Timeline entry: a small right-aligned caption column and a big mono date with a slash.
 * The next race is lit in white on a band with its circuit; the rest recede into grey.
 */
function RaceCardBase({ race, podium, isNext, completed }: Props) {
  const sessions = getSessions(race);
  const first = sessions[0].start;
  const winner = podium?.[0];
  const color = isNext ? t.text : completed ? t.dim : t.muted;
  const { fit, compact } = useLayout();

  const caption = isNext ? "Next race" : winner ? "Winner" : `Round ${race.round}`;
  const detail = winner ? `${winner.Driver.givenName} ${winner.Driver.familyName}` : race.Circuit.Location.locality;

  return (
    <PressableScale
      onPress={() => router.push(`/race/${race.round}`)}
      scaleTo={0.98}
      accessibilityRole="link"
      accessibilityLabel={`Round ${race.round}, ${race.raceName}`}
      style={[styles.row, isNext && styles.next]}
    >
      {isNext ? (
        <View pointerEvents="none" style={styles.track}>
          <TrackRender circuitId={race.Circuit.circuitId} style={styles.trackImage} />
        </View>
      ) : null}
      <View style={[styles.meta, { width: compact ? 76 : 96 }]}>
        <Text style={[type.label, styles.right, { color: isNext ? colors.accent : t.dim }]}>{caption}</Text>
        <Text style={[type.body, styles.right, { color: isNext ? t.text : t.muted }]} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <View style={styles.titles}>
        <Text style={[styles.date, { fontSize: fit(52), lineHeight: fit(56), color }]} numberOfLines={1}>
          {pad2(first.getDate())}.{pad2(first.getMonth() + 1)}/
        </Text>
        <Text style={[type.value, styles.name, { fontSize: fit(18), lineHeight: fit(22), color }]} numberOfLines={1}>
          R{race.round} {shortRaceName(race).toUpperCase()}
          {isSprintWeekend(race) ? <Text style={{ color: isNext ? colors.accent : color }}> ·S</Text> : null}
        </Text>
      </View>
      <View style={styles.chevron}>
        <RowAffordance color={isNext ? t.text : t.dim} />
      </View>
    </PressableScale>
  );
}

export const RaceCard = memo(RaceCardBase);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, paddingVertical: space.xl },
  next: { backgroundColor: t.band, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter, overflow: "hidden" },
  track: { position: "absolute", right: -10, top: 6, bottom: 6, width: 200, opacity: 0.35, alignItems: "flex-end" },
  trackImage: { height: "100%" },
  meta: { paddingTop: 6, gap: 6 },
  right: { textAlign: "right" },
  titles: { flex: 1, gap: 4 },
  date: { fontFamily: fonts.mono, fontSize: 52, lineHeight: 56, letterSpacing: -1 },
  name: { fontSize: 18, lineHeight: 22 },
  chevron: { justifyContent: "center" },
});
