import { useState, type ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/text';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import {
  Button,
  Card,
  CashNote,
  Feedback,
  Input,
  SegmentedChoice,
  Stepper,
  ui,
} from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { brands, weights, formatClp, type Commune, type Product } from '@/shared/orders/contracts';
import { useCatalogue, useOrderActions, orderError } from '@/features/orders/customer/order-data';
import { createOrderFormSchema, type OrderForm } from '@/features/orders/customer/order-form';
import { theme } from '@/theme';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { CylinderIllustration } from '@/shared/ui/cylinder-illustration';
import { ListRow } from '@/shared/ui/list-row';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { BrandLogo, brandLogoKeys } from '@/shared/ui/brand-logo';
import { PulsePressable } from '@/shared/ui/pulse-pressable';

export function NewOrderScreen() {
  const catalogue = useCatalogue();
  if (catalogue.data)
    return (
      <OrderFields
        products={catalogue.data.products}
        communes={catalogue.data.communes}
        catalogueFeedback={
          catalogue.isError ? (
            <>
              <Feedback error text="No pudimos actualizar las opciones. Revisa tu conexión." />
              <Button
                label="Reintentar"
                variant="secondary"
                onPress={() => void catalogue.refetch()}
              />
            </>
          ) : null
        }
      />
    );
  return (
    <Screen title="Nuevo pedido" onBack={() => router.replace('/customer')}>
      {catalogue.isPending ? <Skeleton rows={4} /> : null}
      {catalogue.isError ? (
        <>
          <Feedback error text="No pudimos cargar las opciones. Revisa tu conexión." />
          <Button label="Reintentar" onPress={() => void catalogue.refetch()} />
        </>
      ) : null}
    </Screen>
  );
}

