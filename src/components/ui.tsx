import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useLayout } from "../hooks/useLayout";
import { haptic } from "../lib/haptics";
import { colors, fonts, motion, space, tones, type, type Tone } from "../theme";
import { Appear, PressableScale } from "./motion";

export { haptic } from "../lib/haptics";

/** Small sentence-case label over a large mono value – the core unit of every screen. */
export function Field({
  label,
  value,
  sub,
  tone = "dark",
  size = "md",
  style,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: Tone;
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const t = tones[tone];
  const { fit } = useLayout();
  const base = size === "lg" ? type.valueLg : type.value;
  return (
    <View style={[styles.field, style]}>
      <Text style={[type.label, { color: t.muted }]}>{label}</Text>
      <Text style={[base, styles.upper, { fontSize: fit(base.fontSize), lineHeight: fit(base.lineHeight), color: t.text }]}>
        {value}
      </Text>
      {sub ? <Text style={[type.label, { color: t.muted }]}>{sub}</Text> : null}
    </View>
  );
}

export const FieldRow = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.fieldRow, style]}>{children}</View>
);

/** Mono heading with a trailing slash and an optional pill action. */
export function SectionHeader({
  title,
  action,
  onAction,
  tone = "dark",
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  tone?: Tone;
}) {
  const t = tones[tone];
  const { fit } = useLayout();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[type.heading, styles.upper, styles.sectionTitle, { fontSize: fit(type.heading.fontSize), color: t.text }]}
      >
        {title}/
      </Text>
      {action && onAction ? <PillButton label={action} onPress={onAction} tone={tone} /> : null}
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * The app's one button shape: an outlined capsule with an icon. Anything that performs an
 * action looks like this, so it never reads as plain text. `solid` is for the primary action.
 */
export function PillButton({
  label,
  onPress,
  tone = "dark",
  icon = "arrow-forward",
  iconPosition = "end",
  variant = "outline",
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  icon?: IconName;
  iconPosition?: "start" | "end";
  variant?: "outline" | "solid";
  style?: StyleProp<ViewStyle>;
}) {
  const t = tones[tone];
  const solid = variant === "solid";
  const fg = solid ? t.bg : t.text;
  const glyph = <Ionicons name={icon} size={15} color={fg} />;
  return (
    <PressableScale
      onPress={() => {
        haptic();
        onPress();
      }}
      hitSlop={8}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.pill, solid ? { backgroundColor: t.text } : { borderColor: t.text, borderWidth: 1 }, style]}
    >
      {iconPosition === "start" ? glyph : null}
      <Text style={[styles.pillLabel, { color: fg }]}>{label}</Text>
      {iconPosition === "end" ? glyph : null}
    </PressableScale>
  );
}

/** Round icon-only button with a visible ring, so toggles like ★ read as tappable. */
export function IconButton({
  icon,
  onPress,
  label,
  tone = "dark",
  color,
  size = 36,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: Tone;
  color?: string;
  size?: number;
}) {
  const t = tones[tone];
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={6}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconButton, { width: size, height: size, borderRadius: size / 2, borderColor: t.line }]}
    >
      <Ionicons name={icon} size={size * 0.44} color={color ?? t.text} />
    </PressableScale>
  );
}

/** Trailing marker for whole-row links: chevron for in-app, arrow-out for external. */
export function RowAffordance({ external, tone = "dark", color }: { external?: boolean; tone?: Tone; color?: string }) {
  return (
    <Ionicons
      name={external ? "arrow-up-outline" : "chevron-forward"}
      size={18}
      color={color ?? tones[tone].muted}
      style={external ? styles.external : undefined}
    />
  );
}

/** Advance of Share Tech Mono as a fraction of font size, with a little headroom for letter-spacing. */
const MONO_ADVANCE = 0.52;

/**
 * Oversized mono title like a magazine masthead. It sets on one line when that fits at a
 * readable size; otherwise it breaks between words, sized so the longest word still fits.
 * Never truncates.
 */
export function BigTitle({
  text,
  tone = "dark",
  size = type.title.fontSize,
  minSize = 56,
}: {
  text: string;
  tone?: Tone;
  size?: number;
  minSize?: number;
}) {
  const { inner, fit } = useLayout();
  const label = `${text}/`;
  const oneLine = inner / (label.length * MONO_ADVANCE);
  const longestWord = Math.max(...label.split(/\s+/).map((w) => w.length));
  const fitted = oneLine >= fit(minSize) ? Math.min(size, oneLine) : Math.min(size, inner / (longestWord * MONO_ADVANCE));
  return (
    <Appear style={styles.bigTitleWrap}>
      <Text style={[type.title, styles.upper, { fontSize: fitted, lineHeight: fitted * 1.05, color: tones[tone].text }]}>
        {label}
      </Text>
    </Appear>
  );
}

/** Outlined ring with a "Label →" that spills past its edge. Used for the primary forward action. */
export function CircleButton({
  label,
  onPress,
  tone = "dark",
  size = 104,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: number;
}) {
  const t = tones[tone];
  return (
    <PressableScale
      onPress={() => {
        haptic("light");
        onPress();
      }}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.circleWrap, { width: size, height: size }]}
    >
      <Animated.View
        entering={FadeIn.duration(motion.slow).reduceMotion(ReduceMotion.System)}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: t.text }]}
      />
      <View style={[styles.circleLabel, { left: size * 0.4 }]}>
        <Text numberOfLines={1} style={[styles.pillLabel, { color: t.text }]}>
          {label}
        </Text>
        <Ionicons name="arrow-forward" size={15} color={t.text} />
      </View>
    </PressableScale>
  );
}

