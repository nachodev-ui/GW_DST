import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '@/shared/ui/text';
import { ui, Card, StatusBadge } from '@/shared/ui/components';
import { theme } from '@/theme';
import { statusLabels, type Order } from '@/shared/orders/contracts';
import { Icon, type IconName } from '@/shared/ui/icon';

const deliverySteps = [
  ['requested', 'Solicitado'],
  ['accepted', 'Confirmado'],
  ['on_the_way', 'En camino'],
  ['delivered', 'En casa'],
] as const;
const eventSteps = [
  ['requested', 'Pedido recibido'],
  ['offered', 'Búsqueda de repartidor'],
  ['accepted', 'Pedido confirmado'],
  ['on_the_way', 'Repartidor en camino'],
  ['delivered', 'Pedido entregado'],
] as const;
export const orderHeadlines: Record<Order['status'], string> = {
  requested: 'Ya recibimos tu pedido',
  offered: 'Buscando quién lleve tu gas',
  accepted: 'Tu pedido está confirmado',
  on_the_way: 'Tu pedido va en camino',
  delivered: 'Tu gas ya llegó',
  cancelled: 'Tu pedido fue cancelado',
};
const descriptions: Record<Order['status'], string> = {
  requested: 'Tu solicitud ya está registrada. Aquí verás cómo avanza.',
  offered: 'Estamos buscando un repartidor para tu pedido.',
  accepted: 'Un repartidor aceptó tu pedido. Te avisaremos cuando esté en camino.',
  on_the_way: 'El repartidor salió hacia tu dirección. Prepara tu envase si elegiste canje.',
  delivered: 'La entrega quedó registrada. Gracias por pedir con Gasway.',
  cancelled: 'Este pedido está cerrado. Puedes iniciar uno nuevo desde Inicio.',
};
export function OrderHero({ status }: { status: Order['status'] }) {
  return (
    <LinearGradient
      colors={[theme.colors.heroStart, theme.colors.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={orderStyles.hero}
    >
      <OrderStatus status={status} />
      <Text
        variant="display"
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={orderStyles.onHero}
      >
        {orderHeadlines[status]}
      </Text>
      <Text style={orderStyles.heroMuted}>{descriptions[status]}</Text>
      {status !== 'cancelled' ? (
        <View accessible={false} style={orderStyles.journey}>
          <Svg width="100%" height="108" viewBox="0 0 320 108" aria-hidden>
            <Path d="M20 85H300" stroke={theme.colors.heroMuted} strokeWidth="1" opacity="0.35" />
            <Path
              d="M38 78C80 20 151 105 235 48"
              stroke={theme.colors.copperLight}
              strokeWidth="2"
              strokeDasharray="5 7"
              fill="none"
            />
            <Circle cx="32" cy="76" r="7" fill={theme.colors.copper} />
            <Path
              d="m231 43 31-26 32 26M238 38v44h49V38M256 82V59h16v23"
              stroke={theme.colors.heroMuted}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {status === 'delivered' ? (
              <Path
                d="m252 45 8 8 16-18"
                stroke={theme.colors.copperLight}
                strokeWidth="3"
                fill="none"
              />
            ) : (
              <>
                <Rect
                  x={status === 'on_the_way' ? 166 : 76}
                  y="53"
                  width="40"
                  height="25"
                  rx="4"
                  fill={theme.colors.copper}
                />
                <Path
                  d={
                    status === 'on_the_way' ? 'M206 61h12l11 11v6h-23Z' : 'M116 61h12l11 11v6h-23Z'
                  }
                  fill={theme.colors.copperLight}
                />
                <Circle
                  cx={status === 'on_the_way' ? 178 : 88}
                  cy="81"
                  r="6"
                  fill={theme.colors.heroStart}
                  stroke={theme.colors.heroMuted}
                  strokeWidth="2"
                />
                <Circle
                  cx={status === 'on_the_way' ? 216 : 126}
                  cy="81"
                  r="6"
                  fill={theme.colors.heroStart}
                  stroke={theme.colors.heroMuted}
                  strokeWidth="2"
                />
              </>
            )}
          </Svg>
        </View>
      ) : null}
      <Text variant="note" style={orderStyles.heroMuted}>
        {status === 'cancelled'
          ? 'Pedido cerrado'
          : 'Seguimiento por estados · sin ubicación en vivo'}
      </Text>
    </LinearGradient>
  );
}
export function OrderProgressSummary({ status }: { status: Order['status'] }) {
  if (status === 'cancelled') return null;
  const current = status === 'offered' ? 0 : deliverySteps.findIndex(([step]) => step === status);
  return (
    <View style={orderStyles.progress}>
      {deliverySteps.map(([step, label], index) => (
        <View
          key={step}
          accessible
          accessibilityLabel={`${label}. ${index < current ? 'Completado' : index === current ? 'Estado actual' : 'Pendiente'}`}
          style={orderStyles.progressStep}
        >
          <View style={[orderStyles.progressLine, index <= current && orderStyles.completed]} />
          <Text variant="note" style={[orderStyles.stepLabel, index === current && ui.primaryText]}>
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
  const steps: readonly (readonly [Order['status'], string])[] = cancelled
    ? [...eventSteps, ['cancelled', 'Pedido cancelado']]
    : eventSteps;
  return (
    <View>
      {steps.map(([status, label], index) => {
        const event = events.find((entry) => entry.to_status === status);
        return (
          <View key={status} style={orderStyles.step}>
            <View style={orderStyles.rail}>
              <View
                style={[
                  orderStyles.stepIcon,
                  event && (status === 'cancelled' ? orderStyles.cancelled : orderStyles.completed),
                ]}
              >
                <Icon
                  name={event ? (status === 'cancelled' ? 'close' : 'check') : 'clock'}
                  size={theme.spacing.md}
                  color={event ? theme.colors.onPrimary : theme.colors.textMuted}
                />
              </View>
              {index < steps.length - 1 ? <View style={orderStyles.connector} /> : null}
            </View>
            <View style={orderStyles.stepCopy}>
              <Text variant="label">{label}</Text>
              <Text variant="note" style={ui.muted}>
                {event
                  ? new Date(event.created_at).toLocaleString('es-CL')
                  : cancelled
                    ? 'No registrado'
                    : 'Sin registro aún'}
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
        status === 'delivered'
          ? 'success'
          : status === 'cancelled'
            ? 'error'
            : status === 'requested' || status === 'offered'
              ? 'warning'
              : 'progress'
      }
    />
  );
}
export const orderStyles = StyleSheet.create({
  hero: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderRadius: theme.radii.hero,
    ...theme.elevation.medium,
  },
  onHero: { color: theme.colors.onPrimary },
  heroMuted: { color: theme.colors.heroMuted },
  journey: { marginHorizontal: -theme.spacing.sm },
  progress: { flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  progressStep: { flex: 1, gap: theme.spacing.sm },
  progressLine: {
    height: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.divider,
  },
  stepLabel: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.note },
  stepIcon: {
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warm,
  },
  completed: { backgroundColor: theme.colors.primary },
  cancelled: { backgroundColor: theme.colors.error },
  rail: { alignItems: 'center' },
  connector: {
    width: theme.borders.thin,
    flex: 1,
    minHeight: theme.spacing.lg,
    backgroundColor: theme.colors.divider,
  },
  stepCopy: {
    flex: 1,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  step: { flexDirection: 'row', gap: theme.spacing.md },
  heading: { fontSize: theme.typography.sizes.subtitle },
  total: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  row: { ...ui.card, gap: theme.spacing.compact },
  list: {
    padding: theme.spacing.screen,
    maxWidth: theme.layout.formWidth,
    width: '100%',
    alignSelf: 'center',
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  header: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
