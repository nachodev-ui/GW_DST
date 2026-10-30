// Bound stalled requests without queuing old locations for reconnection.
export async function trackingRequest<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new Error('Tracking request cancelled');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 10_000);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
