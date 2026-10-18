import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/text';
import { ui, Card, StatusBadge } from '@/shared/ui/components';
import { theme } from '@/theme';
import { statusLabels } from '@/shared/orders/contracts';
import type { Order } from '@/shared/orders/contracts';
import { Icon, type IconName } from '@/shared/ui/icon';

const deliverySteps = [
  ['requested', 'Solicitado'],
  ['accepted', 'Aceptado'],
  ['on_the_way', 'En camino'],
  ['delivered', 'Entregado'],
] as const;

export const orderHeadlines: Record<Order['status'], string> = {
  requested: 'Ya recibimos tu pedido',
  offered: 'Buscando quién lleve tu gas',
  accepted: 'Tu pedido está confirmado',
  on_the_way: 'Tu pedido va en camino',
  delivered: 'Tu gas ya llegó',
  cancelled: 'Tu pedido fue cancelado',
};
const stepIcons: IconName[] = ['orders', 'check', 'truck', 'home'];

export function OrderProgressSummary({ status }: { status: Order['status'] }) {
  const current = status === 'offered' ? 0 : deliverySteps.findIndex(([step]) => step === status);
  return (
    <View style={orderStyles.progress}>
      {deliverySteps.map(([step, label], index) => (
        <View
          key={step}
          accessible
          accessibilityLabel={`${label}. ${index <= current ? 'Completado' : 'Pendiente'}`}
          style={orderStyles.progressStep}
        >
          <View style={[orderStyles.stepIcon, index <= current && orderStyles.completed]}>
            <Icon
              name={index <= current ? (stepIcons[index] ?? 'check') : 'clock'}
              color={index <= current ? theme.colors.onPrimary : theme.colors.textMuted}
            />
          </View>
          <Text variant="note" style={orderStyles.stepLabel}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function OrderTimeline({
  events,
  cancelled,
}: {
  events: { to_status: Order['status']; created_at: string }[];
  cancelled: boolean;
}) {
  return (
    <View style={orderStyles.timeline}>
      {deliverySteps.map(([status, label], index) => {
        const event = events.find((entry) => entry.to_status === status);
        return (
          <View key={status} style={orderStyles.step}>
            <View style={orderStyles.rail}>
              <View style={[orderStyles.stepIcon, event && orderStyles.completed]}>
                <Icon
                  name={event ? (stepIcons[index] ?? 'check') : cancelled ? 'close' : 'clock'}
                  color={event ? theme.colors.onPrimary : theme.colors.textMuted}
                />
              </View>
              {index < deliverySteps.length - 1 ? <View style={orderStyles.connector} /> : null}
            </View>
            <View style={orderStyles.stepCopy}>
              <Text variant="label">{label}</Text>
              <Text variant="note" style={ui.muted}>
                {event
                  ? new Date(event.created_at).toLocaleString('es-CL')
                  : cancelled
                    ? 'No alcanzado'
                    : 'Pendiente'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Card>
      <Text variant="subtitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

export function OrderStatus({ status }: { status: Order['status'] }) {
  const icons: Record<Order['status'], IconName> = {
    requested: 'clock',
    offered: 'search',
    accepted: 'check',
    on_the_way: 'truck',
    delivered: 'check',
    cancelled: 'close',
  };
  return (
    <StatusBadge
      label={statusLabels[status]}
      icon={icons[status]}
      tone={
        status === 'on_the_way'
          ? 'accent'
          : status === 'delivered'
            ? 'success'
            : status === 'cancelled'
              ? 'error'
              : 'primary'
      }
    />
  );
}

export const orderStyles = StyleSheet.create({
  timeline: { gap: theme.spacing.none },
  progress: { flexDirection: 'row', gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  progressStep: { flex: 1, alignItems: 'center', gap: theme.spacing.sm },
  stepLabel: { textAlign: 'center', color: theme.colors.textMuted },
  stepIcon: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.divider,
  },
  completed: { backgroundColor: theme.colors.primary },
  rail: { alignItems: 'center' },
  connector: {
    width: theme.borders.thin,
    flex: 1,
    minHeight: theme.spacing.lg,
    backgroundColor: theme.colors.border,
  },
  stepCopy: {
    flex: 1,
    paddingTop: theme.spacing.compact,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  step: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  heading: { fontSize: theme.typography.sizes.subtitle },
  total: { fontSize: theme.typography.sizes.display, color: theme.colors.accent },
  row: { ...ui.card, gap: theme.spacing.compact },
  list: {
    padding: theme.spacing.screen,
    maxWidth: theme.layout.formWidth,
    width: '100%',
    alignSelf: 'center',
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  header: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
});
