import { StyleSheet, Text, View } from "react-native";
import { useNow } from "../hooks/useNow";
import { pad2, splitCountdown } from "../lib/format";
import { colors, fonts, radius } from "../theme";

export function Countdown({ target, compact }: { target: Date; compact?: boolean }) {
  const now = useNow(1000);
  const { days, hours, minutes, seconds } = splitCountdown(target.getTime() - now);
  const units = [
    { value: days, label: "Days" },
    { value: hours, label: "Hrs" },
    { value: minutes, label: "Min" },
    { value: seconds, label: "Sec" },
  ];

  if (compact) {
    return (
      <Text style={styles.compact}>
        {days > 0 ? `${days}d ` : ""}
        {pad2(hours)}:{pad2(minutes)}:{pad2(seconds)}
      </Text>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={`${days} days ${hours} hours ${minutes} minutes`}>
      {units.map((u) => (
        <View key={u.label} style={styles.unit}>
          <Text style={styles.value}>{pad2(u.value)}</Text>
          <Text style={styles.label}>{u.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  unit: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  value: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, color: colors.text, fontVariant: ["tabular-nums"] },
  label: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  compact: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, fontVariant: ["tabular-nums"] },
});
