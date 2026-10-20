import { StyleSheet, Text, View } from "react-native";
import { useLayout } from "../hooks/useLayout";
import { useNow } from "../hooks/useNow";
import { pad2, splitCountdown } from "../lib/format";
import { fonts, space, tones, type, type Tone } from "../theme";
import { RollingText } from "./motion";

/**
 * Label-over-value columns in mono. Digits roll as they tick – the one bit of motion
 * that tells you the clock is live without demanding attention.
 */
export function Countdown({ target, tone = "dark", size = 40 }: { target: Date; tone?: Tone; size?: number }) {
  const t = tones[tone];
  const { fit } = useLayout();
  const now = useNow(1000);
  const { days, hours, minutes, seconds } = splitCountdown(target.getTime() - now);
  const units = [
    { key: "days", value: pad2(days), label: days === 1 ? "Day" : "Days" },
    { key: "hrs", value: pad2(hours), label: "Hrs" },
    { key: "min", value: pad2(minutes), label: "Min" },
    { key: "sec", value: pad2(seconds), label: "Sec" },
  ];
  const digit = { fontFamily: fonts.mono, fontSize: fit(size), lineHeight: fit(size * 1.1), color: t.text };

  return (
    <View style={styles.row} accessibilityLabel={`${days} days ${hours} hours ${minutes} minutes`}>
      {units.map((u) => (
        <View key={u.key} style={styles.unit}>
          <Text style={[type.label, { color: t.muted }]}>{u.label}</Text>
          <RollingText value={u.value} style={digit} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.lg },
  unit: { flex: 1, gap: space.sm, alignItems: "flex-start" },
});
