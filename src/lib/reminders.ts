import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Race } from "../api/types";
import { REMINDERS_SUPPORTED } from "./platform";
import { getSessions, isRaceComplete, shortRaceName } from "./race";

const CHANNEL = "sessions";
/** iOS keeps at most 64 pending local notifications; stay well under it. */
const MAX_SCHEDULED = 40;

if (REMINDERS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Asks for notification permission; resolves false if declined or unsupported. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Session reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function clearReminders() {
  if (!REMINDERS_SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Replaces all scheduled reminders with one per upcoming session, `leadMinutes` before it
 * starts. Idempotent, so it can simply re-run whenever the schedule or settings change.
 */
export async function syncReminders(races: Race[], leadMinutes: number, now = Date.now()) {
  if (!REMINDERS_SUPPORTED) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  const upcoming = races
    .filter((race) => !isRaceComplete(race, now))
    .flatMap((race) => getSessions(race).map((session) => ({ race, session })))
    .filter(({ session }) => session.timeKnown && session.start.getTime() - leadMinutes * 60_000 > now)
    .slice(0, MAX_SCHEDULED);

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all(
    upcoming.map(({ race, session }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `${shortRaceName(race)} GP · ${session.name}`,
          body: `Starts in ${leadMinutes} minutes.`,
          data: { round: race.round },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(session.start.getTime() - leadMinutes * 60_000),
          channelId: CHANNEL,
        },
      }),
    ),
  );
}
