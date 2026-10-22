import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { MenuProvider } from "../src/components/Menu";
import { useSchedule } from "../src/hooks/queries";
import { PreferencesProvider, usePreferences } from "../src/hooks/usePreferences";
import { clearReminders, syncReminders } from "../src/lib/reminders";
import { colors, fonts } from "../src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } },
});

// React Query's focus refetching is browser-only by default; wire it to AppState on native.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, border: colors.line },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.mono]: require("../assets/fonts/ShareTechMono-Regular.ttf"),
    [fonts.display]: require("../assets/fonts/ShareTech-Regular.ttf"),
    [fonts.body]: require("../assets/fonts/Inter-Regular.ttf"),
    [fonts.bodyMedium]: require("../assets/fonts/Inter-Medium.ttf"),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AppShell />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

/** Holds the splash until stored preferences are read, so first-run routing never flashes. */
function AppShell() {
  const { hydrated } = usePreferences();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <RemindersSync />
      <MenuProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="race/[round]" options={{ animation: "slide_from_right", gestureEnabled: true }} />
          <Stack.Screen name="driver/[id]" options={{ animation: "slide_from_right", gestureEnabled: true }} />
          <Stack.Screen name="onboarding" options={{ animation: "fade_from_bottom", gestureEnabled: false }} />
        </Stack>
      </MenuProvider>
    </ThemeProvider>
  );
}

/** Keeps scheduled session reminders in step with the calendar and the user's settings. */
function RemindersSync() {
  const { prefs } = usePreferences();
  const schedule = useSchedule();

  useEffect(() => {
    const races = schedule.data;
    if (!prefs.reminders) {
      clearReminders().catch(() => {});
    } else if (races) {
      syncReminders(races, prefs.reminderLead).catch(() => {});
    }
  }, [prefs.reminders, prefs.reminderLead, schedule.data]);

  return null;
}
