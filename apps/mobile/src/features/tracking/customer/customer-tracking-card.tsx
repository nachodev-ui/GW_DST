import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useTrackingSnapshot } from '@/shared/tracking/use-tracking-snapshot';
import { useOrderRoute } from '@/shared/tracking/use-order-route';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { Card, Feedback, RefreshButton, ui } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import { TrackingMap } from './tracking-map';

export function CustomerTrackingCard({ orderId, active }: { orderId: string; active: boolean }) {
  const { session } = useAuth();
  const tracking = useTrackingSnapshot(session?.user.id, orderId, active);
  const provider = runtimeMapProvider();
  const routeProvider = provider === 'apple' ? 'osrm' : 'google';
  const route = useOrderRoute(
    session?.user.id,
    orderId,
    active && tracking.foreground && !tracking.ended && !!provider,
    tracking.position,
    routeProvider,
  );
  if (!active) return null;
  const live = !!tracking.position && !tracking.ended;
  const status = tracking.ended
    ? 'Seguimiento finalizado'
    : tracking.message
      ? 'Seguimiento no disponible'
      : tracking.expired
        ? 'Esperando nueva señal'
        : live
          ? 'Ubicación en vivo'
          : 'Esperando al repartidor';
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="subtitle" accessibilityRole="header">
          Sigue tu entrega
        </Text>
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              { backgroundColor: live ? theme.colors.success : theme.colors.warning },
            ]}
          />
          <Text variant="note" style={ui.muted}>
            {status}
          </Text>
        </View>
      </View>
      {tracking.foreground && !tracking.ended ? (
        <TrackingMap
          key={`${session?.user.id}:${orderId}`}
          destination={tracking.snapshot?.destination ?? null}
          position={tracking.position}
          routeProvider={routeProvider}
          {...(route ? { route } : {})}
        />
      ) : null}
      {!tracking.ended ? (
        <View style={styles.footer}>
          <View style={styles.legend}>
            {tracking.snapshot?.destination ? (
              <View style={styles.legendItem}>
                <Icon name="home" size={theme.spacing.md} />
                <Text variant="note" style={ui.muted}>
                  Tu entrega
                </Text>
              </View>
            ) : null}
            {live ? (
              <View style={styles.legendItem}>
                <Icon name="truck" size={theme.spacing.md} />
                <Text variant="note" style={ui.muted}>
                  Repartidor
                </Text>
              </View>
            ) : null}
            {tracking.expired ? (
              <Text variant="note" style={ui.muted}>
                Ubicación desactualizada
              </Text>
            ) : null}
          </View>
          {tracking.snapshot && !tracking.snapshot.destination ? (
            <Text variant="note" style={ui.muted}>
              Pedido sin punto de entrega en el mapa.
            </Text>
          ) : null}
          {tracking.message ? <Feedback error text={tracking.message} /> : null}
          {tracking.message || tracking.expired ? (
            <RefreshButton
              key={orderId}
              label="Reintentar ubicación"
              refreshingLabel="Reintentando…"
              variant="link"
              disabled={!tracking.foreground}
              onRefresh={tracking.refresh}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  card: { padding: theme.spacing.none, gap: theme.spacing.none, overflow: 'hidden' },
  header: { padding: theme.spacing.md, gap: theme.spacing.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: theme.layout.dot, height: theme.layout.dot, borderRadius: theme.radii.pill },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.compact,
    gap: theme.spacing.sm,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
});
