import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Button, Feedback, RefreshButton } from '@/shared/ui/components';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import { Text } from '@/shared/ui/text';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { useOrderRoute } from '@/shared/tracking/use-order-route';
import type { TrackingSnapshot } from '@/shared/tracking/contracts';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { DriverRouteMap } from './driver-route-map';
import type { NavigationApp } from './navigation';

const navigationArtwork = {
  google: require('../../../../assets/navigation/google-maps.png'),
  waze: require('../../../../assets/navigation/waze.png'),
} satisfies Record<NavigationApp, ImageSourcePropType>;
export function DriverRouteCard({
  userId,
  orderId,
  snapshot,
  position,
  foreground,
  navigating,
  onNavigate,
}: {
  userId: string;
  orderId: string;
  snapshot: TrackingSnapshot | null;
  position: Extract<TrackingSnapshot, { state: 'fresh' }>['sample'] | null;
  foreground: boolean;
  navigating: boolean;
  onNavigate: (app: NavigationApp) => Promise<void>;
}) {
  const [choosing, setChoosing] = useState(false),
    [error, setError] = useState<string | null>(null),
    [details, setDetails] = useState(false),
    [selectedApp, setSelectedApp] = useState<NavigationApp | null>(null),
    provider = runtimeMapProvider();
  const client = useQueryClient();
  const routeProvider = provider === 'apple' ? 'osrm' : 'google';
  const route = useOrderRoute(userId, orderId, foreground && !!provider, position, routeProvider);
  const destination = snapshot?.state !== 'ended' ? (snapshot?.destination ?? null) : null;
  const navigate = async (app: NavigationApp) => {
    setError(null);
    setSelectedApp(app);
    try {
      await onNavigate(app);
      setChoosing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos abrir la navegación.');
    } finally {
      setSelectedApp(null);
    }
  };
  return (
    <View style={styles.container}>
      {destination && foreground ? (
        <DriverRouteMap
          destination={destination}
          position={position}
          {...(route ? { route } : {})}
        />
      ) : (
        <Feedback
          text={
            destination
              ? 'Vuelve a Gasway para ver el mapa.'
              : 'Este pedido no tiene un punto de entrega confirmado.'
          }
        />
      )}
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel="Navegar a la entrega con Google Maps o Waze"
        accessibilityState={{ disabled: !destination || !foreground || navigating }}
        disabled={!destination || !foreground || navigating}
        onPress={() => setChoosing(true)}
        style={[styles.navigate, (!destination || !foreground || navigating) && styles.disabled]}
      >
        <View style={styles.navigationIcon}>
          <Icon name="navigate" color={theme.colors.lime} />
        </View>
        <View style={styles.flex}>
          <Text variant="subtitle" style={styles.onDark}>
            {navigating ? 'Preparando GPS…' : 'Navegar'}
          </Text>
          <Text variant="note" style={styles.onDarkMuted}>
            Google Maps o Waze
          </Text>
        </View>
        <Icon name="arrowRight" color={theme.colors.onPrimary} />
      </PulsePressable>
      {destination && !route && position && foreground ? (
        <View style={styles.routeStatus}>
          <Text variant="note" style={styles.muted}>
            Trazado no disponible
          </Text>
          <View>
            <RefreshButton
              label="Reintentar"
              variant="link"
              onRefresh={() =>
                client.invalidateQueries({
                  queryKey: ['order-route', userId, orderId, routeProvider],
                  exact: true,
                })
              }
            />
          </View>
        </View>
      ) : null}
      <BottomSheet
        visible={choosing}
        title="Elige tu navegador"
        dismissible={!navigating}
        onClose={() => {
          setChoosing(false);
          setError(null);
          setDetails(false);
        }}
      >
        <ScrollView contentContainerStyle={styles.sheet}>
          <View style={styles.gpsNotice}>
            <Icon name="locate" />
            <View style={styles.flex}>
              <Text variant="label">Compartirás tu ubicación</Text>
              <Text variant="note" style={styles.muted}>
                Incluso con otra app o la pantalla bloqueada. Puedes pausarla en Gasway.
              </Text>
            </View>
          </View>
          <View style={styles.appOptions}>
            {(['google', 'waze'] as const).map((app) => {
              const label = app === 'google' ? 'Google Maps' : 'Waze';
              return (
                <PulsePressable
                  key={app}
                  haptic
                  accessibilityRole="button"
                  accessibilityLabel={`Compartir GPS y abrir ${label}`}
                  accessibilityState={{
                    disabled: navigating,
                    busy: navigating && selectedApp === app,
                  }}
                  disabled={navigating}
                  onPress={() => void navigate(app)}
                  style={styles.appOption}
                >
                  <Image
                    source={navigationArtwork[app]}
                    style={styles.appIcon}
                    resizeMode="contain"
                    accessible={false}
                    aria-hidden
                  />
                  <Text variant="label" style={styles.appName}>
                    {label}
                  </Text>
                  {navigating && selectedApp === app ? (
                    <Text variant="note" style={styles.muted}>
                      Preparando GPS…
                    </Text>
                  ) : (
                    <Icon name="arrowRight" size={theme.spacing.screen} />
                  )}
                </PulsePressable>
              );
            })}
          </View>
          {error ? <Feedback text={error} error /> : null}
          {error ? (
            <Button
              label="Abrir ajustes del teléfono"
              variant="link"
              onPress={() => {
                void Linking.openSettings().catch(() => undefined);
              }}
            />
          ) : null}
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel={
              details ? 'Ocultar detalles de navegación' : 'Más información sobre la navegación'
            }
            accessibilityState={{ expanded: details }}
            onPress={() => setDetails((value) => !value)}
            style={styles.detailsToggle}
          >
            <Icon name="info" size={theme.spacing.screen} />
            <Text variant="note" style={styles.muted}>
              {details ? 'Ocultar detalles' : 'Más información'}
            </Text>
          </PulsePressable>
          {details ? (
            <Text variant="note" style={styles.muted}>
              Si no tienes la app, se abrirá su sitio web. Su ruta puede variar respecto a Gasway.
            </Text>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: theme.spacing.none },
  navigate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.heroStart,
  },
  navigationIcon: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onDark: { color: theme.colors.onPrimary },
  onDarkMuted: { color: theme.colors.heroMuted },
  disabled: { opacity: theme.opacity.disabled },
  muted: { color: theme.colors.textMuted, flexShrink: 1 },
  routeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  sheet: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  gpsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
  appOptions: { flexDirection: 'row', alignItems: 'stretch', gap: theme.spacing.compact },
  appOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.surface,
  },
  appIcon: {
    width: theme.layout.illustrationSelector,
    height: theme.layout.illustrationSelector,
    borderRadius: theme.radii.control,
  },
  appName: { textAlign: 'center' },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
});
