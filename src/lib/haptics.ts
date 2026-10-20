import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let enabled = true;

/** Mirrors the user's haptics preference; set by the preferences provider. */
export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

export const haptic = (style: "select" | "light" = "select") => {
  if (!enabled || Platform.OS === "web") return;
  (style === "light" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync()).catch(() => {});
};
