import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import { trackingRequest } from './request';
import {
  locationSampleSchema,
  publishLocationResultSchema,
  trackingSnapshotSchema,
  type LocationSample,
} from '@/shared/tracking/contracts';

export async function publishOrderLocation(input: LocationSample, signal?: AbortSignal) {
  const sample = locationSampleSchema.parse(input);
  const { data, error } = await trackingRequest(
    (requestSignal) =>
      getSupabase()
        .rpc('publish_order_location', {
          p_order_id: sample.order_id,
          p_latitude: sample.latitude,
          p_longitude: sample.longitude,
          p_captured_at: sample.captured_at,
          p_accuracy_m: sample.accuracy_m,
        })
        .abortSignal(requestSignal),
    signal,
  );
  if (error) throw error;
  return publishLocationResultSchema.parse(data);
}

export async function getOrderTracking(orderId: string, signal?: AbortSignal) {
  const { data, error } = await trackingRequest(
    (requestSignal) =>
      getSupabase()
        .rpc('get_order_tracking', {
          p_order_id: z.uuid().parse(orderId),
        })
        .abortSignal(requestSignal),
    signal,
  );
  if (error) throw error;
  const snapshot = trackingSnapshotSchema.parse(data);
  if (snapshot.order_id !== orderId) throw new Error('Respuesta GPS de otro pedido.');
  return snapshot;
}
