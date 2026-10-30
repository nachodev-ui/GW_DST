import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import type * as TaskManagerModule from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import { getOrderTracking, publishOrderLocation } from '@/shared/tracking/data';
import { trackingClock, trackingFailure } from '@/shared/tracking/freshness';
import { trackingPolicy } from '@/shared/tracking/contracts';
import { theme } from '@/theme';
import { createLocationPublisher, type PublisherStatus } from './location-publisher';

export const DRIVER_LOCATION_TASK = 'gasway-driver-navigation-v1';
// Load the driver-only native runtime synchronously, without touching it in iPhone Expo Go.
const TaskManager =
  Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- Task registration must be synchronous; iPhone Expo Go must not load this native module.
      (require('expo-task-manager') as typeof TaskManagerModule)
    : null;
const intentKey = 'gasway.driver.navigation';
const intentSchema = z
  .object({ userId: z.uuid(), orderId: z.uuid(), runId: z.uuid(), expiresAt: z.number().finite() })
  .strict();
type Intent = z.infer<typeof intentSchema>;
const positionsSchema = z.object({
  locations: z
    .array(
      z.object({
        timestamp: z.number().finite(),
        mocked: z.boolean().optional(),
        coords: z.object({
          latitude: z.number().finite(),
          longitude: z.number().finite(),
          accuracy: z.number().nullable(),
        }),
      }),
    )
    .max(1000),
});
type State = { scope: string | null; status: PublisherStatus | null };
let state: State = { scope: null, status: null };
let current: Intent | null = null;
let epoch = 0;
let serial: Promise<unknown> = Promise.resolve();
let publisher: ReturnType<typeof createLocationPublisher> | null = null;
let publisherRun: string | null = null;
const listeners = new Set<() => void>();
const scopeOf = (value: Intent) => `${value.userId}:${value.orderId}`;
const emit = (value: State) => {
  state = value;
  listeners.forEach((listener) => listener());
};
export const backgroundSnapshot = () => state;
export const subscribeBackground = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const enqueue = <T>(operation: () => Promise<T>) => {
  const next = serial.then(operation, operation);
  serial = next.catch(() => undefined);
  return next;
};
async function readIntent() {
  const raw = await SecureStore.getItemAsync(intentKey);
  if (!raw) return null;
  try {
    return intentSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
async function stopNative() {
  await SecureStore.deleteItemAsync(intentKey);
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK))
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}

export function stopDriverBackground(userId?: string, orderId?: string) {
  if (
    current &&
    ((userId && current.userId !== userId) || (orderId && current.orderId !== orderId))
  )
    return Promise.resolve();
  const version = ++epoch;
  publisher?.stop();
  publisher = null;
  publisherRun = null;
  current = null;
  emit({ scope: null, status: null });
  if (Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient')
    return Promise.resolve();
  return enqueue(async () => {
    const saved = await readIntent();
    if (
      version !== epoch ||
      (saved && ((userId && saved.userId !== userId) || (orderId && saved.orderId !== orderId)))
    )
      return;
    await stopNative();
  });
}

export async function startDriverBackground(userId: string, orderId: string) {
  if (
    Platform.OS !== 'android' ||
    Constants.executionEnvironment === 'storeClient' ||
    !TaskManager ||
    !(await TaskManager.isAvailableAsync())
  )
    throw new Error(
      'Para navegar compartiendo GPS necesitas el build Android actualizado de Gasway.',
    );
  const version = ++epoch;
  return enqueue(async () => {
    if (version !== epoch) return false;
    const {
      data: { session },
      error,
    } = await getSupabase().auth.getSession();
    if (error || session?.user.id !== userId)
      throw new Error('Tu sesión cambió. Vuelve a ingresar.');
    const snapshot = await getOrderTracking(orderId);
    if (snapshot.state === 'ended') throw new Error('Esta entrega ya terminó.');
    const permission = await Location.getBackgroundPermissionsAsync();
    if (!permission.granted)
      throw new Error('Permite la ubicación siempre para compartir GPS al navegar.');
    if (version !== epoch) return false;
    publisher?.stop();
    publisher = null;
    publisherRun = null;
    await stopNative();
    if (version !== epoch) return false;
    const intent = intentSchema.parse({
      userId,
      orderId,
      runId: Crypto.randomUUID(),
      expiresAt: Date.now() + 4 * 60 * 60 * 1000,
    });
    current = intent;
    try {
      await SecureStore.setItemAsync(intentKey, JSON.stringify(intent));
      if (version !== epoch) {
        await stopNative();
        return false;
      }
      await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: trackingPolicy.publishIntervalMs,
        distanceInterval: 0,
        deferredUpdatesInterval: 0,
        foregroundService: {
          notificationTitle: 'Gasway · entrega en curso',
          notificationBody:
            'Compartiendo ubicación al navegar. Pausa o termina la entrega en Gasway.',
          notificationColor: theme.colors.primary,
          killServiceOnDestroy: true,
        },
      });
      if (version !== epoch) {
        await stopNative();
        return false;
      }
      emit({
        scope: scopeOf(intent),
        status: {
          message: 'GPS activo al navegar y con pantalla bloqueada.',
          error: false,
          receivedAt: null,
        },
      });
      return true;
    } catch (error) {
      current = null;
      await stopNative();
      throw error;
    }
  });
}

