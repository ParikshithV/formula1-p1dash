import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StyleSheet, type ColorValue } from "react-native";
import { haptic } from "../../src/components/ui";
import { colors, fonts } from "../../src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcon =
  (name: IconName, activeName: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? activeName : name} size={22} color={color as string} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: haptic }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("speedometer-outline", "speedometer") }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: tabIcon("calendar-outline", "calendar") }} />
      <Tabs.Screen name="standings" options={{ title: "Standings", tabBarIcon: tabIcon("trophy-outline", "trophy") }} />
      <Tabs.Screen name="news" options={{ title: "News", tabBarIcon: tabIcon("newspaper-outline", "newspaper") }} />
    </Tabs>
  );
}
