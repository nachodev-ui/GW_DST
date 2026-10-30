import { StyleSheet, View } from 'react-native';
import { formatClp, productLabel, type Order, type Product } from '@/shared/orders/contracts';
import { Card, ui } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { ProductImage } from '@/shared/ui/product-image';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function OrderReceipt({
  order,
  product,
  communeName,
}: {
  order: Order;
  product: Product | undefined;
  communeName: string | undefined;
}) {
  return (
    <View style={styles.content}>
      <Card style={styles.receipt}>
        <View style={styles.product}>
          <View style={styles.thumbnail}>
            {product ? <ProductImage product={product} size="small" /> : <Icon name="orders" />}
          </View>
          <View style={ui.flex}>
            <Text variant="note" style={ui.muted}>
              Tu cilindro
            </Text>
            <Text variant="subtitle">{product?.brand ?? 'Cilindro de gas'}</Text>
            {product ? (
              <Text variant="note" style={ui.muted}>
                {productLabel(product)}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.divider} />
        <ReceiptRow
          label="Cantidad"
          value={`${order.quantity} ${order.quantity === 1 ? 'cilindro' : 'cilindros'}`}
        />
        <ReceiptRow
          label="Canje"
          value={order.exchange_empty ? 'Con canje de envase vacío' : 'Sin canje de envase vacío'}
        />
        {order.exchange_empty && order.returned_brand ? (
          <ReceiptRow
            label="Envase devuelto"
            value={
              order.returned_brand === 'unknown' ? 'Marca por confirmar' : order.returned_brand
            }
          />
        ) : null}
        <ReceiptRow label="Pago" value="Efectivo al recibir" />
        <View style={styles.divider} />
        <View style={styles.total}>
          <Text variant="label">Total del pedido</Text>
          <Text variant="subtitle" style={styles.amount}>
            {formatClp(order.total_clp)}
          </Text>
        </View>
      </Card>
      <View style={styles.delivery}>
        <View style={styles.heading}>
          <Icon name="home" size={theme.spacing.screen} />
          <Text variant="label">Punto de entrega</Text>
        </View>
        <Text>{order.delivery_address}</Text>
        {communeName ? (
          <Text variant="note" style={ui.muted}>
            {communeName}
          </Text>
        ) : null}
        {order.notes ? (
          <View style={styles.instructions}>
            <Text variant="label">Indicaciones</Text>
            <Text variant="note" style={ui.muted}>
              {order.notes}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="note" style={ui.muted}>
        {label}
      </Text>
      <Text variant="note" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  receipt: {
    backgroundColor: theme.colors.warm,
    borderWidth: theme.spacing.none,
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
  },
  product: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  thumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.control,
  },
  divider: {
    height: theme.borders.thin,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: { flex: 1, minWidth: theme.layout.illustration, textAlign: 'right' },
  total: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  amount: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  delivery: { gap: theme.spacing.xs },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  instructions: {
    marginTop: theme.spacing.compact,
    paddingLeft: theme.spacing.compact,
    borderLeftWidth: theme.borders.focus,
    borderLeftColor: theme.colors.primaryLight,
    gap: theme.spacing.xs,
  },
});
