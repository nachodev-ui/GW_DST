import { View } from 'react-native';
import { formatClp, productLabel, type Product } from '@/shared/orders/contracts';
import {
  deliveryAvailability,
  serviceStatus,
  type DeliveryOption,
} from '@/shared/orders/delivery-options';
import { Button } from '@/shared/ui/components';
import { ProductImage } from '@/shared/ui/product-image';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { purchaseStyles as s } from './purchase-styles';

export function DeliveryOptionCard({
  option,
  product,
  quantity,
  exchangeEmpty,
  onSelect,
  onDetails,
  onContact,
}: {
  option: DeliveryOption;
  product: Product | undefined;
  quantity: number;
  exchangeEmpty: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onContact?: (() => void) | undefined;
}) {
  const availability = deliveryAvailability(option);
  const status = serviceStatus(option.service.schedule);
  const eta =
    option.service.eta_min !== null && status.open !== false && option.has_available_driver
      ? `${option.service.eta_min}–${option.service.eta_max} min`
      : 'Por confirmar';
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.iconSurface}>
          <Icon name="store" />
        </View>
        <View style={s.grow}>
          <Text variant="subtitle">{option.name}</Text>
          <View style={s.meta}>
            <View style={[s.dot, !availability.canOrder && s.neutralDot]} />
            <Text variant="note" style={s.muted}>
              {availability.canOrder ? 'Reparto disponible' : availability.label}
            </Text>
          </View>
        </View>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalles de ${option.name}`}
          style={s.iconButton}
          onPress={onDetails}
        >
          <Icon name="info" size={theme.layout.tagRemove} />
        </PulsePressable>
      </View>
      <View style={s.product}>
        <View style={s.productArt}>
          {product ? <ProductImage product={product} size="medium" /> : <Icon name="orders" />}
        </View>
        <View style={s.grow}>
          {product ? (
            <Text variant="label">
              {product.brand} · {productLabel(product)}
            </Text>
          ) : null}
          <Text variant="note" style={s.muted}>
            {quantity} {quantity === 1 ? 'cilindro' : 'cilindros'}
          </Text>
          <Text
            variant={option.total_clp === null ? 'subtitle' : 'title'}
            style={option.total_clp === null ? undefined : s.price}
            adjustsFontSizeToFit
            minimumFontScale={theme.purchase.brandMinScale}
            numberOfLines={1}
          >
            {option.total_clp === null ? 'Sin precio' : formatClp(option.total_clp)}
          </Text>
          <View style={s.meta}>
            <Icon name="cash" size={theme.layout.tagRemoveIcon} />
            <Text variant="note" style={s.muted}>
              Pagas al recibir
            </Text>
          </View>
        </View>
      </View>
      <View style={s.meta}>
        <Icon name={exchangeEmpty ? 'exchange' : 'orders'} size={theme.layout.tagRemove} />
        <Text variant="note" style={s.grow}>
          {exchangeEmpty ? 'Entregas cilindro vacío' : 'Cilindro incluido'}
        </Text>
      </View>
      <View style={s.divider} />
      <View style={s.wrap}>
        <View style={s.stat}>
          <View style={s.meta}>
            <Icon name="clock" size={theme.layout.tagRemove} />
            <Text variant="label">{eta}</Text>
          </View>
          <Text variant="note" style={s.muted}>
            Llegada estimada
          </Text>
        </View>
        <View style={s.stat}>
          <View style={s.meta}>
            <Icon name="orders" size={theme.layout.tagRemove} />
            <Text variant="label">{option.stock} disponibles</Text>
          </View>
          <Text variant="note" style={s.muted}>
            Stock de cilindros
          </Text>
        </View>
      </View>
      <Button
        label={availability.canOrder ? 'Elegir distribuidora' : 'No disponible'}
        style={s.primary}
        disabled={!availability.canOrder}
        onPress={onSelect}
      />
      {onContact ? (
        <PulsePressable accessibilityRole="button" style={s.action} onPress={onContact}>
          <Icon name="chat" size={theme.layout.tagRemove} />
          <Text variant="note" style={s.actionText}>
            Consultar por WhatsApp
          </Text>
        </PulsePressable>
      ) : null}
    </View>
  );
}
