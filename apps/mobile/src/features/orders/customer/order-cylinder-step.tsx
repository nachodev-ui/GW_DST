import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { brands, productLabel, type Product } from '@/shared/orders/contracts';
import { BrandLogo, brandLogoKeys } from '@/shared/ui/brand-logo';
import { CylinderSelector } from '@/shared/ui/cylinder-selector';
import { CylinderSizeIllustration } from '@/shared/ui/cylinder-size-illustration';
import { ProductImage } from '@/shared/ui/product-image';
import { Feedback, OptionCard, Stepper } from '@/shared/ui/components';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { purchaseStyles as s } from './purchase-styles';

function SelectionMark() {
  return (
    <View style={s.selectionMark}>
      <Icon name="check" size={theme.layout.tagRemoveIcon} color={theme.purchase.colors.ink} />
    </View>
  );
}

function BrandTile({
  label,
  selected,
  disabled,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <PulsePressable
      haptic
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      style={[s.brand, selected && s.selected]}
      onPress={onPress}
    >
      {children}
      <Text
        variant="label"
        compact
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={theme.purchase.brandMinScale}
      >
        {label}
      </Text>
      {selected ? <SelectionMark /> : null}
    </PulsePressable>
  );
}

export function OrderCylinderStep({
  products,
  brand,
  weight,
  productId,
  quantity,
  exchangeEmpty,
  returnedBrand,
  busy,
  productError,
  quantityError,
  onBrand,
  onWeight,
  onProduct,
  onQuantity,
  onExchange,
  onReturnedBrand,
}: {
  products: Product[];
  brand: Product['brand'] | undefined;
  weight: Product['weight_kg'] | undefined;
  productId: string;
  quantity: number;
  exchangeEmpty: boolean;
  returnedBrand: string;
  busy: boolean;
  productError?: string | undefined;
  quantityError?: string | undefined;
  onBrand: (brand: Product['brand']) => void;
  onWeight: (weight: Product['weight_kg']) => void;
  onProduct: (id: string) => void;
  onQuantity: (quantity: number) => void;
  onExchange: (exchange: boolean) => void;
  onReturnedBrand: (brand: string) => void;
}) {
  const [exchangeInfo, setExchangeInfo] = useState(false);
  const variants = products.filter((item) => item.brand === brand && item.weight_kg === weight);
  return (
    <View style={s.stack}>
      <View style={s.section}>
        <Text variant="subtitle">Elige tu marca</Text>
        <View
          style={s.brandRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Marca que quieres recibir"
        >
          {brands.map((entry) => (
            <BrandTile
              key={entry}
              label={entry}
              selected={brand === entry}
              disabled={busy || !products.some((item) => item.brand === entry)}
              onPress={() => onBrand(entry)}
            >
              <BrandLogo
                brand={brandLogoKeys[entry]}
                variant="mark"
                size={theme.layout.brandMark}
              />
            </BrandTile>
          ))}
        </View>
      </View>
      {brand ? (
        <View style={s.section}>
          <Text variant="subtitle">¿De cuántos kilos?</Text>
          <CylinderSelector
            value={weight}
            brand={brand}
            availableWeights={products
              .filter((item) => item.brand === brand)
              .map((item) => item.weight_kg)}
            disabled={busy}
            onChange={onWeight}
          />
          {variants.length > 1 || (variants.length === 1 && variants[0]!.id !== productId)
            ? variants.map((item) => (
                <OptionCard
                  key={item.id}
                  label={productLabel(item)}
                  illustration={<ProductImage product={item} size="small" />}
                  selected={item.id === productId}
                  disabled={busy}
                  onPress={() => onProduct(item.id)}
                />
              ))
            : null}
        </View>
      ) : null}
      {productError ? <Feedback text={productError} error /> : null}
      <View style={s.card}>
        <View style={s.wrap}>
          <View style={s.grow}>
            <Text variant="subtitle">Cantidad</Text>
            <Text variant="note" style={s.muted}>
              {quantity === 1 ? 'Un cilindro' : `${quantity} cilindros`}
            </Text>
          </View>
          <Stepper value={quantity} disabled={busy} onChange={onQuantity} />
        </View>
        {quantityError ? <Feedback error text={quantityError} /> : null}
      </View>
      <View style={s.section}>
        <Text variant="subtitle">¿Entregas un cilindro vacío?</Text>
        <View
          style={s.choiceGrid}
          accessibilityRole="radiogroup"
          accessibilityLabel="Entrega de cilindro vacío"
        >
          {[true, false].map((exchange) => (
            <PulsePressable
              key={String(exchange)}
              haptic
              accessibilityRole="radio"
              accessibilityLabel={
                exchange ? 'Sí, entrego un cilindro vacío' : 'No tengo cilindro vacío'
              }
              accessibilityState={{ checked: exchangeEmpty === exchange, disabled: busy }}
              disabled={busy}
              style={[s.choice, exchangeEmpty === exchange && s.selected]}
              onPress={() => onExchange(exchange)}
            >
              <View style={s.choiceArt}>
                {exchange ? (
                  <CylinderSizeIllustration
                    weight={weight ?? 11}
                    finish="perla"
                    width={theme.layout.illustrationSelector}
                    height={theme.purchase.choiceArtHeight}
                  />
                ) : brand ? (
                  <ProductImage
                    product={{ brand, weight_kg: weight ?? 11, variant: 'standard' }}
                    size="selector"
                  />
                ) : (
                  <CylinderSizeIllustration
                    weight={weight ?? 11}
                    width={theme.layout.illustrationSelector}
                    height={theme.purchase.choiceArtHeight}
                  />
                )}
              </View>
              <View style={s.meta}>
                <Icon name={exchange ? 'exchange' : 'orders'} size={theme.layout.tagRemove} />
                <Text variant="label" compact>
                  {exchange ? 'Sí, entrego' : 'No tengo'}
                </Text>
              </View>
              {exchangeEmpty === exchange ? <SelectionMark /> : null}
            </PulsePressable>
          ))}
        </View>
      </View>
      {exchangeEmpty ? (
        <View style={s.section}>
          <Text variant="subtitle">La marca del que devuelves</Text>
          <View
            style={s.brandRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Marca del cilindro vacío"
          >
            {brands.map((entry) => (
              <BrandTile
                key={entry}
                label={entry}
                selected={returnedBrand === entry}
                disabled={busy}
                onPress={() => onReturnedBrand(entry)}
              >
                <View style={s.returnedArt}>
                  <ProductImage
                    product={{ brand: entry, weight_kg: weight ?? 11, variant: 'standard' }}
                    size="small"
                  />
                </View>
              </BrandTile>
            ))}
          </View>
          <PulsePressable
            accessibilityRole="radio"
            accessibilityLabel="Otra marca o no sé la marca"
            accessibilityState={{ checked: returnedBrand === 'unknown', disabled: busy }}
            disabled={busy}
            style={[
              s.card,
              s.row,
              returnedBrand === 'unknown' && s.selected,
              {
                borderWidth: theme.borders.focus,
                borderColor:
                  returnedBrand === 'unknown'
                    ? theme.purchase.colors.ink
                    : theme.purchase.colors.paper,
              },
            ]}
            onPress={() => onReturnedBrand('unknown')}
          >
            <Icon name="search" />
            <Text variant="label" style={s.grow}>
              Otra marca / No sé
            </Text>
            {returnedBrand === 'unknown' ? <Icon name="check" /> : null}
          </PulsePressable>
        </View>
      ) : null}
      <PulsePressable
        accessibilityRole="button"
        style={s.action}
        onPress={() => setExchangeInfo(true)}
      >
        <Icon name="info" size={theme.layout.tagRemove} />
        <Text variant="note" style={s.actionText}>
          Sobre el cilindro vacío
        </Text>
      </PulsePressable>
      <BottomSheet
        visible={exchangeInfo}
        title="Tu cilindro vacío"
        onClose={() => setExchangeInfo(false)}
      >
        <View style={s.stack}>
          <View style={s.row}>
            <Icon name="exchange" />
            <Text style={s.grow}>Con canje, entregas el cilindro vacío al recibir tu pedido.</Text>
          </View>
          <View style={s.row}>
            <Icon name="search" />
            <Text style={s.grow}>
              La distribuidora revisará el tipo, la válvula y su estado. La marca informada no
              cambia el precio ni limita las distribuidoras.
            </Text>
          </View>
          <View style={s.row}>
            <Icon name="orders" />
            <Text style={s.grow}>
              Sin cilindro vacío, verás el precio con cilindro incluido si la distribuidora ofrece
              esa modalidad.
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
