import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { colors, tones, type, type Tone } from "../theme";
import { PressableScale } from "./motion";
import { haptic } from "./ui";

export const TOP_BAR_HEIGHT = 76;

export function Wordmark({ tone = "dark" }: { tone?: Tone }) {
  return <Text style={[type.wordmark, { color: tones[tone].text }]}>P1DASH.</Text>;
}

/** 3×3 dot grid, drawn rather than an icon so it matches the reference exactly. */
const GridGlyph = () => (
  <View style={styles.grid}>
    {[0, 1, 2].map((row) => (
      <View key={row} style={styles.gridRow}>
        {[0, 1, 2].map((col) => (
          <View key={col} style={styles.dot} />
        ))}
      </View>
    ))}
  </View>
);

/** Red grid button opens the menu; the white ✕ variant closes it. */
export function MenuButton({ variant = "open", onPress }: { variant?: "open" | "close"; onPress: () => void }) {
  const close = variant === "close";
  return (
    <PressableScale
      onPress={() => {
        haptic("light");
        onPress();
      }}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={close ? "Close menu" : "Open menu"}
      style={[styles.button, { backgroundColor: close ? "#FFFFFF" : colors.accent }]}
    >
      {close ? <Ionicons name="close" size={24} color="#111111" /> : <GridGlyph />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  grid: { gap: 3 },
  gridRow: { flexDirection: "row", gap: 3 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF" },
});