/** Chequered-flag block. Squares fall in one after another on mount. */
export function Checker({
  cell,
  cols = 3,
  rows = 3,
  tone = "dark",
  style,
}: {
  cell: number;
  cols?: number;
  rows?: number;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const t = tones[tone];
  return (
    <View style={[{ width: cell * cols, height: cell * rows, flexDirection: "row", flexWrap: "wrap" }, style]}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const filled = (Math.floor(i / cols) + (i % cols)) % 2 === 0;
        return (
          <Animated.View
            key={i}
            entering={FadeIn.delay(120 + i * 35).duration(motion.fast).reduceMotion(ReduceMotion.System)}
            style={{ width: cell, height: cell, backgroundColor: filled ? t.text : t.bg }}
          />
        );
      })}
    </View>
  );
}

/**
 * Segmented control: an outlined track with a solid thumb that springs to the active
 * option, so the choices read unmistakably as buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "dark",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  tone?: Tone;
}) {
  const t = tones[tone];
  const [width, setWidth] = useState(0);
  const segment = options.length ? width / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (!segment) return;
    // First measurement snaps into place; later changes spring.
    x.value = placed.value ? withSpring(index * segment, motion.spring) : index * segment;
    placed.value = true;
  }, [index, segment, x, placed]);

  const thumb = useAnimatedStyle(() => ({ width: segment, opacity: placed.value ? 1 : 0, transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.segmented, { borderColor: t.line }]} accessibilityRole="tablist">
      <View style={styles.segmentRow} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.thumb, { backgroundColor: t.text }, thumb]} />
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.segment}
              onPress={() => {
                if (!selected) {
                  haptic();
                  onChange(option.value);
                }
              }}
            >
              <Text numberOfLines={1} style={[styles.pillLabel, { color: selected ? t.bg : t.muted }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** On/off switch. The thumb springs across and the track fills, so state is visible at a glance. */
export function Toggle({
  value,
  onChange,
  label,
  tone = "dark",
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  tone?: Tone;
  disabled?: boolean;
}) {
  const t = tones[tone];
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, motion.spring);
  }, [value, progress]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 22 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic();
        onChange(!value);
      }}
      style={[
        styles.toggle,
        { borderColor: value ? colors.accent : t.line, backgroundColor: value ? colors.accent : "transparent", opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Animated.View style={[styles.toggleThumb, { backgroundColor: value ? "#FFFFFF" : t.muted }, thumb]} />
    </Pressable>
  );
}

/** Selection ring for choice rows; the dot pops in when chosen. */
export function Radio({ selected, tone = "dark" }: { selected: boolean; tone?: Tone }) {
  const t = tones[tone];
  const scale = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0, motion.spring);
  }, [selected, scale]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={[styles.radio, { borderColor: selected ? colors.accent : t.line }]}>
      <Animated.View style={[styles.radioDot, dot]} />
    </View>
  );
}

export function LiveDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.liveDot, style]} />;
}

export function Skeleton({
  height,
  width = "100%",
  tone = "dark",
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ height, width, backgroundColor: tones[tone].band }, animated, style]} />;
}

export function ErrorState({ message, onRetry, tone = "dark" }: { message?: string; onRetry?: () => void; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={styles.centerState}>
      <Text style={[type.heading, { color: t.text }]}>NO SIGNAL/</Text>
      <Text style={[type.body, styles.centerText, { color: t.muted }]}>
        {message ?? "Couldn't load data. Check your connection."}
      </Text>
      {onRetry ? <PillButton label="Try again" icon="refresh" onPress={onRetry} tone={tone} /> : null}
    </View>
  );
}

export function EmptyState({ message, tone = "dark" }: { message: string; tone?: Tone }) {
  return (
    <View style={styles.centerState}>
      <Text style={[type.body, styles.centerText, { color: tones[tone].muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: "uppercase" },
  field: { flex: 1, gap: space.sm },
  fieldRow: { flexDirection: "row", gap: space.lg },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: space.md,
    marginTop: space.section,
    marginBottom: space.xl,
  },
  sectionTitle: { flexShrink: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillLabel: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  iconButton: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  external: { transform: [{ rotate: "45deg" }] },
  bigTitleWrap: { marginTop: space.xl },
  // Leaves room for the label that spills past the ring.
  circleWrap: { justifyContent: "center", marginRight: 36 },
  circle: { position: "absolute", borderWidth: 1 },
  circleLabel: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6 },
  segmented: { borderWidth: 1, borderRadius: 999, padding: 3 },
  segmentRow: { flexDirection: "row" },
  segment: { flex: 1, height: 34, alignItems: "center", justifyContent: "center" },
  thumb: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999 },
  toggle: { width: 52, height: 30, borderRadius: 15, borderWidth: 1, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 22, height: 22, borderRadius: 11 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  centerState: { alignItems: "flex-start", paddingVertical: space.xxl, gap: space.md },
  centerText: { maxWidth: 300 },
});
