import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { Button, Feedback, Input, ui } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { weights, productLabel, type Commune, type Product } from '@/shared/orders/contracts';
import { deliveryAvailability, type DeliveryOption } from '@/shared/orders/delivery-options';
import { useCatalogue, useOrderActions, orderError } from './order-data';
import { createOrderFormSchema, type OrderForm } from './order-form';
import { useDeliveryOptions } from './delivery-data';
import { DeliveryOptionsList } from './delivery-options-list';
import { nativeGeocoder, readSavedAddress, rememberAddress } from './address-data';
import { theme } from '@/theme';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { ListRow } from '@/shared/ui/list-row';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { trackEvent } from '@/shared/analytics/track-event';
import { CoverageInterest } from './coverage-interest';
import { DeliveryPointPicker } from './delivery-point-picker';
import { deliveryPointSchema, type DeliveryPoint } from '@/shared/orders/delivery-point';
import { OrderCylinderStep } from './order-cylinder-step';
import { OrderSelectionSummary } from './order-selection-summary';
import { OrderReviewSummary } from './order-review-summary';
import { purchaseStyles as purchase } from './purchase-styles';

type Weight = (typeof weights)[number];
const steps = ['Entrega', 'Tu cilindro', 'Distribuidoras'] as const;
export function NewOrderScreen() {
  const catalogue = useCatalogue();
  const { session } = useAuth();
  if (catalogue.data)
    return (
      <OrderFields
        key={session?.user.id}
        products={catalogue.data.products}
        communes={catalogue.data.communes}
      />
    );
  return (
    <Screen title="Nuevo pedido" compactHeader onBack={() => router.replace('/customer')}>
      {catalogue.isPending ? (
        <Skeleton rows={4} />
      ) : (
        <EmptyState
          title="No pudimos cargar el catálogo"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={{ label: 'Reintentar', onPress: () => void catalogue.refetch() }}
        />
      )}
    </Screen>
  );
}
function OrderFields({ products, communes }: { products: Product[]; communes: Commune[] }) {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ weight?: string | string[] }>();
  const [weight, setWeight] = useState<Weight | undefined>(
    weights.find((entry) => String(entry) === params.weight),
  );
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<Product['brand']>();
  const [returnedBrand, setReturnedBrand] = useState('unknown');
  const [communeSearch, setCommuneSearch] = useState('');
  const [communeSheetOpen, setCommuneSheetOpen] = useState(false);
  const [remember, setRemember] = useState(false);
  const [locating, setLocating] = useState(false);
  const [addressFeedback, setAddressFeedback] = useState('');
  const [locationSuggestion, setLocationSuggestion] = useState<DeliveryPoint | null>(null);
  const [selected, setSelected] = useState<DeliveryOption | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const addressEdited = useRef(false);
  const requestIds = useRef(new Map<string, string>());
  const { create } = useOrderActions();
  const {
    control,
    getValues,
    handleSubmit,
    setValue,
    trigger,
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
      deliveryPoint: null,
    },
  });
  const values = useWatch({ control });
  const parsedPoint = deliveryPointSchema.safeParse(values.deliveryPoint);
  const confirmedPoint = parsedPoint.success ? parsedPoint.data : null;
  const product = products.find((entry) => entry.id === values.productId);
  const selectedCommune = communes.find((entry) => entry.code === values.communeCode);
  const quantity = Number(values.quantity ?? '1');
  const results = useDeliveryOptions(
    values.productId ?? '',
    values.communeCode ?? '',
    quantity,
    values.exchangeEmpty ?? true,
    step === 2,
  );
  const busy = create.isPending || create.isSuccess;
  const search = communeSearch.trim().toLocaleLowerCase('es-CL');
  useEffect(() => {
    if (
      step === 2 &&
      results.data &&
      !results.data.some((entry) => entry.has_coverage) &&
      !results.isError
    )
      trackEvent('no_coverage_viewed', {});
  }, [step, results.data, results.isError]);
  const matches = communes.filter(
    (entry) =>
      entry.name.toLocaleLowerCase('es-CL').includes(search) || entry.code.includes(search),
  );
  useEffect(() => {
    let active = true;
    if (session)
      void readSavedAddress(session.user.id)
        .then((saved) => {
          if (
            !active ||
            !saved ||
            addressEdited.current ||
            !communes.some((entry) => entry.code === saved.communeCode)
          )
            return;
          setValue('address', saved.address);
          setValue('communeCode', saved.communeCode);
          setValue('deliveryPoint', saved.deliveryPoint ?? null);
          setRemember(true);
        })
        .catch(() => {
          if (active)
            setAddressFeedback('No pudimos recuperar la dirección guardada. Puedes escribirla.');
        });
    return () => {
      active = false;
    };
  }, [session, communes, setValue]);
  const locate = async () => {
    setLocating(true);
    setAddressFeedback('');
    addressEdited.current = true;
    try {
      const located = await nativeGeocoder.locate(communes);
      if (located.address) setValue('address', located.address);
      setValue('communeCode', located.communeCode ?? '');
      setValue('deliveryPoint', null);
      setLocationSuggestion(located.deliveryPoint ?? null);
      setAddressFeedback(
        located.communeCode
          ? 'Revisa la calle, número y comuna antes de continuar.'
          : 'Revisa la dirección y selecciona tu comuna; no pudimos identificarla con certeza.',
      );
    } catch (error) {
      setAddressFeedback(
        error instanceof Error
          ? error.message
          : 'No pudimos obtener tu ubicación. Escribe tu dirección.',
      );
    } finally {
      setLocating(false);
    }
  };
  const advance = async () => {
    if (step === 0 && (await trigger(['address', 'communeCode', 'notes']))) {
      if (Platform.OS !== 'web' && !getValues('deliveryPoint')) {
        setAddressFeedback('Confirma el punto de entrega en el mapa antes de continuar.');
        return;
      }
      if (session && Platform.OS !== 'web') {
        try {
          await rememberAddress(
            session.user.id,
            remember
              ? {
                  address: getValues('address'),
                  communeCode: getValues('communeCode'),
                  deliveryPoint: getValues('deliveryPoint') ?? null,
                }
              : null,
          );
        } catch {
          setAddressFeedback('No pudimos guardar la dirección en este teléfono. Puedes continuar.');
        }
      }
      setStep(1);
      trackEvent('address_set', {});
    } else if (step === 1 && (await trigger(['productId', 'quantity', 'exchangeEmpty'])))
      setStep(2);
  };
  const select = (option: DeliveryOption) => {
    const key = JSON.stringify({ ...getValues(), returnedBrand, distributor: option.id });
    const requestId = requestIds.current.get(key) ?? option.request_id;
    requestIds.current.set(key, requestId);
    create.reset();
    setSelected({ ...option, request_id: requestId });
  };
  const submit = handleSubmit((input) => {
    if (!selected || selected.total_clp === null || !deliveryAvailability(selected).canOrder)
      return;
    create.mutate(
      {
        ...input,
        distributorId: selected.id,
        requestId: selected.request_id,
        expectedUnitPrice: selected.total_clp / Number(input.quantity),
        returnedBrand: input.exchangeEmpty ? returnedBrand : null,
      },
      {
        onSuccess: (order) =>
          router.replace({ pathname: '/orders/[id]', params: { id: order.id } }),
      },
    );
  });
  return (
    <Screen
      key={step}
      title="Nuevo pedido"
      {...(step === 2
        ? {
            onRefresh: async () => {
              if (!busy) await results.refetch({ cancelRefetch: false });
            },
          }
        : {})}
      compactHeader
      onBack={() => (step > 0 ? setStep(step - 1) : router.replace('/customer'))}
      footer={
        <View style={purchase.footer}>
          {step > 0 ? (
            <OrderSelectionSummary
              product={product}
              quantity={quantity}
              commune={selectedCommune?.name}
              onEdit={step === 2 ? () => setEditOpen(true) : undefined}
            />
          ) : null}
          {step < 2 ? (
            <Button
              label={step === 0 ? 'Elegir cilindro' : 'Ver distribuidoras'}
              style={purchase.primary}
              disabled={locating || busy}
              onPress={() => void advance()}
            />
          ) : null}
        </View>
      }
    >
      <View style={purchase.heading}>
        <View style={styles.progress} accessibilityLabel={`Paso ${step + 1} de 3: ${steps[step]}`}>
          {steps.map((label, index) => (
            <View
              key={label}
              style={[styles.progressBar, index <= step && styles.progressActive]}
            />
          ))}
        </View>
        <Text variant="note" style={purchase.muted}>
          {step + 1} de 3 · {steps[step]}
        </Text>
        <Text
          variant="display"
          style={step > 0 ? purchase.title : undefined}
          accessibilityRole="header"
        >
          {['¿Dónde lo llevamos?', 'Arma tu pedido', '¿Quién lo lleva?'][step]}
        </Text>
      </View>
      {step === 0 ? (
        <View style={ui.stack}>
          <Text style={ui.muted}>Tu dirección primero, para encontrar cobertura en tu comuna.</Text>
          <Button
            label={locating ? 'Buscando ubicación…' : 'Usar mi ubicación'}
            variant="secondary"
            disabled={locating}
            onPress={() => void locate()}
          />
          {addressFeedback ? <Feedback text={addressFeedback} /> : null}
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Input
                label="Dirección de entrega"
                placeholder="Calle y número"
                autoComplete="street-address"
                help="Incluye departamento o casa, si corresponde."
                value={field.value}
                ref={field.ref}
                editable={!locating}
                onChangeText={(value) => {
                  addressEdited.current = true;
                  field.onChange(value);
                  setValue('deliveryPoint', null);
                  setLocationSuggestion(null);
                }}
                onBlur={field.onBlur}
                error={errors.address?.message}
              />
            )}
          />
          <ListRow
            title="Comuna"
            subtitle={selectedCommune?.name ?? 'Elige tu comuna'}
            leading={<Icon name="pin" />}
            disabled={locating}
            onPress={() => {
              setCommuneSearch('');
              setCommuneSheetOpen(true);
            }}
          />
          {errors.communeCode?.message ? (
            <Feedback error text={errors.communeCode.message} />
          ) : null}
          <DeliveryPointPicker
            point={confirmedPoint}
            suggestion={locationSuggestion}
            onConfirm={(point) => {
              addressEdited.current = true;
              setValue('deliveryPoint', point, { shouldValidate: true });
              setAddressFeedback('Punto confirmado. Revisa también la dirección y comuna.');
            }}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input
                label="Indicaciones (opcional)"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.notes?.message}
                editable={!locating}
                maxLength={1000}
              />
            )}
          />
          {Platform.OS !== 'web' ? (
            <View style={ui.equalRow}>
              <Text style={ui.flex}>Recordar esta dirección en este teléfono</Text>
              <Switch
                accessibilityLabel="Recordar dirección en este teléfono"
                value={remember}
                onValueChange={setRemember}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {step === 1 ? (
        <OrderCylinderStep
          products={products}
          brand={brand}
          weight={weight}
          productId={values.productId ?? ''}
          quantity={quantity}
          exchangeEmpty={values.exchangeEmpty ?? true}
          returnedBrand={returnedBrand}
          busy={busy}
          productError={errors.productId?.message}
          quantityError={errors.quantity?.message}
          onBrand={(entry) => {
            setBrand(entry);
            const matching = products.filter(
              (option) => option.brand === entry && option.weight_kg === weight,
            );
            if (!matching.length) setWeight(undefined);
            setValue(
              'productId',
              matching.find((option) => option.variant === 'standard')?.id ?? '',
              { shouldValidate: true },
            );
          }}
          onWeight={(next) => {
            setWeight(next);
            const matching = products.filter(
              (entry) => entry.brand === brand && entry.weight_kg === next,
            );
            setValue(
              'productId',
              matching.find((entry) => entry.variant === 'standard')?.id ?? '',
              { shouldValidate: true },
            );
            trackEvent('format_selected', { weight: next });
          }}
          onProduct={(id) => setValue('productId', id, { shouldValidate: true })}
          onQuantity={(value) =>
            setValue('quantity', String(value), { shouldValidate: true, shouldDirty: true })
          }
          onExchange={(value) =>
            setValue('exchangeEmpty', value, { shouldValidate: true, shouldDirty: true })
          }
          onReturnedBrand={setReturnedBrand}
        />
      ) : null}
      {step === 2 ? (
        <View style={ui.stack}>
          {results.isPending ? (
            <Skeleton rows={4} />
          ) : results.isError ? (
            <EmptyState
              title="No pudimos consultar distribuidoras"
              description="Revisa tu conexión y vuelve a intentarlo."
              action={{ label: 'Reintentar', onPress: () => void results.refetch() }}
            />
          ) : results.data?.length === 0 ? (
            <EmptyState
              icon="pin"
              title="Sin opciones por ahora"
              description="Prueba otro cilindro o una cantidad menor."
              action={{ label: 'Cambiar cilindro', onPress: () => setStep(1) }}
            />
          ) : results.data ? (
            <>
              <DeliveryOptionsList
                options={results.data}
                quantity={quantity}
                product={product}
                exchangeEmpty={values.exchangeEmpty ?? true}
                onSelect={select}
              />
            </>
          ) : null}
          {results.data &&
          !results.data.some((entry) => entry.has_coverage) &&
          !results.isError &&
          product &&
          selectedCommune ? (
            <CoverageInterest
              key={`${selectedCommune.code}:${product.id}`}
              communeCode={selectedCommune.code}
              productId={product.id}
            />
          ) : null}
        </View>
      ) : null}
      <BottomSheet
        visible={selected !== null}
        title="Revisa tu pedido"
        onClose={() => setSelected(null)}
        dismissible={!busy}
      >
        <ScrollView contentContainerStyle={ui.stack}>
          <OrderReviewSummary
            option={selected}
            product={product}
            quantity={quantity}
            exchangeEmpty={values.exchangeEmpty ?? true}
            returnedBrand={returnedBrand}
            address={values.address ?? ''}
            commune={selectedCommune?.name}
            pointConfirmed={!!values.deliveryPoint}
            notes={values.notes ?? ''}
          />
          {selected && !deliveryAvailability(selected).canOrder ? (
            <Feedback
              text={`${deliveryAvailability(selected).label}. Cierra la revisión y actualiza las distribuidoras para consultar disponibilidad.`}
            />
          ) : null}
          {create.isError ? (
            <>
              <Feedback error text={orderError(create.error)} />
              <Button
                label="Revisar mis pedidos"
                variant="secondary"
                onPress={() => router.replace('/customer/orders')}
              />
            </>
          ) : null}
          <Button
            label={create.isPending ? 'Confirmando…' : 'Confirmar pedido'}
            style={purchase.primary}
            disabled={busy || !selected || !deliveryAvailability(selected).canOrder}
            onPress={() => void submit()}
          />
          <Button
            label="Editar"
            variant="link"
            disabled={busy}
            onPress={() => {
              setSelected(null);
              setStep(1);
            }}
          />
        </ScrollView>
      </BottomSheet>
      <BottomSheet visible={editOpen} title="Editar tu pedido" onClose={() => setEditOpen(false)}>
        <View style={purchase.card}>
          <ListRow
            title="Dirección de entrega"
            subtitle={selectedCommune?.name ?? 'Elegir comuna'}
            leading={<Icon name="pin" />}
            onPress={() => {
              setEditOpen(false);
              setStep(0);
            }}
          />
          <ListRow
            title="Cilindro y cantidad"
            subtitle={
              product
                ? `${quantity} × ${product.brand} ${productLabel(product)}`
                : 'Elegir cilindro'
            }
            leading={<Icon name="orders" />}
            onPress={() => {
              setEditOpen(false);
              setStep(1);
            }}
          />
        </View>
      </BottomSheet>
      <BottomSheet
        visible={communeSheetOpen}
        title="Tu comuna"
        onClose={() => setCommuneSheetOpen(false)}
      >
        <Input
          label="Buscar comuna"
          placeholder="Escribe el nombre"
          value={communeSearch}
          onChangeText={setCommuneSearch}
        />
        <FlatList
          data={matches}
          keyExtractor={(entry) => entry.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text>No encontramos esa comuna.</Text>}
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={item.code}
              leading={<Icon name="pin" />}
              onPress={() => {
                addressEdited.current = true;
                if (getValues('communeCode') !== item.code) {
                  setValue('deliveryPoint', null);
                  setLocationSuggestion(null);
                }
                setValue('communeCode', item.code, { shouldValidate: true });
                setCommuneSheetOpen(false);
              }}
            />
          )}
        />
      </BottomSheet>
    </Screen>
  );
}
const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: theme.spacing.xs },
  progressBar: {
    flex: 1,
    height: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
  },
  progressActive: { backgroundColor: theme.colors.primary },
});
