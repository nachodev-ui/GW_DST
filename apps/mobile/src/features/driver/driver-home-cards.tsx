import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { z } from 'zod';
import type { assignedOrderSchema, DriverOffer, DriverWorkspace } from './offer-contracts';
import { formatClp, productLabel } from '@/shared/orders/contracts';
import { Button, Card } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { ProductImage } from '@/shared/ui/product-image';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function DriverHomeContext({
  workspace,
  communes,
}: {
  workspace: DriverWorkspace;
  communes: number | undefined;
}) {
  return (
    <View style={styles.context}>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel="Ver mi distribuidora y habilitación"
        onPress={() => router.push('/driver-account')}
        style={styles.business}
      >
        <View style={styles.contextIcon}>
          <Icon name="home" />
        </View>
        <View style={styles.flex}>
          <Text variant="note" style={styles.muted}>
            Tu distribuidora
          </Text>
          <Text variant="label" numberOfLines={2}>
            {workspace.business?.name ?? 'Sin vinculación'}
          </Text>
          {workspace.business?.is_demo ? (
            <Text variant="note" style={styles.muted}>
              Demo
            </Text>
          ) : null}
        </View>
      </PulsePressable>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={
          communes === undefined
            ? 'Ver cobertura'
            : `Ver cobertura en ${communes} ${communes === 1 ? 'comuna' : 'comunas'}`
        }
        onPress={() => router.push('/driver-coverage')}
        style={styles.coverage}
      >
        <Icon name="pin" size={theme.spacing.screen} />
        <Text variant="label">
          {communes === undefined
            ? 'Cobertura'
            : `${communes} ${communes === 1 ? 'comuna' : 'comunas'}`}
        </Text>
        <Icon name="arrowRight" size={theme.spacing.screen} />
      </PulsePressable>
    </View>
  );
}

export function DriverActiveDelivery({ order }: { order: z.infer<typeof assignedOrderSchema> }) {
  return (
    <Card style={styles.active}>
      <View style={styles.activeHeader}>
        <Icon name="truck" color={theme.colors.lime} />
        <Text variant="label" style={styles.onDark}>
          Tu entrega en curso
        </Text>
      </View>
      <Text variant="title" accessibilityRole="header" style={styles.onDark}>
        {order.status === 'accepted' ? 'Pedido confirmado' : 'Ya estás en camino'}
      </Text>
      <View style={styles.productRow}>
        <View style={styles.productArt}>
          <ProductImage product={order} />
        </View>
        <View style={styles.flex}>
          <Text variant="subtitle" style={styles.onDark}>
            {order.brand} · {productLabel(order)}
          </Text>
          <Text variant="note" style={styles.onDark}>
            {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'} ·{' '}
            {order.commune_name}
          </Text>
        </View>
      </View>
      <Button
        label="Continuar entrega"
        variant="secondary"
        style={styles.activeAction}
        onPress={() =>
          router.push({ pathname: '/driver-order/[id]', params: { id: order.order_id } })
        }
      />
    </Card>
  );
}

export const DriverOfferCard = memo(function DriverOfferCard({
  offer,
  now,
  busy,
  accepting,
  rejecting,
  accept,
  reject,
}: {
  offer: DriverOffer;
  now: number;
  busy: boolean;
  accepting: boolean;
  rejecting: boolean;
  accept: (id: string) => void;
  reject: (id: string) => void;
}) {
  const seconds = Math.max(0, Math.ceil((Date.parse(offer.expires_at) - now) / 1000));
  const remaining = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <Card style={styles.offer}>
      <View style={styles.offerHeader}>
        <View style={styles.productArt}>
          <ProductImage product={offer} />
        </View>
        <View style={styles.flex}>
          <Text variant="subtitle">{offer.brand}</Text>
          <Text variant="label">{productLabel(offer)}</Text>
          <Text variant="note" style={styles.muted}>
            {offer.quantity} {offer.quantity === 1 ? 'cilindro' : 'cilindros'}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={`Oferta válida hasta las ${new Date(offer.expires_at).toLocaleTimeString('es-CL')}`}
          style={styles.deadline}
        >
          <Icon name="clock" size={theme.spacing.screen} />
          <Text variant="label" style={styles.timer}>
            {remaining}
          </Text>
        </View>
      </View>
      <View style={styles.offerMeta}>
        <View style={styles.location}>
          <Icon name="pin" size={theme.spacing.screen} />
          <Text variant="label" style={styles.shrink}>
            {offer.commune_name}
          </Text>
        </View>
        <View>
          <Text variant="title" style={styles.total}>
            {formatClp(offer.total_clp)}
          </Text>
          <Text variant="note" style={styles.muted}>
            Cobrar en efectivo
          </Text>
        </View>
      </View>
      <View style={styles.exchange}>
        <Icon name={offer.exchange_empty ? 'exchange' : 'orders'} size={theme.spacing.screen} />
        <Text variant="note" style={styles.shrink}>
          {offer.exchange_empty
            ? `Canje de cilindro vacío · ${offer.returned_brand && offer.returned_brand !== 'unknown' ? offer.returned_brand : 'marca por confirmar'}`
            : 'Sin canje · incluye cilindro'}
        </Text>
      </View>
      <View style={styles.offerActions}>
        <View style={styles.offerAction}>
          <Button
            label={accepting ? 'Aceptando…' : 'Aceptar pedido'}
            loading={accepting}
            disabled={busy}
            onPress={() => accept(offer.order_id)}
          />
        </View>
        <View style={styles.offerAction}>
          <Button
            label={rejecting ? 'Rechazando…' : 'Rechazar'}
            accessibilityLabel="Rechazar oferta"
            loading={rejecting}
            disabled={busy}
            variant="link"
            onPress={() => reject(offer.order_id)}
          />
        </View>
      </View>
    </Card>
  );
});

export function DriverHomeEmpty({ available }: { available: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={available ? 'search' : 'orders'} size={theme.layout.brandMark} />
      </View>
      <Text variant="subtitle" style={styles.emptyText}>
        {available ? 'Sin ofertas por ahora' : 'Tus ofertas aparecerán aquí'}
      </Text>
      {available ? (
        <Text style={[styles.muted, styles.emptyText]}>
          Cuando llegue un pedido a tu zona, lo verás aquí.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: theme.spacing.none },
  shrink: { flexShrink: 1 },
  muted: { color: theme.colors.primary },
  onDark: { color: theme.colors.background },
  context: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
  },
  business: {
    flexGrow: 1,
    flexBasis: theme.layout.illustrationLarge,
    minWidth: theme.layout.illustrationLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    minHeight: theme.layout.touchTarget,
  },
  contextIcon: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.xs,
  },
  active: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    borderRadius: theme.radii.hero,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  activeAction: { backgroundColor: theme.colors.background },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  productArt: {
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
  },
  offer: { gap: theme.spacing.md, padding: theme.spacing.md, borderColor: theme.colors.background },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.compact,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.pill,
    padding: theme.spacing.sm,
  },
  timer: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  offerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  total: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  exchange: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  offerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  offerAction: {
    flexGrow: 1,
    flexBasis: theme.layout.actionColumnMinWidth,
    minWidth: theme.layout.actionColumnMinWidth,
  },
  empty: {
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  emptyIcon: {
    width: theme.layout.illustrationSelector,
    height: theme.layout.illustrationSelector,
    borderRadius: theme.radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lime,
  },
  emptyText: { textAlign: 'center' },
});
