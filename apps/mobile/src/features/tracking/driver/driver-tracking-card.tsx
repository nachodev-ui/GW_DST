import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Platform,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { useTrackingSnapshot } from '@/shared/tracking/use-tracking-snapshot';
import { getOrderTracking, publishOrderLocation } from '@/shared/tracking/data';
import { trackingClock } from '@/shared/tracking/freshness';
import { trackingPolicy } from '@/shared/tracking/contracts';
import { Button, Feedback, RefreshButton, ui } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import { createLocationPublisher, type PublisherStatus } from './location-publisher';
import { useDriverBackgroundTracking } from './use-background-tracking';
import { startDriverBackground, stopDriverBackground } from './background-tracking';
import { DriverRouteCard } from './driver-route-card';
import { navigationUrl, type NavigationApp } from './navigation';

export function DriverTrackingCard({ orderId, active }: { orderId: string; active: boolean }) {
  const { session, zone } = useAuth();
  if (!session || zone !== 'driver') return null;
  return (
    <DriverTrackingSession
      key={`${session.user.id}:${orderId}`}
      orderId={orderId}
      active={active}
      userId={session.user.id}
    />
  );
}

function DriverTrackingSession({
  orderId,
  active,
  userId,
}: {
  orderId: string;
  active: boolean;
  userId: string;
}) {
  const allowed = active;
  const tracking = useTrackingSnapshot(userId, orderId, allowed);
  const background = useDriverBackgroundTracking(
    userId,
    orderId,
    allowed && !tracking.ended && !tracking.blocked,
  );
  const [navigating, setNavigating] = useState(false);
  const [gpsDetails, setGpsDetails] = useState(false);
  const scope = `${userId}:${orderId}`;
  const [intent, setIntent] = useState<string | null>(null);
  const [status, setStatus] = useState<PublisherStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const requestToken = useRef(0);
  const stopActive = useRef(() => {});
  const [run, setRun] = useState(0);
  const wanted = intent === scope || background.active;
  const ready =
    allowed &&
    wanted &&
    !background.active &&
    tracking.foreground &&
    !!tracking.snapshot &&
    !tracking.ended &&
    !tracking.blocked &&
    !tracking.message;

  useEffect(
    () => () => {
      requestToken.current++;
    },
    [scope, allowed],
  );

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let watcher: Location.LocationSubscription | undefined;
    const stop = () => {
      if (disposed) return;
      disposed = true;
      publisher.stop();
      watcher?.remove();
    };
    const publisher = createLocationPublisher({
      orderId,
      publish: publishOrderLocation,
      isActive: () => !disposed && AppState.currentState === 'active',
      now: trackingClock,
      wallNow: Date.now,
      onStatus: setStatus,
      onClosed: () => {
        stop();
        setIntent(null);
      },
    });
    stopActive.current = stop;
    const fail = (message: string) => {
      if (disposed) return;
      setStatus({ message, error: true, receivedAt: null });
      setIntent(null);
      stop();
    };
    // Stop immediately at lifecycle/auth boundaries, including during an async native setup.
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
      else setRun((value) => value + 1);
    });
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, next) => {
      if (next?.user.id !== userId) stop();
    });
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (disposed) return;
        if (!permission.granted) {
          fail('El permiso de ubicación cambió. Actívalo para compartir tu GPS.');
          return;
        }
        const services = await Location.hasServicesEnabledAsync();
        if (disposed) return;
        if (!services) {
          fail('Activa la ubicación del teléfono para compartir tu GPS.');
          return;
        }
        setStatus({ message: 'Buscando una posición GPS nueva…', error: false, receivedAt: null });
        const next = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: trackingPolicy.publishIntervalMs,
            distanceInterval: 0,
          },
          (position) => {
            void publisher.accept(position);
          },
          () => {
            fail(
              'Se interrumpió el GPS. Revisa el permiso y la ubicación del teléfono y vuelve a activarlo.',
            );
          },
        );
        if (disposed) next.remove();
        else watcher = next;
      } catch {
        fail('No pudimos iniciar el GPS. Revisa permisos y ubicación e inténtalo otra vez.');
      }
    })();
    return () => {
      stop();
      lifecycle.remove();
      subscription.unsubscribe();
    };
  }, [ready, orderId, userId, run]);

  const start = async () => {
    if (!allowed || !tracking.foreground || requesting || tracking.ended || tracking.blocked)
      return;
    const token = ++requestToken.current;
    setRequesting(true);
    setStatus(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== requestToken.current) return;
      if (!permission.granted) {
        setStatus({
          message: 'Necesitas permitir la ubicación mientras usas Gasway para compartir tu GPS.',
          error: true,
          receivedAt: null,
        });
      } else setIntent(scope);
    } catch {
      if (token === requestToken.current)
        setStatus({
          message: 'No pudimos solicitar el permiso GPS. Revisa los ajustes del teléfono.',
          error: true,
          receivedAt: null,
        });
    } finally {
      if (token === requestToken.current) setRequesting(false);
    }
  };
  const navigate = async (app: NavigationApp) => {
    if (navigating || !allowed || tracking.ended || tracking.blocked || !tracking.foreground)
      return;
    const token = ++requestToken.current;
    setNavigating(true);
    try {
      if (Platform.OS !== 'android')
        throw new Error(
          'La navegación con GPS compartido está disponible en el Android del conductor.',
        );
      if (!background.active) {
        const foreground = await Location.requestForegroundPermissionsAsync();
        if (token !== requestToken.current) return;
        if (!foreground.granted)
          throw new Error('Permite tu ubicación para iniciar la navegación.');
        if (Number(Platform.Version) >= 33) {
          const notification = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (token !== requestToken.current) return;
          if (notification !== PermissionsAndroid.RESULTS.GRANTED)
            throw new Error(
              'Permite las notificaciones para ver que Gasway está compartiendo tu ubicación.',
            );
        }
        const permission = await Location.requestBackgroundPermissionsAsync();
        if (token !== requestToken.current) return;
        if (!permission.granted)
          throw new Error(
            'En Ajustes, permite la ubicación siempre para mantener el seguimiento al usar Waze o Google Maps.',
          );
        if (!(await startDriverBackground(userId, orderId))) return;
      }
      if (token !== requestToken.current) {
        await stopDriverBackground(userId, orderId);
        return;
      }
      const latest = await getOrderTracking(orderId);
      if (latest.state === 'ended' || !latest.destination) {
        await stopDriverBackground(userId, orderId);
        throw new Error('La entrega terminó o no tiene un destino confirmado.');
      }
      if (token !== requestToken.current) return;
      await Linking.openURL(navigationUrl(app, latest.destination));
    } finally {
      if (token === requestToken.current) setNavigating(false);
    }
  };
  if (!allowed) return null;
  if (Platform.OS === 'web')
    return <Feedback text="Comparte GPS desde la app móvil Android de la demo." />;
  const message =
    tracking.ended || tracking.blocked
      ? 'El seguimiento terminó o tu acceso cambió. Actualiza el pedido.'
      : background.active
        ? (background.status?.message ?? 'GPS activo mientras usas navegación externa.')
        : !tracking.foreground && wanted
          ? 'GPS pausado. Vuelve a esta pantalla para continuar.'
          : wanted && tracking.expired
            ? 'La última ubicación caducó. Esperando una nueva posición GPS.'
            : (tracking.message ??
              status?.message ??
              'Activa el GPS cuando estés listo para compartir tu ubicación.');
  const gpsError =
    !!tracking.message ||
    (!tracking.ended && !!(background.active ? background.status?.error : status?.error));
  const live = wanted && !!tracking.position && !tracking.expired && !gpsError;
  return (
    <>
      <DriverRouteCard
        userId={userId}
        orderId={orderId}
        snapshot={tracking.snapshot}
        position={tracking.position}
        foreground={tracking.foreground}
        navigating={navigating}
        onNavigate={navigate}
      />
      <View style={styles.gps}>
        <View style={styles.row}>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel="Ver estado y privacidad del GPS"
            onPress={() => setGpsDetails(true)}
            style={styles.status}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: gpsError
                    ? theme.colors.error
                    : live
                      ? theme.colors.success
                      : theme.colors.textMuted,
                },
              ]}
            />
            <View style={styles.flex}>
              <Text variant="label">
                {gpsError
                  ? 'Revisa tu GPS'
                  : live
                    ? 'GPS compartido'
                    : wanted
                      ? 'Buscando GPS…'
                      : 'GPS en pausa'}
              </Text>
              <Text variant="note" style={ui.muted}>
                {background.active ? 'También fuera de Gasway' : 'En esta pantalla'}
              </Text>
            </View>
            <Icon name="info" size={theme.spacing.screen} />
          </PulsePressable>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel={
              wanted
                ? 'Pausar mi ubicación'
                : requesting
                  ? 'Solicitando permiso GPS'
                  : 'Compartir mi ubicación'
            }
            accessibilityState={{
              disabled: requesting || tracking.ended || tracking.blocked || !tracking.foreground,
            }}
            disabled={requesting || tracking.ended || tracking.blocked || !tracking.foreground}
            style={[
              styles.toggle,
              (requesting || tracking.ended || tracking.blocked || !tracking.foreground) &&
                styles.disabled,
            ]}
            onPress={() => {
              if (wanted) {
                void stopDriverBackground(userId, orderId).catch(() => undefined);
                stopActive.current();
                requestToken.current++;
                setNavigating(false);
                setRequesting(false);
                setIntent(null);
                setStatus(null);
              } else void start();
            }}
          >
            <Icon name={wanted ? 'pause' : 'locate'} size={theme.spacing.screen} />
            <Text variant="label" compact style={ui.primaryText}>
              {wanted ? 'Pausar' : requesting ? 'Permiso…' : 'Activar'}
            </Text>
          </PulsePressable>
        </View>
        {gpsError || (wanted && tracking.expired) || tracking.ended || tracking.blocked ? (
          <Feedback text={message} error={gpsError} />
        ) : null}
        {tracking.message && !tracking.ended ? (
          <RefreshButton
            label="Reintentar seguimiento"
            variant="link"
            disabled={!tracking.foreground}
            onRefresh={tracking.refresh}
          />
        ) : null}
        {status?.error ? (
          <Button
            label="Revisar permisos"
            variant="link"
            onPress={() => {
              void Linking.openSettings().catch(() =>
                setStatus({
                  message: 'Abre Ajustes del teléfono y revisa el permiso de ubicación de Gasway.',
                  error: true,
                  receivedAt: null,
                }),
              );
            }}
          />
        ) : null}
      </View>
      <BottomSheet visible={gpsDetails} title="Tu ubicación" onClose={() => setGpsDetails(false)}>
        <ScrollView contentContainerStyle={styles.explanation}>
          <Feedback text={message} error={gpsError} />
          <Text>
            «Activar» comparte tu ubicación mientras estás en esta pantalla. «Navegar» permite
            mantenerla al usar Waze, Google Maps o bloquear el Android, con una notificación
            visible.
          </Text>
          <Text variant="note" style={ui.muted}>
            Puedes pausarla cuando quieras. Al salir de la entrega, terminarla o cambiar de sesión,
            el seguimiento se detiene.
          </Text>
        </ScrollView>
      </BottomSheet>
    </>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: theme.spacing.none },
  gps: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  status: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
  dot: {
    width: theme.delivery.statusDot,
    height: theme.delivery.statusDot,
    borderRadius: theme.radii.pill,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.compact,
    minHeight: theme.layout.touchTarget,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  disabled: { opacity: theme.opacity.disabled },
  explanation: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
