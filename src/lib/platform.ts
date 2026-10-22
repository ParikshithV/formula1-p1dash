import { Platform } from "react-native";

/** formula1.com sends no CORS headers, so the news feed can't load in a browser. */
export const NEWS_SUPPORTED = Platform.OS !== "web";

/** Local notifications need a native runtime. */
export const REMINDERS_SUPPORTED = Platform.OS !== "web";
