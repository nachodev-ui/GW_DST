import { StyleSheet, View } from 'react-native';
import { formatClp, productSchema } from '@/shared/orders/contracts';
import { Card } from '@/shared/ui/components';
import { ProductImage } from '@/shared/ui/product-image';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { BusinessSale } from './workspace-contracts';

const deliveredDate = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const imageIdentity = productSchema.pick({ brand: true, weight_kg: true });

export function SaleDeliveryCard({ sale }: { sale: BusinessSale }) {
  const product = imageIdentity.safeParse(sale);
  // Sales do not include the variant; Abastible 15 kg has multiple distinct photos.
  const hasExactPhoto = product.success && !(sale.brand === 'Abastible' && sale.weight_kg === 15);
  const date = deliveredDate.format(new Date(sale.delivered_at));
  const reference = `#${sale.id.slice(0, 8).toUpperCase()}`;
  return (
    <Card
      accessible
      style={styles.card}
      accessibilityLabel={[
        `Pedido ${reference}, ${date}`,
        `${sale.brand}, ${sale.weight_kg} kg, ${sale.quantity} cilindros`,
        `Venta ${formatClp(sale.total_clp)}`,
      ].join('. ')}
    >
      <View style={styles.metadata}>
        <Text variant="note" style={styles.muted}>
          {date}
        </Text>
        <Text variant="note" style={styles.muted}>
          {reference}
        </Text>
      </View>
      <View style={styles.productRow}>
        <View style={styles.art}>
          {product.success && hasExactPhoto ? (
            <ProductImage product={{ ...product.data, variant: 'standard' }} size="compact" />
          ) : (
            <>
              <Text variant="subtitle">{sale.weight_kg}</Text>
              <Text variant="note" style={styles.muted}>
                kg
              </Text>
            </>
          )}
        </View>
        <View style={styles.identity}>
          <Text variant="label">{sale.brand}</Text>
          <Text variant="note" style={styles.muted}>
            {sale.weight_kg} kg · {sale.quantity} {sale.quantity === 1 ? 'cilindro' : 'cilindros'}
          </Text>
        </View>
        <View style={styles.total}>
          <Text variant="note" style={styles.muted}>
            Venta
          </Text>
          <Text variant="subtitle" style={styles.number}>
            {formatClp(sale.total_clp)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.none,
    gap: theme.spacing.none,
    borderRadius: theme.business.radius,
    borderColor: theme.business.border,
    overflow: 'hidden',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.compact,
  },
  productRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
  },
  art: {
    width: theme.layout.illustrationSelector,
    minHeight: theme.layout.illustrationSelector,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
  },
  identity: { flexGrow: 1, flexBasis: theme.layout.illustration, gap: theme.spacing.xs },
  total: { flexGrow: 1, alignItems: 'flex-end', gap: theme.spacing.xs },
  muted: { color: theme.business.muted },
  number: { fontVariant: ['tabular-nums'] },
});
