import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, layout, motion, space, tones } from "../theme";
import { haptic } from "./ui";

const BAR_HEIGHT = 60;
const MARKER = 6;

/**
 * Flat editorial nav: mono labels, the active one in white with its slash, and a small red
 * square that springs to it. It's the quick switcher; the menu is the overview.
 */
export function BottomNav({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => !(descriptors[r.key].options as { hidden?: boolean }).hidden);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, routes.findIndex((r) => r.key === activeKey));

  const [width, setWidth] = useState(0);
  const itemWidth = routes.length ? width / routes.length : 0;
  const x = useSharedValue(0);
  const ready = useSharedValue(false);

  useEffect(() => {
    if (!itemWidth) return;
    const target = activeIndex * itemWidth + (itemWidth - MARKER) / 2;
    // Snap on first layout, spring afterwards.
    x.value = ready.value ? withSpring(target, motion.spring) : target;
    ready.value = true;
  }, [activeIndex, itemWidth, x, ready]);

  const marker = useAnimatedStyle(() => ({ opacity: ready.value ? 1 : 0, transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: BAR_HEIGHT + insets.bottom }]}>
      <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.marker, marker]} />
        {routes.map((route) => {
          const focused = route.key === activeKey;
          const label = (descriptors[route.key].options.title ?? route.name).toUpperCase();
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.item}
              onPress={() => {
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic();
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
            >
              <Text style={[styles.label, { color: focused ? tones.dark.text : tones.dark.dim }]}>
                {label}
                {focused ? "/" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingHorizontal: space.sm,
  },
  row: { flex: 1, flexDirection: "row", width: "100%", maxWidth: layout.maxWidth, alignSelf: "center" },
  marker: { position: "absolute", top: 0, left: 0, width: MARKER, height: MARKER, backgroundColor: colors.accent },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.mono, fontSize: 14, letterSpacing: 0.5 },
});
