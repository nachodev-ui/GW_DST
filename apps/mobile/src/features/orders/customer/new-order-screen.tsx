import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import {
  Button,
  Card,
  Feedback,
  Input,
  OptionCard,
  SegmentedChoice,
  Stepper,
  ui,
} from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import {
  brands,
  weights,
  formatClp,
  productLabel,
  type Commune,
  type Product,
} from '@/shared/orders/contracts';
import { deliveryAvailability, type DeliveryOption } from '@/shared/orders/delivery-options';
import { useCatalogue, useOrderActions, orderError } from './order-data';
import { createOrderFormSchema, type OrderForm } from './order-form';
import { useDeliveryOptions } from './delivery-data';
import { DeliveryOptionsList } from './delivery-options-list';
import { nativeGeocoder, readSavedAddress, rememberAddress } from './address-data';
import { theme } from '@/theme';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { BrandLogo, brandLogoKeys } from '@/shared/ui/brand-logo';
import { ProductImage } from '@/shared/ui/product-image';
import { CylinderSelector } from '@/shared/ui/cylinder-selector';
import { EmptyState } from '@/shared/ui/empty-state';
import { ListRow } from '@/shared/ui/list-row';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { trackEvent } from '@/shared/analytics/track-event';
import { CoverageInterest } from './coverage-interest';

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
  const [selected, setSelected] = useState<DeliveryOption | null>(null);
  const [demoDismissed, setDemoDismissed] = useState(false);
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
    },
  });
  const values = useWatch({ control });
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
      if (session && Platform.OS !== 'web') {
        try {
          await rememberAddress(
            session.user.id,
            remember
              ? { address: getValues('address'), communeCode: getValues('communeCode') }
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
      title="Nuevo pedido"
      compactHeader
      onBack={() => (step > 0 ? setStep(step - 1) : router.replace('/customer'))}
      footer={
        <View style={ui.stack}>
          <Text variant="label">
            {product
              ? `${quantity} × ${product.brand} ${productLabel(product)}`
              : 'Tu próximo cilindro'}
            {selectedCommune ? ` · ${selectedCommune.name}` : ''}
          </Text>
          {step < 2 ? (
            <Button
              label={step === 0 ? 'Elegir cilindro' : 'Ver distribuidoras'}
              disabled={locating || busy}
              onPress={() => void advance()}
            />
          ) : (
            <Button
              label="Cambiar dirección o cilindro"
              variant="secondary"
              onPress={() => setStep(0)}
            />
          )}
        </View>
      }
    >
      <View style={styles.progress} accessibilityLabel={`Paso ${step + 1} de 3: ${steps[step]}`}>
        {steps.map((label, index) => (
          <View key={label} style={[styles.progressBar, index <= step && styles.progressActive]} />
        ))}
      </View>
      <Text variant="note" style={ui.muted}>
        {step + 1} de 3 · {steps[step]}
      </Text>
      <Text variant="display" accessibilityRole="header">
        {['¿Dónde lo llevamos?', 'El de siempre.', 'Elige quién lo lleva.'][step]}
      </Text>
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
        <View style={ui.stack}>
          <Text variant="subtitle">Marca que quieres recibir</Text>
          <View
            style={ui.equalRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Marca a comprar"
          >
            {brands.map((entry) => {
              const available = products.filter((option) => option.brand === entry);
              return (
                <PulsePressable
                  key={entry}
                  accessibilityRole="radio"
                  accessibilityLabel={entry}
                  accessibilityState={{
                    checked: brand === entry,
                    disabled: busy || available.length === 0,
                  }}
                  disabled={busy || available.length === 0}
                  style={[ui.option, ui.flex, brand === entry && ui.selected]}
                  onPress={() => {
                    setBrand(entry);
                    const matching = available.filter((option) => option.weight_kg === weight);
                    if (matching.length === 0) setWeight(undefined);
                    setValue(
                      'productId',
                      matching.find((option) => option.variant === 'standard')?.id ?? '',
                      {
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <BrandLogo
                    brand={brandLogoKeys[entry]}
                    variant="mark"
                    size={theme.layout.brandMark}
                  />
                  <Text variant="label">{entry}</Text>
                </PulsePressable>
              );
            })}
          </View>
          {brand ? (
            <CylinderSelector
              value={weight}
              brand={brand}
              availableWeights={products
                .filter((entry) => entry.brand === brand)
                .map((entry) => entry.weight_kg)}
              disabled={busy}
              onChange={(next) => {
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
            />
          ) : null}
          {products
            .filter((entry) => entry.weight_kg === weight && entry.brand === brand)
            .map((option) => (
              <OptionCard
                key={option.id}
                label={`${option.brand} · ${productLabel(option)}`}
                detail="Consulta precio y stock por distribuidora"
                illustration={<ProductImage product={option} size="small" />}
                selected={values.productId === option.id}
                onPress={() => setValue('productId', option.id, { shouldValidate: true })}
              />
            ))}
          {errors.productId?.message ? <Feedback error text={errors.productId.message} /> : null}
          <Card>
            <View style={ui.equalRow}>
              <Text variant="subtitle" style={ui.flex}>
                Cantidad
              </Text>
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <Stepper
                    value={Number(field.value)}
                    onChange={(value) => field.onChange(String(value))}
                  />
                )}
              />
            </View>
            {errors.quantity?.message ? <Feedback error text={errors.quantity.message} /> : null}
          </Card>
          <Text variant="subtitle">¿Entregas un envase vacío?</Text>
          <Controller
            control={control}
            name="exchangeEmpty"
            render={({ field }) => (
              <SegmentedChoice value={field.value} onChange={field.onChange} />
            )}
          />
          {values.exchangeEmpty ? (
            <View style={ui.stack}>
              <Text variant="label">Marca del envase que devuelves</Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Marca del envase vacío"
                style={ui.stack}
              >
                {[...brands, 'unknown'].map((entry) => (
                  <OptionCard
                    key={entry}
                    label={entry === 'unknown' ? 'No sé / Otra marca' : entry}
                    selected={returnedBrand === entry}
                    onPress={() => setReturnedBrand(entry)}
                  />
                ))}
              </View>
              <Text variant="note" style={ui.muted}>
                La marca del envase devuelto no excluye negocios ni cambia el precio. El negocio
                debe revisar tipo, válvula y condición al recibirlo.
              </Text>
            </View>
          ) : (
            <Text variant="note" style={ui.muted}>
              Verás el precio total con envase incluido, cuando el negocio lo haya informado.
            </Text>
          )}
        </View>
      ) : null}
      {step === 2 ? (
        <View style={ui.stack}>
          <Text style={ui.muted}>
            Cada tarjeta indica si puede repartir en tu comuna; La dirección exacta se confirma al
            aceptar.
          </Text>
          {results.isPending ? (
            <Skeleton rows={4} />
          ) : results.isError ? (
            <EmptyState
              title="No pudimos consultar distribuidoras"
              description="Revisa tu conexión. Necesitamos disponibilidad actualizada antes de pedir."
              action={{ label: 'Reintentar', onPress: () => void results.refetch() }}
            />
          ) : results.data?.length === 0 ? (
            <EmptyState
              icon="pin"
              title="Aún no hay opciones para esta búsqueda"
              description="No hay negocios habilitados con este producto publicado y stock suficiente. Prueba otro cilindro o una cantidad menor."
              action={{ label: 'Cambiar cilindro', onPress: () => setStep(1) }}
            />
          ) : results.data ? (
            <>
              {!demoDismissed && results.data.some((entry) => entry.is_demo) ? (
                <Card>
                  <Text>Datos de demostración: los negocios señalados son ficticios.</Text>
                  <Button label="Entendido" variant="link" onPress={() => setDemoDismissed(true)} />
                </Card>
              ) : null}
              <DeliveryOptionsList options={results.data} quantity={quantity} onSelect={select} />
            </>
          ) : null}
          <Button
            label="Actualizar distribuidoras"
            variant="link"
            disabled={results.isFetching}
            onPress={() => void results.refetch()}
          />
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
          <Text variant="title">{selected?.name}</Text>
          {selected?.is_demo ? (
            <Feedback text="Negocio ficticio: este pedido es de demostración." />
          ) : null}
          {product ? (
            <View style={ui.equalRow}>
              <ProductImage product={product} size="medium" />
              <View style={ui.flex}>
                <Text variant="subtitle">
                  {quantity} × {product.brand} · {productLabel(product)}
                </Text>
                <Text>
                  {values.exchangeEmpty
                    ? `Con canje · envase ${returnedBrand === 'unknown' ? 'de marca por confirmar' : returnedBrand}`
                    : 'Sin canje · envase incluido'}
                </Text>
              </View>
            </View>
          ) : null}
          <Text>{values.address}</Text>
          <Text>{selectedCommune?.name}</Text>
          {values.notes ? <Text variant="note">{values.notes}</Text> : null}
          <Text variant="note">Total a pagar contra entrega</Text>
          <Text variant="display">
            {selected?.total_clp !== null && selected?.total_clp !== undefined
              ? formatClp(selected.total_clp)
              : ''}
          </Text>
          <Text variant="note" style={ui.muted}>
            Se reserva stock al confirmar. El negocio y su conductor deben aceptar la entrega; el
            horario y el tiempo informado son estimaciones.
          </Text>
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
            label={create.isPending ? 'Confirmando…' : 'Confirmar pedido en Gasway'}
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
