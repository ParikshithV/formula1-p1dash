import { StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, space, tones, type Tone } from "../theme";
import { MenuButton, TOP_BAR_HEIGHT, Wordmark } from "./Masthead";
import { useMenu } from "./Menu";

export const useTopBarSpace = () => useSafeAreaInsets().top + TOP_BAR_HEIGHT;

/**
 * Fixed masthead: spaced wordmark and the red menu button. A hairline fades in once
 * content scrolls underneath, so the bar only separates itself when it needs to.
 */
export function TopBar({ tone = "dark", scrollY }: { tone?: Tone; scrollY?: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const menu = useMenu();
  const t = tones[tone];
  const rule = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [0, 24], [0, 1], Extrapolation.CLAMP) : 0,
  }));
  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + TOP_BAR_HEIGHT, backgroundColor: t.bg }]}>
      <View style={styles.inner}>
        <Wordmark tone={tone} />
        <MenuButton onPress={menu.open} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.rule, { backgroundColor: t.line }, rule]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.gutter,
  },
  inner: {
    width: "100%",
    maxWidth: layout.maxWidth - space.gutter * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rule: { position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
});
