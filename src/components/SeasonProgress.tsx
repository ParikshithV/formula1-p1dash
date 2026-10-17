import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space, type } from "../theme";
import { Card } from "./ui";

export function SeasonProgress({ completed, total, season }: { completed: number; total: number; season: string }) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={type.caption}>{season} season</Text>
        <Text style={styles.count}>
          {completed}
          <Text style={styles.total}> / {total} rounds</Text>
        </Text>
      </View>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < completed && styles.done,
              i === completed && styles.current,
            ]}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, marginTop: space.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space.sm + 2 },
  count: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  total: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  segments: { flexDirection: "row", gap: 3 },
  segment: { flex: 1, height: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  done: { backgroundColor: colors.accent },
  current: { backgroundColor: colors.textMuted },
});
