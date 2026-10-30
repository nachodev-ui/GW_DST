import { z } from 'zod';
import { trackingPolicy, type TrackingSnapshot } from './contracts';

export const trackingClock = () => performance.now();

// Subtract the entire request duration conservatively; the device wall clock is irrelevant.
export function trackingDeadline(snapshot: TrackingSnapshot, requestStarted: number) {
  if (snapshot.state !== 'fresh') return requestStarted;
  return (
    requestStarted +
    Math.max(
      0,
      Math.min(
        trackingPolicy.freshForMs,
        Date.parse(snapshot.fresh_until) - Date.parse(snapshot.server_now),
      ),
    )
  );
}

export function trackingFailure(error: unknown) {
  const parsed = z.object({ code: z.string() }).safeParse(error);
  const code = parsed.success ? parsed.data.code : '';
  return {
    blocked: code === '42501' || code === '55000',
    message:
      code === '42501' || code === '55000'
        ? 'El seguimiento se cerró o tu acceso cambió. Actualiza el pedido.'
        : code === '22023'
          ? 'La muestra GPS no es válida. Revisa la precisión y la hora automática del teléfono.'
          : 'No pudimos actualizar la ubicación. Revisa tu conexión.',
  };
}
