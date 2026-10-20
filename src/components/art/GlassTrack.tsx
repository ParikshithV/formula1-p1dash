import { memo } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { space } from "../../theme";
import { TrackRender, trackRenderRatio, trackSource } from "./Render";

type Props = {
  circuitId: string;
  /** Drift for the coloured bloom behind the glass (e.g. scroll parallax). */
  bloomStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  style?: StyleProp<ViewStyle>;
};

/**
 * The neon circuit on a pane of frosted glass: a heavily blurred copy of the circuit spills
 * its sector colours behind a translucent panel with a hairline rim and a soft sheen, and the
 * crisp line sits on the glass. Meant for dark backgrounds.
 */
function GlassTrackBase({ circuitId, bloomStyle, style }: Props) {
  const source = trackSource(circuitId);
  // Wide layouts span the panel; tall ones are capped by height so they don't tower.
  const wide = trackRenderRatio(circuitId) >= 1.2;
  return (
    <View style={[styles.wrap, style]}>
      {source ? (
        <Animated.View pointerEvents="none" style={[styles.bloom, bloomStyle]}>
          <Image source={source} blurRadius={28} resizeMode="contain" style={styles.bloomImage} />
        </Animated.View>
      ) : null}
      <View style={styles.glass}>
        <View pointerEvents="none" style={styles.sheen} />
        <View pointerEvents="none" style={styles.rimTop} />
        <TrackRender circuitId={circuitId} style={wide ? styles.trackWide : styles.trackTall} />
      </View>
    </View>
  );
}

export const GlassTrack = memo(GlassTrackBase);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.gutter, paddingVertical: space.xl },
  bloom: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.85, transform: [{ scale: 1.15 }] },
  bloomImage: { width: "100%", height: "100%" },
  glass: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: space.lg,
  },
  // A broad diagonal band of light across the pane.
  sheen: {
    position: "absolute",
    top: "-60%",
    left: "-30%",
    width: "70%",
    height: "220%",
    backgroundColor: "rgba(255,255,255,0.045)",
    transform: [{ rotate: "24deg" }],
  },
  rimTop: { position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: "rgba(255,255,255,0.28)" },
  trackWide: { width: "90%", alignSelf: "center" },
  trackTall: { height: 320, alignSelf: "center" },
});
