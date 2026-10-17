import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

const STORAGE_KEY = "p1dash.favoriteDriver";

interface FavoriteContextValue {
  favoriteDriverId: string | null;
  toggleFavorite: (driverId: string) => void;
}

const FavoriteContext = createContext<FavoriteContextValue>({
  favoriteDriverId: null,
  toggleFavorite: () => {},
});

export function FavoriteDriverProvider({ children }: PropsWithChildren) {
  const [favoriteDriverId, setFavoriteDriverId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(setFavoriteDriverId).catch(() => {});
  }, []);

  const toggleFavorite = useCallback((driverId: string) => {
    setFavoriteDriverId((current) => {
      const next = current === driverId ? null : driverId;
      (next ? AsyncStorage.setItem(STORAGE_KEY, next) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ favoriteDriverId, toggleFavorite }), [favoriteDriverId, toggleFavorite]);

  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>;
}

export const useFavoriteDriver = () => useContext(FavoriteContext);
