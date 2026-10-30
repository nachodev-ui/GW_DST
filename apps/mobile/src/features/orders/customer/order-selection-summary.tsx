import { View } from 'react-native';
import { productLabel, type Product } from '@/shared/orders/contracts';
import { ProductImage } from '@/shared/ui/product-image';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { purchaseStyles as s } from './purchase-styles';

export function OrderSelectionSummary({
  product,
  quantity,
  commune,
  onEdit,
}: {
  product: Product | undefined;
  quantity: number;
  commune: string | undefined;
  onEdit?: (() => void) | undefined;
}) {
  return (
    <View style={s.row}>
      <View style={s.footerImage}>
        {product ? <ProductImage product={product} size="compact" /> : <Icon name="orders" />}
      </View>
      <View style={s.footerInfo}>
        <Text variant="label">
          {product
            ? `${quantity} × ${product.brand} ${productLabel(product)}`
            : 'Tu próximo cilindro'}
        </Text>
        {commune ? (
          <View style={s.meta}>
            <Icon name="pin" size={theme.layout.tagRemoveIcon} />
            <Text variant="note" style={s.muted}>
              {commune}
            </Text>
          </View>
        ) : null}
      </View>
      {onEdit ? (
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Editar dirección o cilindro"
          style={s.iconButton}
          onPress={onEdit}
        >
          <Icon name="edit" />
        </PulsePressable>
      ) : null}
    </View>
  );
}
