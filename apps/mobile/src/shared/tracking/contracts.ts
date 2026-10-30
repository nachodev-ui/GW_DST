import { z } from 'zod';
import { deliveryPointSchema } from '@/shared/orders/delivery-point';

export const trackingPolicy = { publishIntervalMs: 5000, freshForMs: 30000 } as const;
const timestamp = z.iso.datetime({ offset: true });
export const locationSampleSchema = deliveryPointSchema.extend({
  order_id: z.uuid(),
  captured_at: timestamp,
  accuracy_m: z.number().finite().min(0).max(1000),
});
const receivedSampleSchema = locationSampleSchema.omit({ order_id: true }).extend({
  received_at: timestamp,
});
const snapshotSchema = z.object({
  order_id: z.uuid(),
  server_now: timestamp,
  destination: deliveryPointSchema.nullable(),
});
export const trackingSnapshotSchema = z
  .discriminatedUnion('state', [
    snapshotSchema.extend({
      state: z.literal('fresh'),
      received_at: timestamp,
      fresh_until: timestamp,
      sample: receivedSampleSchema,
    }),
    snapshotSchema.extend({
      state: z.literal('stale'),
      received_at: timestamp,
      fresh_until: timestamp,
      sample: z.null(),
    }),
    snapshotSchema.extend({
      state: z.enum(['waiting', 'ended']),
      received_at: z.null(),
      fresh_until: z.null(),
      sample: z.null(),
    }),
  ])
  .refine((snapshot) => snapshot.state !== 'ended' || snapshot.destination === null);
export const publishLocationResultSchema = z.discriminatedUnion('accepted', [
  z.object({ accepted: z.literal(true), reason: z.literal('accepted'), received_at: timestamp }),
  z.object({
    accepted: z.literal(false),
    reason: z.enum(['out_of_order', 'rate_limited']),
    received_at: timestamp,
  }),
]);
export type LocationSample = z.infer<typeof locationSampleSchema>;
export type TrackingSnapshot = z.infer<typeof trackingSnapshotSchema>;
