import {
  locationSampleSchema,
  trackingPolicy,
  type LocationSample,
  type publishLocationResultSchema,
} from '@/shared/tracking/contracts';
import { trackingFailure } from '@/shared/tracking/freshness';
import type { z } from 'zod';

type Position = {
  timestamp: number;
  coords: { latitude: number; longitude: number; accuracy: number | null };
  mocked?: boolean;
};
export type PublisherStatus = { message: string; error: boolean; receivedAt: string | null };

export function createLocationPublisher(options: {
  orderId: string;
  publish: (
    sample: LocationSample,
    signal: AbortSignal,
  ) => Promise<z.infer<typeof publishLocationResultSchema>>;
  isActive: () => boolean;
  now: () => number;
  wallNow: () => number;
  onStatus: (status: PublisherStatus) => void;
  onClosed: () => void;
}) {
  let disposed = false;
  let busy = false;
  let nextSend = -Infinity;
  let lastCapture = -Infinity;
  let receivedAt: string | null = null;
  let inFlight: AbortController | undefined;
  const live = () => !disposed && options.isActive();
  const report = (message: string, error: boolean) => {
    if (live()) options.onStatus({ message, error, receivedAt });
  };
  return {
    stop() {
      disposed = true;
      inFlight?.abort();
    },
    async accept(position: Position) {
      if (!live() || busy || options.now() < nextSend) return;
      const age = options.wallNow() - position.timestamp;
      if (
        position.mocked ||
        !Number.isFinite(position.timestamp) ||
        Math.abs(position.timestamp) > 8.64e15 ||
        age < -5000 ||
        age >= trackingPolicy.freshForMs ||
        position.timestamp <= lastCapture
      ) {
        report('Esperando una posición GPS nueva del teléfono.', false);
        return;
      }
      const checked = locationSampleSchema.safeParse({
        order_id: options.orderId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy,
        captured_at: new Date(position.timestamp).toISOString(),
      });
      if (!checked.success) {
        report('La precisión GPS todavía es insuficiente. Acércate a un lugar despejado.', true);
        return;
      }
      busy = true;
      nextSend = options.now() + trackingPolicy.publishIntervalMs;
      lastCapture = position.timestamp;
      inFlight = new AbortController();
      try {
        const result = await options.publish(checked.data, inFlight.signal);
        if (!live()) return;
        // Start the next window after the reply to avoid network jitter defeating the server limit.
        nextSend = options.now() + trackingPolicy.publishIntervalMs;
        if (result.accepted) {
          receivedAt = result.received_at;
          report('Ubicación compartida con el cliente.', false);
        } else report('Esperando la siguiente muestra GPS.', false);
      } catch (error) {
        if (!live()) return;
        const failure = trackingFailure(error);
        report(failure.message, true);
        if (failure.blocked) {
          disposed = true;
          options.onClosed();
        }
      } finally {
        busy = false;
      }
    },
  };
}
