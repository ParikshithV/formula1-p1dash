import { router, usePathname, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDriverStandings, useSchedule } from "../hooks/queries";
import { useLayout } from "../hooks/useLayout";
import { usePreferences } from "../hooks/usePreferences";
import { useNow } from "../hooks/useNow";
import { NEWS_SUPPORTED } from "../lib/platform";
import { getNextRace, isRaceComplete, shortRaceName } from "../lib/race";
import { colors, frameStyle, layout, motion, space, tones, type } from "../theme";
import { Appear, PressableScale } from "./motion";
import { MenuButton, TOP_BAR_HEIGHT, Wordmark } from "./Masthead";
import { haptic } from "./ui";

interface MenuApi {
  open: () => void;
  close: () => void;
}

const MenuContext = createContext<MenuApi | null>(null);

/** How long the destination gets to mount and finish its entrance before the menu lifts. */
const SETTLE_MS = 320;

export function useMenu() {
  const ctx = use(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside <MenuProvider>");
  return ctx;
}

/** Owns the full-screen navigation overlay that replaces a tab bar. */
export function MenuProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const api = useMemo<MenuApi>(() => ({ open: () => setVisible(true), close: () => setVisible(false) }), []);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  return (
    <MenuContext value={api}>
      {children}
      {visible ? <MenuOverlay onClose={api.close} /> : null}
    </MenuContext>
  );
}

interface Entry {
  href: Href;
  match: (path: string) => boolean;
  title: string;
  label: string;
  detail: string;
  sub: string;
}

/**
 * A timeline of destinations: the current one in white, the rest receding into grey.
 * Each carries a live detail so the menu doubles as a glanceable summary.
 */
function MenuOverlay({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { frame, compact } = useLayout();
  const pathname = usePathname();
  const now = useNow(60_000);
  const schedule = useSchedule();
  const drivers = useDriverStandings();

  const races = schedule.data ?? [];
  const next = getNextRace(races, now);
  const completed = races.filter((r) => isRaceComplete(r, now)).length;
  const leader = drivers.data?.standings[0];
  const { prefs } = usePreferences();
  const followed = drivers.data?.standings.find((s) => s.Driver.driverId === prefs.favoriteDriverId);

  const entries: Entry[] = [
    {
      href: "/",
      match: (p) => p === "/",
      title: "Home",
      label: "Next race",
      detail: next ? `Round ${next.round}` : "Season over",
      sub: next ? `${shortRaceName(next)} GP` : "See you next year",
    },
    {
      href: "/schedule",
      match: (p) => p.startsWith("/schedule") || p.startsWith("/race"),
      title: "Schedule",
      label: "Season",
      detail: races[0]?.season ?? "Calendar",
      sub: races.length ? `${completed} of ${races.length} rounds` : "Calendar",
    },
    {
      href: "/standings",
      match: (p) => p.startsWith("/standings"),
      title: "Standings",
      label: "Leader",
      detail: leader ? leader.Driver.familyName : "Championship",
      sub: leader ? `${leader.Driver.code ?? leader.Driver.familyName} ${leader.points} pts` : "Drivers & teams",
    },
    ...(NEWS_SUPPORTED
      ? [
          {
            href: "/news" as Href,
            match: (p: string) => p.startsWith("/news"),
            title: "News",
            label: "Paddock",
            detail: "formula1.com",
            sub: "Latest stories",
          },
        ]
      : []),
    {
      href: { pathname: "/onboarding", params: { mode: "edit" } },
      match: (p) => p.startsWith("/onboarding"),
      title: "Settings",
      label: "Following",
      detail: followed ? followed.Driver.familyName : "Nobody yet",
      sub: [prefs.reminders ? "Alerts on" : "Alerts off", prefs.clock === "system" ? "Auto" : prefs.clock].join(" · "),
    },
  ];

  // Size the destination titles so the longest one fits beside the caption column.
  const metaWidth = compact ? 72 : 96;
  const longest = Math.max(...entries.map((e) => e.title.length + 1));
  const titleSize = Math.min(46, (frame - space.gutter * 2 - metaWidth - space.lg) / (longest * 0.53));

  const leaving = useRef(false);
  /**
   * Navigate underneath the still-opaque menu, then fade the menu away once the new screen
   * has settled – one transition at a time instead of a fade, a screen change and the
   * screen's own entrance all fighting each other.
   */
  const go = useCallback(
    (href: Href, active: boolean) => {
      if (leaving.current) return;
      leaving.current = true;
      haptic();
      if (active) return onClose();
      router.navigate(href);
      setTimeout(onClose, SETTLE_MS);
    },
    [onClose],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(motion.base).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(motion.base).reduceMotion(ReduceMotion.System)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <StatusBar style="light" />
      <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + TOP_BAR_HEIGHT }]}>
        <View style={styles.barInner}>
          <Wordmark />
          <MenuButton variant="close" onPress={onClose} />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, frameStyle, { paddingBottom: insets.bottom + space.xxl }]}>
        {entries.map((entry, i) => {
          const active = entry.match(pathname);
          const color = active ? tones.dark.text : tones.dark.dim;
          return (
            <Appear key={entry.title} index={i + 1}>
              <PressableScale
                onPress={() => go(entry.href, active)}
                scaleTo={0.98}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={styles.entry}
              >
                <View style={[styles.meta, { width: metaWidth }]}>
                  <Text style={[type.label, styles.metaText, { color: active ? tones.dark.text : tones.dark.dim }]}>
                    {entry.label}
                  </Text>
                  <Text style={[type.body, styles.metaText, { color: active ? tones.dark.muted : tones.dark.dim }]}>
                    {entry.detail}
                  </Text>
                </View>
                <View style={styles.titles}>
                  <Text numberOfLines={1} style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.1, color }]}>
                    {entry.title.toUpperCase()}/
                  </Text>
                  <Text style={[type.value, styles.sub, { fontSize: Math.min(18, titleSize * 0.42), color }]}>
                    {entry.sub.toUpperCase()}
                  </Text>
                </View>
              </PressableScale>
            </Appear>
          );
        })}
        <Appear index={entries.length + 1} style={styles.credits}>
          <Text style={[type.label, styles.creditText]}>
            Unofficial fan app – not affiliated with Formula 1, the FIA or any team. Results data: Jolpica F1 (CC
            BY-NC-SA 4.0). Circuit outlines: bacinger/f1-circuits (MIT). Illustrations are original artwork.
          </Text>
        </Appear>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, backgroundColor: colors.bg },
  bar: { alignItems: "center", justifyContent: "center", paddingHorizontal: space.gutter },
  barInner: {
    width: "100%",
    maxWidth: layout.maxWidth - space.gutter * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  list: { paddingHorizontal: space.gutter, paddingTop: space.xxl, gap: space.xxl + 8 },
  entry: { flexDirection: "row", gap: space.lg },
  meta: { paddingTop: 8, gap: 6 },
  metaText: { textAlign: "right" },
  titles: { flex: 1, gap: space.sm },
  title: { fontFamily: type.title.fontFamily, fontSize: 46, lineHeight: 50, letterSpacing: -1 },
  sub: { fontSize: 18, lineHeight: 22 },
  credits: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tones.dark.line, paddingTop: space.lg },
  creditText: { color: tones.dark.dim },
});
