import { useEffect, useSyncExternalStore } from 'react';
import { getSupabase } from '@/shared/supabase/client';
import {
  backgroundSnapshot,
  subscribeBackground,
  stopDriverBackground,
} from './background-tracking';

export function useDriverBackgroundTracking(userId: string, orderId: string, active: boolean) {
  const state = useSyncExternalStore(subscribeBackground, backgroundSnapshot, backgroundSnapshot);
  useEffect(() => {
    if (!active) void stopDriverBackground(userId, orderId).catch(() => undefined);
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== userId)
        void stopDriverBackground(userId, orderId).catch(() => undefined);
    });
    return () => {
      subscription.unsubscribe();
      void stopDriverBackground(userId, orderId).catch(() => undefined);
    };
  }, [userId, orderId, active]);
  return {
    active: active && state.scope === `${userId}:${orderId}`,
    status: state.scope === `${userId}:${orderId}` ? state.status : null,
  };
}
