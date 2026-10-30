import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import { deliveryPointSchema } from '@/shared/orders/delivery-point';
import {
  buildRoute,
  projectOntoRoute,
  type Coordinate,
} from '@/shared/maps/vehicle-motion/geometry';
import { trackingRequest } from './request';

const responseSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('ready'),
    order_id: z.uuid(),
    provider: z.enum(['google', 'osrm']).default('google'),
    points: z.array(deliveryPointSchema).min(2).max(10000),
  }),
  z.object({
    state: z.enum(['pending', 'waiting', 'unavailable', 'ended']),
    order_id: z.uuid(),
    provider: z.enum(['google', 'osrm']).default('google'),
  }),
]);
type Fix = Coordinate & { captured_at: string; accuracy_m: number };

export function useOrderRoute(
  userId: string | undefined,
  orderId: string,
  active: boolean,
  position: Fix | null,
  provider: 'google' | 'osrm' = 'google',
) {
  const client = useQueryClient();
  const enabled = !!userId && active && !!position;
  const query = useQuery<z.infer<typeof responseSchema>>({
    queryKey: ['order-route', userId, orderId, provider],
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (state) => (enabled && state.state.data?.state === 'pending' ? 2000 : false),
    queryFn: async ({ signal }) => {
      try {
        const { data, error } = await trackingRequest(
          (requestSignal) =>
            getSupabase().functions.invoke('order-route', {
              body: { order_id: orderId, provider },
              signal: requestSignal,
            }),
          signal,
        );
        if (signal.aborted) throw new Error('Route request cancelled');
        if (error) throw error;
        const result = responseSchema.parse(data);
        if (result.order_id !== orderId || result.provider !== provider)
          throw new Error('Route from another order/provider');
        return result;
      } catch (error) {
        if (signal.aborted) throw error;
        return { state: 'unavailable' as const, order_id: orderId, provider };
      }
    },
  });
  const points = enabled && query.data?.state === 'ready' ? query.data.points : undefined;
  const geometry = useMemo(() => (points ? buildRoute(points) : null), [points]);
  const deviation = useRef({ capture: '', hits: 0, since: 0, requested: -Infinity });
  useEffect(() => {
    deviation.current = { capture: '', hits: 0, since: 0, requested: -Infinity };
    if (!enabled) return;
    const key = ['order-route', userId, orderId, provider];
    return () => {
      void client.cancelQueries({ queryKey: key, exact: true });
      client.removeQueries({ queryKey: key, exact: true });
    };
  }, [client, userId, orderId, enabled, provider]);
  useEffect(() => {
    if (!enabled || !position || !geometry || deviation.current.capture === position.captured_at)
      return;
    const state = deviation.current;
    state.capture = position.captured_at;
    const projection = projectOntoRoute(geometry, position);
    if (
      position.accuracy_m > 50 ||
      !projection ||
      projection.distanceFromRouteMeters <= Math.max(60, position.accuracy_m * 3)
    ) {
      state.hits = 0;
      state.since = 0;
      return;
    }
    const captured = Date.parse(position.captured_at);
    if (!state.hits) state.since = captured;
    state.hits++;
    if (
      state.hits >= 3 &&
      captured - state.since >= 10000 &&
      performance.now() - state.requested >= 60000
    ) {
      state.requested = performance.now();
      state.hits = 0;
      void client.invalidateQueries({
        queryKey: ['order-route', userId, orderId, provider],
        exact: true,
      });
    }
  }, [enabled, geometry, position, client, userId, orderId, provider]);
  return points;
}