function OrderFields({
  products,
  communes,
  catalogueFeedback,
}: {
  products: Product[];
  communes: Commune[];
  catalogueFeedback?: ReactNode;
}) {
  const [brand, setBrand] = useState<(typeof brands)[number]>('Lipigas');
  const [communeSearch, setCommuneSearch] = useState('');
  const [communeSheetOpen, setCommuneSheetOpen] = useState(false);
  const { create } = useOrderActions();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OrderForm>({
    resolver: zodResolver(createOrderFormSchema(communes)),
    defaultValues: {
      productId: '',
      quantity: '1',
      exchangeEmpty: true,
      address: '',
      communeCode: '',
      notes: '',
    },
  });
  const values = useWatch({ control });
  const product = products.find((entry) => entry.id === values.productId);
  const total =
    product?.unit_price_clp != null &&
    /^\d+$/.test(values.quantity ?? '') &&
    Number(values.quantity) >= 1 &&
    Number(values.quantity) <= 99
      ? product.unit_price_clp * Number(values.quantity)
      : null;
  const search = communeSearch.trim().toLocaleLowerCase('es-CL');
  const matches = search
    ? communes.filter(
        (commune) =>
          commune.name.toLocaleLowerCase('es-CL').includes(search) || commune.code.includes(search),
      )
    : communes;
  const selectedCommune = communes.find((commune) => commune.code === values.communeCode);
  const submit = handleSubmit((input) => {
    create.mutate(input, {
      onSuccess: (order) => router.replace({ pathname: '/orders/[id]', params: { id: order.id } }),
    });
  });
  return (
    <Screen
      title="Nuevo pedido"
      onBack={() => router.replace('/customer')}
      footer={
        <View style={ui.stack}>
          <View style={formStyles.totalRow}>
            <View style={ui.stack}>
              <Text variant="label">Total a pagar</Text>
              {product ? (
                <Text variant="note" style={ui.muted}>
                  {values.quantity} × {product.weight_kg} kg
                </Text>
              ) : null}
            </View>
            <Text
              variant={total !== null ? 'title' : 'note'}
              style={formStyles.total}
              accessibilityLiveRegion="polite"
            >
              {total !== null && total <= 2147483647 ? formatClp(total) : 'Elige tu cilindro'}
            </Text>
          </View>
          {create.isPending ? <Skeleton rows={1} /> : null}
          <Button
            label={create.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
            disabled={
              create.isPending ||
              product?.unit_price_clp == null ||
              total === null ||
              total > 2147483647 ||
              create.isSuccess
            }
            onPress={() => void submit()}
          />
        </View>
      }
    >
      {catalogueFeedback}
      <View style={formStyles.selection}>
        <View style={ui.stack}>
          <Text variant="title" accessibilityRole="header">
            Elige tu gas
          </Text>
          <Text variant="note" style={ui.muted}>
            La marca y el tamaño que usas en casa.
          </Text>
        </View>
        <Text variant="label">Marca</Text>
        <View style={ui.equalRow} accessibilityRole="radiogroup" accessibilityLabel="Marca">
          {brands.map((entry) => (
            <View key={entry} style={ui.flex}>
              <PulsePressable
                accessibilityRole="radio"
                accessibilityLabel={entry}
                accessibilityState={{ checked: entry === brand, disabled: create.isPending }}
                style={[formStyles.brandCard, entry === brand && formStyles.brandSelected]}
                disabled={create.isPending}
                onPress={() => {
                  setBrand(entry);
                  setValue('productId', '');
                }}
              >
                <BrandLogo
                  brand={brandLogoKeys[entry]}
                  variant="stacked"
                  size={theme.layout.brandStacked}
                />
                <View style={ui.choiceMark}>{entry === brand ? <Icon name="check" /> : null}</View>
              </PulsePressable>
            </View>
          ))}
        </View>
        <Text variant="label">Tamaño</Text>
        <View
          style={formStyles.grid}
          accessibilityRole="radiogroup"
          accessibilityLabel="Tamaño del cilindro"
        >
          {weights.map((weight) => {
            const option = products.find(
              (entry) => entry.brand === brand && entry.weight_kg === weight,
            );
            const available = option?.unit_price_clp != null;
            const selected = product?.weight_kg === weight;
            return (
              <View key={weight} style={formStyles.cell}>
                <PulsePressable
                  accessibilityRole="radio"
                  accessibilityLabel={`${weight} kg, ${option?.unit_price_clp != null ? formatClp(option.unit_price_clp) : 'No disponible'}`}
                  accessibilityState={{
                    checked: selected,
                    disabled: create.isPending || !available,
                  }}
                  style={[
                    formStyles.sizeCard,
                    selected && formStyles.sizeSelected,
                    !available && formStyles.unavailable,
                  ]}
                  disabled={create.isPending || !available}
                  onPress={() => {
                    if (option) setValue('productId', option.id, { shouldValidate: true });
                  }}
                >
                  <View style={formStyles.sizeHeading}>
                    <Text variant="subtitle" style={ui.flex}>
                      {weight} kg
                    </Text>
                    <View style={ui.choiceMark}>{selected ? <Icon name="check" /> : null}</View>
                  </View>
                  <View style={formStyles.sizeArt}>
                    <CylinderIllustration weight={weight} size="small" />
                  </View>
                  <Text variant="note" style={selected ? ui.primaryText : ui.muted}>
                    {option?.unit_price_clp != null
                      ? formatClp(option.unit_price_clp)
                      : 'No disponible'}
                  </Text>
                </PulsePressable>
              </View>
            );
          })}
        </View>
        <Text variant="note" style={ui.muted}>
          Los tamaños atenuados no están disponibles por ahora.
        </Text>
        {errors.productId?.message ? <Feedback error text={errors.productId.message} /> : null}
      </View>
      <Card style={formStyles.panel}>
        <View style={formStyles.quantityRow}>
          <View style={formStyles.quantityCopy}>
            <Text variant="subtitle" accessibilityRole="header">
              Cantidad
            </Text>
            <Text variant="note" style={ui.muted}>
              ¿Cuántos necesitas?
            </Text>
          </View>
          <Controller
            control={control}
            name="quantity"
            render={({ field }) => (
              <Stepper
                value={Number(field.value)}
                onChange={(value) => field.onChange(String(value))}
                disabled={create.isPending}
              />
            )}
          />
        </View>
        {errors.quantity?.message ? <Feedback error text={errors.quantity.message} /> : null}
        <View style={formStyles.divider} />
        <View style={ui.stack}>
          <Text variant="subtitle" accessibilityRole="header">
            Canje de envase
          </Text>
          <Text variant="note" style={ui.muted}>
            Indica si entregarás un envase vacío al recibir.
          </Text>
        </View>
        <Controller
          control={control}
          name="exchangeEmpty"
          render={({ field }) => (
            <SegmentedChoice
              value={field.value}
              onChange={field.onChange}
              disabled={create.isPending}
            />
          )}
        />
      </Card>
      <Card style={formStyles.panel}>
        <View style={ui.stack}>
          <Text variant="subtitle" accessibilityRole="header">
            ¿Dónde lo llevamos?
          </Text>
          <Text variant="note" style={ui.muted}>
            Agrega los datos de entrega.
          </Text>
        </View>
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input
              label="Dirección de entrega"
              help="Calle, número y departamento, si corresponde."
              ref={field.ref}
              autoComplete="street-address"
              multiline={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!create.isPending}
              error={errors.address?.message}
            />
          )}
        />
        <ListRow
          title="Comuna"
          subtitle={selectedCommune?.name ?? 'Elige dónde lo llevamos'}
          leading={<Icon name="pin" />}
          disabled={create.isPending}
          onPress={() => {
            setCommuneSearch('');
            setCommuneSheetOpen(true);
          }}
        />
        {errors.communeCode?.message ? <Feedback error text={errors.communeCode.message} /> : null}
        <BottomSheet
          visible={communeSheetOpen}
          title="Tu comuna"
          onClose={() => setCommuneSheetOpen(false)}
        >
          <Input
            label="Buscar comuna"
            placeholder="Escribe el nombre"
            autoFocus
            value={communeSearch}
            onChangeText={setCommuneSearch}
          />
          <FlatList
            style={formStyles.sheetList}
            data={matches}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(commune) => commune.code}
            ListEmptyComponent={
              <Feedback text="No encontramos esa comuna. Prueba con otro nombre." />
            }
            renderItem={({ item: commune }) => (
              <ListRow
                title={commune.name}
                subtitle={commune.code === values.communeCode ? 'Comuna elegida' : 'Entregar aquí'}
                leading={<Icon name={commune.code === values.communeCode ? 'check' : 'pin'} />}
                disabled={create.isPending}
                onPress={() => {
                  setValue('communeCode', commune.code, { shouldValidate: true });
                  setCommuneSearch(commune.name);
                  setCommuneSheetOpen(false);
                }}
              />
            )}
          />
        </BottomSheet>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Input
              label="Notas para la entrega (opcional)"
              ref={field.ref}
              multiline
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!create.isPending}
              error={errors.notes?.message}
            />
          )}
        />
      </Card>
      <CashNote />
      {Object.keys(errors).length > 0 ? (
        <Feedback error text="Revisa los campos marcados antes de pedir." />
      ) : null}
      {create.isError ? (
        <>
          <Feedback error text={orderError(create.error)} />
          <Button
            variant="secondary"
            label="Revisar mis pedidos"
            onPress={() => router.replace('/customer/orders')}
          />
        </>
      ) : null}
    </Screen>
  );
}

const formStyles = StyleSheet.create({
  selection: { gap: theme.spacing.md },
  panel: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  quantityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  quantityCopy: { flexGrow: 1, gap: theme.spacing.xs },
  divider: { height: theme.borders.thin, backgroundColor: theme.colors.divider },
  brandCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.card,
    borderWidth: theme.borders.focus,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  brandSelected: { borderColor: theme.colors.primary },
  sizeCard: {
    padding: theme.spacing.compact,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: theme.borders.focus,
    borderColor: theme.colors.surface,
    minHeight: theme.layout.touchTarget,
  },
  sizeSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  sizeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sizeArt: { alignItems: 'center' },
  unavailable: { backgroundColor: theme.colors.warm, borderColor: theme.colors.warm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  cell: { width: '48%', flexGrow: 1, flexBasis: '45%' },
  total: { color: theme.colors.text, flexShrink: 1 },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sheetList: { flexGrow: 0, flexShrink: 1 },
});
