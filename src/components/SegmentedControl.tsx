import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { colors, radius, type } from "../theme";
import { haptic } from "./ui";

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const [width, setWidth] = useState(0);
  const segment = width / options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const indicator = useAnimatedStyle(() => ({
    width: segment - 4,
    transform: [{ translateX: withSpring(index * segment, { damping: 20, stiffness: 220 }) }],
  }));

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? <Animated.View style={[styles.indicator, indicator]} /> : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                haptic();
                onChange(option.value);
              }
            }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  indicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8 },
  label: { ...type.label, color: colors.textDim },
  labelActive: { color: colors.text },
});
