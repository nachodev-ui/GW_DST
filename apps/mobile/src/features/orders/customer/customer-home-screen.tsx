import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { useCatalogue, useOrdersList } from './order-data';
import { orderHeadlines, OrderStatus } from './order-ui';
import {
  productLabel,
  formatClp,
  type Order,
  type Product,
  type weights,
} from '@/shared/orders/contracts';
import { Avatar } from '@/shared/ui/avatar';
import { Button, ui } from '@/shared/ui/components';
import { CylinderBrandComposition } from '@/shared/ui/cylinder-illustration';
import { CylinderSelector } from '@/shared/ui/cylinder-selector';
import { Enter } from '@/shared/ui/enter';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { theme } from '@/theme';

type Weight = (typeof weights)[number];
const startOrder = (weight?: Weight) =>
  router.push(
    weight ? { pathname: '/orders/new', params: { weight: String(weight) } } : '/orders/new',
  );
const showOrder = (id: string) => router.push({ pathname: '/orders/[id]', params: { id } });
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

export function CustomerHomeScreen() {
  const { session } = useAuth();
  const metadata = session?.user.user_metadata;
  const name = [metadata?.full_name, metadata?.display_name, metadata?.name]
    .find(
      (value): value is string =>
        typeof value === 'string' &&
        /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(value.trim()),
    )
    ?.trim()
    .split(' ')[0];
  const [weight, setWeight] = useState<Weight>();
  const orders = useOrdersList();
  const catalogue = useCatalogue();
  const items = orders.data?.pages.flat() ?? [];
  const active = items.find(
    (order) => order.status !== 'delivered' && order.status !== 'cancelled',
  );
  const recent = items.slice(0, 3);
  const productFor = (order: Order) =>
    catalogue.data?.products.find((product) => product.id === order.product_id);
  const failed = orders.isError || catalogue.isError;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Enter>
          <View style={styles.header}>
            <View style={[ui.stack, ui.flex]}>
              <GaswayLogo />
              <Text variant="note" style={ui.muted}>
                {`Hola, ${name}. Qué bueno verte.`}
              </Text>
            </View>
            <PulsePressable
              accessibilityRole="button"
              accessibilityLabel="Ir a mi cuenta"
              onPress={() => router.push('/customer/account')}
              style={styles.avatar}
            >
              <Avatar name={name ?? 'Mi cuenta'} />
            </PulsePressable>
          </View>
        </Enter>
        {active ? (
          <Enter index={1}>
            <PulsePressable
              accessibilityRole="button"
              onPress={() => showOrder(active.id)}
              style={styles.active}
            >
              <View style={styles.activeIcon}>
                <Icon name={active.status === 'on_the_way' ? 'truck' : 'clock'} />
              </View>
              <View style={ui.flex}>
                <Text variant="label">{orderHeadlines[active.status]}</Text>
                <Text variant="note" style={ui.muted}>
                  Seguir mi pedido
                </Text>
              </View>
              <Icon name="arrowRight" />
            </PulsePressable>
          </Enter>
        ) : null}
        <Enter index={1}>
          <LinearGradient
            colors={[theme.colors.heroStart, theme.colors.heroEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBody}>
              <Text variant="display" accessibilityRole="header" style={styles.heroTitle}>
                Calor para tu día.
              </Text>
              <View pointerEvents="none" style={styles.heroArt}>
                <View style={styles.halo} />
                <CylinderBrandComposition />
              </View>
            </View>
            <View style={styles.heroFooter}>
              <Text variant="note" style={styles.heroNote}>
                Tu gas a domicilio,{'\n'}sin complicarte.
              </Text>
              <PulsePressable
                haptic
                accessibilityRole="button"
                accessibilityLabel="Pedir gas a domicilio"
                onPress={() => startOrder()}
                style={styles.heroCta}
              >
                <Text variant="label" style={styles.heroCtaText}>
                  Pedir gas
                </Text>
                <Icon name="arrowRight" color={theme.colors.text} />
              </PulsePressable>
            </View>
          </LinearGradient>
        </Enter>
        <Enter index={2}>
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text variant="title" accessibilityRole="header">
                Tu cilindro de siempre
              </Text>
            </View>
            <Text variant="note" style={ui.muted}>
              Elige el tamaño. Después, tu marca.
            </Text>
            <CylinderSelector value={weight} onChange={setWeight} />
            {weight ? (
              <Button label={`Pedir cilindro de ${weight} kg`} onPress={() => startOrder(weight)} />
            ) : null}
          </View>
        </Enter>
        {failed ? (
          <EmptyState
            icon="refresh"
            title="No pudimos actualizar"
            description="Revisa tu conexión. Tus pedidos disponibles siguen aquí."
            action={{
              label: 'Reintentar',
              onPress: () => {
                void orders.refetch();
                void catalogue.refetch();
              },
            }}
          />
        ) : null}
        {orders.isPending ? <Skeleton rows={2} /> : null}
        {recent.length > 0 ? (
          <Enter index={3}>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text variant="title" accessibilityRole="header">
                  Tu actividad
                </Text>
                <PulsePressable
                  accessibilityRole="button"
                  onPress={() => router.push('/customer/orders')}
                  style={styles.all}
                >
                  <Text variant="label" style={ui.primaryText}>
                    Ver todos
                  </Text>
                  <Icon name="arrowRight" size={theme.spacing.md} />
                </PulsePressable>
              </View>
              {recent.map((order) => (
                <HistoryRow key={order.id} order={order} product={productFor(order)} />
              ))}
            </View>
          </Enter>
        ) : null}
        {orders.isSuccess && !orders.isError && items.length === 0 ? (
          <Enter index={3}>
            <EmptyState
              title="Tu casa tiene un nuevo aliado"
              description="Elige tu cilindro, indica dónde lo llevamos y sigue el pedido desde aquí."
            />
          </Enter>
        ) : null}
        <Enter index={4}>
          <View style={styles.receipt}>
            <Icon name="exchange" color={theme.colors.accent} />
            <View style={ui.flex}>
              <Text variant="label">¿Tienes un envase vacío?</Text>
              <Text variant="note" style={ui.muted}>
                Indícalo al pedir para coordinar el canje.
              </Text>
            </View>
          </View>
        </Enter>
      </ScrollView>
    </SafeAreaView>
  );
}
function HistoryRow({ order, product }: { order: Order; product: Product | undefined }) {
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`Ver pedido del ${formatDate(order.created_at)}`}
      onPress={() => showOrder(order.id)}
      style={styles.history}
    >
      <View style={styles.historyIcon}>
        <Icon
          name={
            order.status === 'delivered'
              ? 'check'
              : order.status === 'cancelled'
                ? 'close'
                : 'orders'
          }
        />
      </View>
      <View style={styles.historyCopy}>
        <Text variant="label">
          {product ? `${product.brand} · ${productLabel(product)}` : 'Pedido de gas'}
        </Text>
        <Text variant="note" style={ui.muted}>
          {formatDate(order.created_at)} · {formatClp(order.total_clp)}
        </Text>
        <OrderStatus status={order.status} />
      </View>
      <Icon name="arrowRight" size={theme.spacing.md} />
    </PulsePressable>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  avatar: { minWidth: theme.layout.touchTarget, minHeight: theme.layout.touchTarget },
  hero: {
    ...theme.elevation.medium,
    overflow: 'hidden',
    borderRadius: theme.radii.hero,
    padding: theme.spacing.lg,
    minHeight: theme.layout.heroHeight,
    gap: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.heroMuted,
    letterSpacing: theme.typography.tracking.eyebrow,
    fontSize: theme.typography.sizes.note,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.heroBodyHeight,
    gap: theme.spacing.sm,
  },
  heroTitle: {
    color: theme.colors.onPrimary,
    fontSize: theme.discovery.type.hero,
    lineHeight: theme.discovery.type.heroLine,
    letterSpacing: theme.discovery.type.tracking,
    flex: 1,
    zIndex: 1,
  },
  heroArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.heroEnd,
    backgroundColor: theme.colors.heroEnd,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  heroNote: { color: theme.colors.heroMuted, flex: 1 },
  heroCtaText: { color: theme.colors.text },
  heroCta: {
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.lime,
    borderRadius: theme.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  section: { gap: theme.spacing.compact },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  active: {
    ...theme.elevation.low,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderLeftWidth: theme.borders.accent,
    borderLeftColor: theme.colors.primary,
  },
  activeIcon: {
    padding: theme.spacing.compact,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.control,
  },
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
  history: {
    ...theme.elevation.low,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
  },
  historyCopy: { flex: 1, gap: theme.spacing.xs },
  historyIcon: {
    padding: theme.spacing.compact,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderTopWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
  },
});
