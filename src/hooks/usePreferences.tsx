import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { setHapticsEnabled } from "../lib/haptics";

const STORAGE_KEY = "p1dash.preferences";
/** Pre-preferences builds stored only the followed driver under this key. */
const LEGACY_DRIVER_KEY = "p1dash.favoriteDriver";

export type ClockFormat = "system" | "12h" | "24h";
export type ReminderLead = 15 | 30 | 60;

export interface Preferences {
  /** Set once the first-run setup has been completed or skipped. */
  onboarded: boolean;
  favoriteDriverId: string | null;
  favoriteTeamId: string | null;
  clock: ClockFormat;
  /** Local notification before each session (native only). */
  reminders: boolean;
  reminderLead: ReminderLead;
  haptics: boolean;
}

const DEFAULTS: Preferences = {
  onboarded: false,
  favoriteDriverId: null,
  favoriteTeamId: null,
  clock: "system",
  reminders: false,
  reminderLead: 15,
  haptics: true,
};

interface PreferencesContextValue {
  prefs: Preferences;
  /** False until stored preferences have been read; gate first-run routing on it. */
  hydrated: boolean;
  update: (patch: Partial<Preferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

async function load(): Promise<Preferences> {
  const [stored, legacyDriver] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(LEGACY_DRIVER_KEY),
  ]);
  if (stored) return { ...DEFAULTS, ...(JSON.parse(stored) as Partial<Preferences>) };
  // Existing users already chose a driver, so don't send them through setup again.
  if (legacyDriver) return { ...DEFAULTS, favoriteDriverId: legacyDriver, onboarded: true };
  return DEFAULTS;
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    load()
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => setHapticsEnabled(prefs.haptics), [prefs.haptics]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, hydrated, update }), [prefs, hydrated, update]);
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const ctx = use(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}

/** Followed-driver selector used by lists; toggling the same driver unfollows. */
export function useFavoriteDriver() {
  const { prefs, update } = usePreferences();
  const { favoriteDriverId } = prefs;
  const toggleFavorite = useCallback(
    (driverId: string) => update({ favoriteDriverId: favoriteDriverId === driverId ? null : driverId }),
    [favoriteDriverId, update],
  );
  return { favoriteDriverId, toggleFavorite };
}
