import { StyleSheet, View } from 'react-native';
import { formatClp, productLabel, type Order, type Product } from '@/shared/orders/contracts';
import { Card, ui } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { ProductImage } from '@/shared/ui/product-image';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { OrderBusinessCard } from './order-business-card';

export function OrderSummary({
  order,
  product,
  communeName,
  onDetails,
}: {
  order: Order;
  product: Product | undefined;
  communeName: string | undefined;
  onDetails: () => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.product}>
        {product ? <ProductImage product={product} /> : <Icon name="orders" />}
        <View style={ui.flex}>
          <Text variant="label">
            {product ? `${product.brand} · ${productLabel(product)}` : 'Cilindro de gas'}
          </Text>
          <Text variant="note" style={ui.muted}>
            {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'} ·{' '}
            {order.exchange_empty ? 'Con canje' : 'Sin canje'}
          </Text>
        </View>
      </View>
      <View style={styles.payment}>
        <View style={ui.flex}>
          <Text variant="note" style={ui.muted}>
            Total a pagar
          </Text>
          <Text variant="note" style={ui.muted}>
            Efectivo al recibir
          </Text>
        </View>
        <Text variant="title" style={styles.total}>
          {formatClp(order.total_clp)}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Icon name="pin" size={theme.spacing.screen} />
        <View style={ui.flex}>
          <Text variant="label">{order.delivery_address}</Text>
          {communeName ? (
            <Text variant="note" style={ui.muted}>
              {communeName}
            </Text>
          ) : null}
        </View>
      </View>
      <OrderBusinessCard key={order.id} orderId={order.id} />
      <View style={styles.divider} />
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel="Ver detalles e historial del pedido"
        onPress={onDetails}
        style={styles.details}
      >
        <Text variant="label" style={ui.primaryText}>
          Ver detalles del pedido
        </Text>
        <Icon name="arrowRight" size={theme.spacing.screen} />
      </PulsePressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  product: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  payment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  total: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  divider: { height: theme.borders.thin, backgroundColor: theme.colors.divider },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
});
