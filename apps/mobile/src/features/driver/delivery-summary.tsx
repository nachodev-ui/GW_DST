import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { z } from 'zod';
import type { assignedOrderSchema } from './offer-contracts';
import { formatClp, productLabel } from '@/shared/orders/contracts';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { ProductImage } from '@/shared/ui/product-image';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function DeliverySummary({ order }: { order: z.infer<typeof assignedOrderSchema> }) {
  const [details, setDetails] = useState(false);
  return (
    <>
      <View style={styles.card}>
        {order.status === 'delivered' ? (
          <Text
            variant="subtitle"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={styles.completionTitle}
          >
            Entrega completada
          </Text>
        ) : null}
        <View style={styles.row}>
          <View style={styles.art}>
            <ProductImage product={order} />
          </View>
          <View style={styles.flex}>
            <Text variant="label">
              {order.brand} · {productLabel(order)}
            </Text>
            <Text variant="note" style={styles.muted}>
              {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'} ·{' '}
              {order.exchange_empty ? 'Con canje' : 'Sin canje'}
            </Text>
          </View>
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel="Ver carga y canje"
            onPress={() => setDetails(true)}
            style={styles.iconButton}
          >
            <Icon name="info" />
          </PulsePressable>
        </View>
        <View style={styles.payment}>
          <View style={[styles.row, styles.flex]}>
            <Icon name="cash" />
            <View style={styles.flex}>
              <Text variant="label">
                {order.status === 'delivered' || order.status === 'cancelled'
                  ? 'Total del pedido'
                  : 'Cobrar al entregar'}
              </Text>
              <Text variant="note" style={styles.muted}>
                En efectivo
              </Text>
            </View>
          </View>
          <Text variant="title" style={styles.amount}>
            {formatClp(order.total_clp)}
          </Text>
        </View>
      </View>
      {order.notes ? (
        <View style={styles.notes}>
          <Icon name="orders" />
          <View style={styles.flex}>
            <Text variant="label">Indicaciones del cliente</Text>
            <Text selectable>{order.notes}</Text>
          </View>
        </View>
      ) : null}
      <BottomSheet visible={details} title="Carga y canje" onClose={() => setDetails(false)}>
        <ScrollView contentContainerStyle={styles.details}>
          <View style={styles.load}>
            <ProductImage product={order} size="medium" />
            <View style={[styles.flex, styles.productDetails]}>
              <Text variant="note" style={styles.muted}>
                Para entregar
              </Text>
              <Text variant="subtitle">
                {order.brand} · {productLabel(order)}
              </Text>
              <Text variant="label">
                {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'}
              </Text>
            </View>
          </View>
          <View style={styles.exchange}>
            <View style={styles.exchangeIcon}>
              <Icon name={order.exchange_empty ? 'exchange' : 'check'} />
            </View>
            <View style={[styles.flex, styles.productDetails]}>
              <Text variant="label">
                {order.exchange_empty ? 'Retirar cilindro vacío' : 'Sin canje'}
              </Text>
              <Text variant="note" style={styles.muted}>
                {order.exchange_empty
                  ? `Marca: ${order.returned_brand && order.returned_brand !== 'unknown' ? order.returned_brand : 'por confirmar'}`
                  : 'No retires cilindro vacío.'}
              </Text>
            </View>
          </View>
          {order.exchange_empty ? (
            <View style={styles.inspection}>
              <Icon name="search" size={theme.spacing.screen} />
              <Text variant="note" style={[styles.flex, styles.muted]}>
                Revisa tipo, válvula y estado.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: theme.spacing.none },
  muted: { color: theme.colors.textMuted },
  completionTitle: { color: theme.colors.text },
  card: {
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  art: {
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
    paddingHorizontal: theme.spacing.sm,
  },
  payment: {
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  amount: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  iconButton: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: { flexDirection: 'row', gap: theme.spacing.compact, paddingHorizontal: theme.spacing.xs },
  details: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  load: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.warm,
  },
  productDetails: { gap: theme.spacing.xs },
  exchange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
  },
  exchangeIcon: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
});
