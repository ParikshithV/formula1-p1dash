import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { FavoriteDriverProvider } from "../src/hooks/useFavoriteDriver";
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
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, border: colors.border },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.light]: require("../assets/fonts/TitilliumWeb-Light.ttf"),
    [fonts.regular]: require("../assets/fonts/TitilliumWeb-Regular.ttf"),
    [fonts.semibold]: require("../assets/fonts/TitilliumWeb-SemiBold.ttf"),
    [fonts.bold]: require("../assets/fonts/TitilliumWeb-Bold.ttf"),
    [fonts.black]: require("../assets/fonts/TitilliumWeb-Black.ttf"),
  });

  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <FavoriteDriverProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="race/[round]" options={{ animation: "slide_from_right" }} />
          </Stack>
        </ThemeProvider>
      </FavoriteDriverProvider>
    </QueryClientProvider>
  );
}
