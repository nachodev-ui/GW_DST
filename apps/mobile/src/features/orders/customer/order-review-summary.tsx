import { View } from 'react-native';
import { formatClp, productLabel, type Product } from '@/shared/orders/contracts';
import type { DeliveryOption } from '@/shared/orders/delivery-options';
import { ProductImage } from '@/shared/ui/product-image';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { purchaseStyles as s } from './purchase-styles';

export function OrderReviewSummary({
  option,
  product,
  quantity,
  exchangeEmpty,
  returnedBrand,
  address,
  commune,
  pointConfirmed,
  notes,
}: {
  option: DeliveryOption | null;
  product: Product | undefined;
  quantity: number;
  exchangeEmpty: boolean;
  returnedBrand: string;
  address: string;
  commune: string | undefined;
  pointConfirmed: boolean;
  notes: string;
}) {
  if (!option || !product) return null;
  return (
    <View style={s.stack}>
      <View style={s.row}>
        <View style={s.iconSurface}>
          <Icon name="store" />
        </View>
        <View style={s.grow}>
          <Text variant="note" style={s.muted}>
            Tu distribuidora
          </Text>
          <Text variant="subtitle">{option.name}</Text>
        </View>
      </View>
      <View style={[s.card, s.product]}>
        <ProductImage product={product} size="medium" />
        <View style={s.grow}>
          <Text variant="subtitle">
            {quantity} × {product.brand}
          </Text>
          <Text>{productLabel(product)}</Text>
          <View style={s.meta}>
            <Icon name={exchangeEmpty ? 'exchange' : 'orders'} size={theme.layout.tagRemove} />
            <Text variant="note" style={s.grow}>
              {exchangeEmpty ? 'Entregas cilindro vacío' : 'Cilindro incluido'}
            </Text>
          </View>
          {exchangeEmpty ? (
            <Text variant="note" style={s.muted}>
              {returnedBrand === 'unknown'
                ? 'Marca del vacío por confirmar'
                : `Vacío ${returnedBrand}`}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={s.card}>
        <View style={s.row}>
          <Icon name="pin" />
          <View style={s.grow}>
            <Text variant="label">{address}</Text>
            <Text variant="note" style={s.muted}>
              {commune}
            </Text>
          </View>
        </View>
        {pointConfirmed ? (
          <View style={s.meta}>
            <Icon name="check" size={theme.layout.tagRemoveIcon} />
            <Text variant="note" style={s.muted}>
              Punto de entrega confirmado
            </Text>
          </View>
        ) : null}
        {notes ? (
          <View style={s.row}>
            <Icon name="chat" size={theme.layout.tagRemove} />
            <Text variant="note" style={s.grow}>
              {notes}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={s.row}>
        <View style={s.grow}>
          <Text variant="label">Total a pagar</Text>
          <View style={s.meta}>
            <Icon name="cash" size={theme.layout.tagRemove} />
            <Text variant="note" style={s.muted}>
              En efectivo al recibir
            </Text>
          </View>
        </View>
        <Text variant="title" style={s.price}>
          {option.total_clp === null ? 'Por confirmar' : formatClp(option.total_clp)}
        </Text>
      </View>
      <Text variant="note" style={s.muted}>
        Entrega sujeta a aceptación. El horario y la llegada son estimados.
      </Text>
    </View>
  );
}