// Callbacks can run while the UI is backgrounded. A cold JS restart never resumes consent.
export async function processDriverLocations(data: unknown, failed = false) {
  const version = epoch;
  const saved = await readIntent();
  if (version !== epoch) return;
  if (!saved || saved.expiresAt <= Date.now() || failed) {
    await stopDriverBackground();
    return;
  }
  if (current && current.runId !== saved.runId) return;
  if (!current) {
    void stopDriverBackground().catch(() => undefined);
    return;
  }
  try {
    const {
      data: { session },
      error,
    } = await getSupabase().auth.getSession();
    if (version !== epoch) return;
    if (error || session?.user.id !== saved.userId) {
      await stopDriverBackground();
      return;
    }
    const snapshot = await getOrderTracking(saved.orderId);
    if (version !== epoch) return;
    if (snapshot.state === 'ended') {
      await stopDriverBackground();
      return;
    }
    const checked = positionsSchema.safeParse(data);
    if (!checked.success) return;
    const latest = checked.data.locations.reduce<(typeof checked.data.locations)[number] | null>(
      (a, b) => (!a || b.timestamp > a.timestamp ? b : a),
      null,
    );
    if (!latest) return;
    if (!publisher || publisherRun !== saved.runId) {
      publisher?.stop();
      publisherRun = saved.runId;
      publisher = createLocationPublisher({
        orderId: saved.orderId,
        publish: publishOrderLocation,
        isActive: () => version === epoch && current?.runId === saved.runId,
        now: trackingClock,
        wallNow: Date.now,
        onStatus: (status) => emit({ scope: scopeOf(saved), status }),
        onClosed: () => {
          void stopDriverBackground().catch(() => undefined);
        },
      });
    }
    // Recheck persistent consent after network work; a late callback cannot revive a paused trip.
    const consent = await readIntent();
    if (version !== epoch || consent?.runId !== saved.runId) return;
    await publisher.accept({
      timestamp: latest.timestamp,
      coords: latest.coords,
      ...(latest.mocked !== undefined ? { mocked: latest.mocked } : {}),
    });
  } catch (error) {
    if (version !== epoch) return;
    if (trackingFailure(error).blocked) await stopDriverBackground();
    // Connectivity failures drop this fix. The next new native fix is the only retry.
  }
}

if (TaskManager)
  TaskManager.defineTask(DRIVER_LOCATION_TASK, ({ data, error }) =>
    processDriverLocations(data, !!error),
  );
