import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

/** Pull-to-refresh state that refetches every query mounted on the current screen. */
export function useRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);
  return { refreshing, onRefresh };
}
