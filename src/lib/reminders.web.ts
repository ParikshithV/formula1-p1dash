import type { Race } from "../api/types";

// Web has no local notifications; this stub keeps expo-notifications out of the web bundle.

export async function requestReminderPermission(): Promise<boolean> {
  return false;
}

export async function clearReminders() {}

export async function syncReminders(_races: Race[], _leadMinutes: number, _now = Date.now()) {}
