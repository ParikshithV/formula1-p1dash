import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space, type } from "../theme";

interface Props {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
}

/** Large-title header used as a list header so it scrolls with content. */
export function ScreenHeader({ eyebrow, title, right, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space.lg }}>
      <View style={styles.row}>
        <View style={styles.titles}>
          {eyebrow ? <Text style={[type.caption, styles.eyebrow]}>{eyebrow}</Text> : null}
          <Text style={type.display}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Soft red glow behind the status bar, echoing the F1 broadcast palette. */
export function ScreenGlow() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(225,6,0,0.22)", "rgba(225,6,0,0)"]}
      style={styles.glow}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: space.lg },
  titles: { flexShrink: 1 },
  eyebrow: { color: colors.accent, marginBottom: 2 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
});
