import { useRef, useState } from 'react';

// Only an explicit gesture starts this indicator; background queries never control it.
export function useManualRefresh(onRefresh: (() => Promise<unknown>) | undefined) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  return {
    refreshing,
    refresh: async () => {
      if (!onRefresh || inFlight.current) return;
      inFlight.current = true;
      setRefreshing(true);
      try {
        await onRefresh();
      } catch {
        // The data owner displays errors and its available recovery actions.
      } finally {
        inFlight.current = false;
        setRefreshing(false);
      }
    },
  };
}
