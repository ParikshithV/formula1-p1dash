import { Redirect, Tabs } from "expo-router";
import { BottomNav } from "../../src/components/BottomNav";
import { usePreferences } from "../../src/hooks/usePreferences";
import { NEWS_SUPPORTED } from "../../src/lib/platform";
import { colors } from "../../src/theme";

/**
 * A flat bottom nav for quick switching; the red menu button opens the full overview. Tabs
 * switch instantly – screens already stagger their content in on first visit, and a
 * cross-fade on top of that reads as a double transition.
 */
export default function TabsLayout() {
  const { prefs } = usePreferences();
  // First launch goes through setup; preferences are already hydrated by the root shell.
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, animation: "none", sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="standings" options={{ title: "Standings" }} />
      <Tabs.Screen name="news" options={{ title: "News", href: NEWS_SUPPORTED ? undefined : null }} />
    </Tabs>
  );
}
