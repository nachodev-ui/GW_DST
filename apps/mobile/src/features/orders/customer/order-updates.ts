import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';

let subscriptionId = 0;

// Mounted once in the customer layout: list and detail share the subscription.
export function useCustomerOrderUpdates() {
  const { session } = useAuth();
  const client = useQueryClient();
  const focused = useIsFocused();
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId || !focused) return;
    const supabase = getSupabase();
    let active = AppState.currentState === 'active';
    let connected = false;
    let disposed = false;
    let dirty = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      if (disposed) return;
      if (!active) {
        dirty = true;
        return;
      }
      dirty = false;
      void client.invalidateQueries({ queryKey: ['customer-orders', userId] });
    };
    const updatePolling = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (active && !connected && !disposed) timer = setInterval(refresh, 15_000);
    };
    // Removal is asynchronous; a remount must not reuse a subscribed channel.
    const channel = supabase
      .channel(`customer-orders:${userId}:${++subscriptionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` },
        // Notifications only invalidate; query responses pass through zod before use.
        refresh,
      )
      .subscribe((status) => {
        if (disposed) return;
        connected = status === 'SUBSCRIBED';
        updatePolling();
        // Close the gap between the initial query and subscription/reconnection.
        if (connected) refresh();
      });
    updatePolling();
    const listener = AppState.addEventListener('change', (state) => {
      const resumed = !active && state === 'active';
      active = state === 'active';
      updatePolling();
      if (resumed || (active && dirty)) refresh();
    });
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      listener.remove();
      void supabase.removeChannel(channel);
    };
  }, [client, userId, focused]);
}
