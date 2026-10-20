import { useEffect, type PropsWithChildren } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  FadeOutUp,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { motion } from "../theme";

const easeOut = Easing.bezier(...motion.easeOut);
const easeIn = Easing.bezier(...motion.easeIn);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** How far the element sinks while pressed. Keep subtle. */
  scaleTo?: number;
}

/** Press feedback: a quick spring down to ~97% and back. Replaces opacity flashes. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, children, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, motion.spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.spring);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

interface AppearProps extends PropsWithChildren {
  /** Position in a list; drives the stagger. Items past ~10 render without an entrance. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrance for content on first mount: 12px rise + fade, staggered. Long lists cap the
 * delay so nothing waits on off-screen rows. Honours the OS "reduce motion" setting.
 */
export function Appear({ index = 0, style, children }: AppearProps) {
  // Rows mounted later by list virtualisation shouldn't fade in as they scroll into view.
  if (index > 10) return <View style={style}>{children}</View>;
  let entering = FadeInDown.duration(motion.base + 60)
    .delay(Math.min(index, 8) * motion.stagger)
    .easing(easeOut)
    .reduceMotion(ReduceMotion.System);
  // Custom initial values become ad-hoc keyframes on web, which Reanimated leaves
  // absolutely positioned afterwards – keep the stock preset there.
  if (Platform.OS !== "web") entering = entering.withInitialValues({ transform: [{ translateY: 12 }] });
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

const rollIn = FadeInDown.duration(motion.base).easing(easeOut).reduceMotion(ReduceMotion.System);
const rollOut = FadeOutUp.duration(motion.fast).easing(easeIn).reduceMotion(ReduceMotion.System);

/**
 * Odometer-style text: each character rolls up independently when it changes, so a
 * ticking countdown only animates the digits that actually moved.
 */
export function RollingText({ value, style }: { value: string; style: StyleProp<TextStyle> }) {
  const chars = value.split("");
  return (
    <View style={styles.rollRow}>
      {chars.map((char, i) => (
        // Keyed from the right so "10" → "9" doesn't shift every slot.
        <View key={chars.length - i} style={styles.rollSlot}>
          <Text style={[style, styles.ghost]}>{char}</Text>
          <Animated.Text key={char} entering={rollIn} exiting={rollOut} style={[style, styles.rollChar]}>
            {char}
          </Animated.Text>
        </View>
      ))}
    </View>
  );
}

/** Horizontal fill that grows to `ratio` on mount and eases between later values. */
export function FillBar({
  ratio,
  color,
  delay = 0,
  height = 3,
  trackColor = "rgba(255,255,255,0.08)",
}: {
  ratio: number;
  color: string;
  delay?: number;
  height?: number;
  trackColor?: string;
}) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    progress.value = reduce
      ? ratio
      : withDelay(delay, withTiming(ratio, { duration: motion.slow, easing: easeOut }));
  }, [ratio, delay, reduce, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0.02, progress.value) * 100}%` }));
  return (
    <View style={[styles.track, { height, borderRadius: height, backgroundColor: trackColor }]}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden" },
  rollRow: { flexDirection: "row", overflow: "hidden" },
  rollSlot: { alignItems: "center" },
  ghost: { opacity: 0 },
  rollChar: { position: "absolute", top: 0, left: 0, right: 0, textAlign: "center" },
});

/** Shared scroll position for scroll-linked chrome (top bar rule, parallax). */
export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  return { scrollY, onScroll };
}
