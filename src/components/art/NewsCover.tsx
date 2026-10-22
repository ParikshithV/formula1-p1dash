import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, space, tones } from "../../theme";
import { FlagRender } from "./Render";

/**
 * Cover for the lead story: a rendered chequered flag on the dark band with a mono kicker.
 * Stands in for article photography, which the app doesn't have rights to show.
 */
export function NewsCover({ kicker, height = 220 }: { kicker: string; height?: number }) {
  return (
    <View style={[styles.band, { height }]}>
      <FlagRender style={[styles.flag, { height: height * 0.92 }]} />
      <View style={styles.rule} />
      <Text style={styles.kicker}>{kicker}/</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    marginHorizontal: -space.gutter,
    backgroundColor: tones.dark.band,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: space.gutter,
  },
  flag: { position: "absolute", right: -space.xl, top: space.sm, opacity: 0.9 },
  rule: { width: 40, height: 4, backgroundColor: colors.accent, marginBottom: space.md },
  kicker: { fontFamily: fonts.mono, fontSize: 44, lineHeight: 48, color: tones.dark.text, letterSpacing: -1 },
});
