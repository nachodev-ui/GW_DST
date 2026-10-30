import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForegroundScreen } from '@/shared/lifecycle/use-foreground-screen';
import { getSupabase } from '@/shared/supabase/client';
import { getOrderTracking } from './data';
import { trackingPolicy, type TrackingSnapshot } from './contracts';
import { trackingClock, trackingDeadline, trackingFailure } from './freshness';

let channelId = 0;
type Reading = {
  snapshot: TrackingSnapshot | null;
  deadline: number;
  started: number;
  blocked: boolean;
  message: string | null;
};
const terminalEvent = z.object({ id: z.uuid(), status: z.enum(['delivered', 'cancelled']) });

// Lifecycle is supplied by the caller. No role or feature imports in shared code.
export function useTrackingSnapshot(userId: string | undefined, orderId: string, active: boolean) {
  const foreground = useForegroundScreen();
  const client = useQueryClient();
  const scope = `${userId}:${orderId}`;
  const [closedScope, setClosedScope] = useState<string | null>(null);
  const [, tick] = useState(0);
  const enabled = !!userId && active && foreground && closedScope !== scope;
  const queryKey = ['order-tracking', userId, orderId];
  const query = useQuery<Reading>({
    queryKey,
    enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchInterval: (state) =>
      enabled && !state.state.data?.blocked && state.state.data?.snapshot?.state !== 'ended'
        ? trackingPolicy.publishIntervalMs
        : false,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      const started = trackingClock();
      try {
        const snapshot = await getOrderTracking(orderId, signal);
        if (signal.aborted) throw new Error('Tracking request cancelled');
        return {
          snapshot,
          deadline: trackingDeadline(snapshot, started),
          started,
          blocked: false,
          message: null,
        };
      } catch (error) {
        if (signal.aborted) throw error;
        // Replace the whole reading on failure, including any cached coordinates.
        return { snapshot: null, deadline: started, started, ...trackingFailure(error) };
      }
    },
  });
  const ended = query.data?.snapshot?.state === 'ended';
  const blocked = query.data?.blocked === true;

  useEffect(() => {
    if (!enabled) return;
    const key = ['order-tracking', userId, orderId];
    return () => {
      void client.cancelQueries({ queryKey: key, exact: true });
      client.removeQueries({ queryKey: key, exact: true });
    };
  }, [client, userId, orderId, enabled]);

  useEffect(() => {
    if (!enabled || blocked || ended) return;
    const key = ['order-tracking', userId, orderId];
    const supabase = getSupabase();
    let disposed = false;
    const refresh = () => {
      if (!disposed) void client.invalidateQueries({ queryKey: key, exact: true });
    };
    const channel = supabase
      .channel(`order-tracking:${scope}:${++channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_tracking_signals',
          filter: `order_id=eq.${orderId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_tracking_signals',
          filter: `order_id=eq.${orderId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          if (disposed) return;
          const terminal = terminalEvent.safeParse(payload.new);
          if (terminal.success && terminal.data.id === orderId) setClosedScope(scope);
          else refresh();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });
    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [enabled, blocked, ended, client, userId, orderId, scope]);

  useEffect(() => {
    if (!enabled || ended || blocked) return;
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    const timeout =
      query.data?.snapshot?.state === 'fresh'
        ? setTimeout(
            () => tick((value) => value + 1),
            Math.max(0, query.data.deadline - trackingClock()),
          )
        : undefined;
    return () => {
      clearInterval(timer);
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, [enabled, ended, blocked, query.data?.deadline, query.data?.snapshot?.state]);

  const snapshot = enabled ? (query.data?.snapshot ?? null) : null;
  const expired =
    snapshot?.state === 'stale' ||
    (snapshot?.state === 'fresh' && trackingClock() >= (query.data?.deadline ?? 0));
  const position = snapshot?.state === 'fresh' && !expired ? snapshot.sample : null;
  const ageSeconds =
    snapshot?.received_at && query.data
      ? Math.max(
          0,
          Math.floor(
            (Date.parse(snapshot.server_now) -
              Date.parse(snapshot.received_at) +
              trackingClock() -
              query.data.started) /
              1000,
          ),
        )
      : null;
  return {
    snapshot,
    position,
    expired,
    ageSeconds,
    foreground,
    ended: ended || closedScope === scope,
    blocked,
    message: enabled ? (query.data?.message ?? null) : null,
    fetching: query.isFetching,
    refresh: async () => {
      if (enabled) await query.refetch({ cancelRefetch: false });
    },
  };
}
