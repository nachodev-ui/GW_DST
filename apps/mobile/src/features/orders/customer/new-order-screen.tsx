import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { ActionButton, Feedback, Page, styles } from '@/shared/ui/page';
import { brands, weights, formatClp, type Commune, type Product } from '@/shared/orders/contracts';
import { useCatalogue, useOrderActions, orderError } from '@/features/orders/customer/order-data';
import { createOrderFormSchema, type OrderForm } from '@/features/orders/customer/order-form';
import { Choice, Section, orderStyles } from '@/features/orders/customer/order-ui';
import { theme } from '@/theme';

export function NewOrderScreen() {
  const catalogue = useCatalogue();
  return (
    <Page title="Gas para tu casa." description="Elige tu cilindro y dinos dónde lo necesitas.">
      <ActionButton
        secondary
        label="Volver a mis pedidos"
        onPress={() => router.replace('/customer')}
      />
      {catalogue.isPending ? <Feedback text="Cargando catálogo y comunas…" /> : null}
      {catalogue.isError ? (
        <>
          <Feedback error text="No pudimos cargar el catálogo. Revisa tu conexión." />
          <ActionButton label="Reintentar" onPress={() => void catalogue.refetch()} />
        </>
      ) : null}
      {catalogue.data ? (
        <OrderFields products={catalogue.data.products} communes={catalogue.data.communes} />
      ) : null}
    </Page>
  );
}

function OrderFields({ products, communes }: { products: Product[]; communes: Commune[] }) {
  const [brand, setBrand] = useState<(typeof brands)[number]>('Lipigas');
  const [communeSearch, setCommuneSearch] = useState('');
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
    ? communes
        .filter(
          (commune) =>
            commune.name.toLocaleLowerCase('es-CL').includes(search) ||
            commune.code.includes(search),
        )
        .slice(0, 8)
    : [];
  const selectedCommune = communes.find((commune) => commune.code === values.communeCode);
  const submit = handleSubmit((input) => {
    create.mutate(input, {
      onSuccess: (order) => router.replace({ pathname: '/orders/[id]', params: { id: order.id } }),
    });
  });
  return (
    <>
      <Section title="Tu cilindro">
        <Text style={styles.label}>Marca</Text>
        <View style={orderStyles.choices} accessibilityRole="radiogroup">
          {brands.map((entry) => (
            <Choice
              key={entry}
              label={entry}
              selected={entry === brand}
              disabled={create.isPending}
              onPress={() => {
                setBrand(entry);
                setValue('productId', '');
              }}
            />
          ))}
        </View>
        <Text style={styles.label}>Tamaño</Text>
        <View style={orderStyles.choices} accessibilityRole="radiogroup">
          {weights.map((weight) => {
            const option = products.find(
              (entry) => entry.brand === brand && entry.weight_kg === weight,
            );
            const available = option?.unit_price_clp != null;
            return (
              <Choice
                key={weight}
                label={`${weight} kg${available ? '' : ' · No disponible'}`}
                selected={product?.weight_kg === weight}
                disabled={create.isPending || !available}
                onPress={() => {
                  if (option) setValue('productId', option.id, { shouldValidate: true });
                }}
              />
            );
          })}
        </View>
        {errors.productId?.message ? <Feedback error text={errors.productId.message} /> : null}
        {product?.unit_price_clp != null ? (
          <Feedback text={`${formatClp(product.unit_price_clp)} por cilindro`} />
        ) : (
          <Feedback text="Selecciona un tamaño con precio disponible." />
        )}
        <Text style={styles.label}>Cantidad de cilindros</Text>
        <Controller
          control={control}
          name="quantity"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              style={styles.input}
              accessibilityLabel="Cantidad de cilindros, entre 1 y 99"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              editable={!create.isPending}
            />
          )}
        />
        {errors.quantity?.message ? <Feedback error text={errors.quantity.message} /> : null}
        <Text style={styles.label}>¿Entregarás envase vacío para canje?</Text>
        <Controller
          control={control}
          name="exchangeEmpty"
          render={({ field }) => (
            <Switch
              accessibilityLabel="Canje de envase vacío"
              value={field.value}
              onValueChange={field.onChange}
              disabled={create.isPending}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            />
          )}
        />
        <Feedback
          text={
            values.exchangeEmpty
              ? 'Sí, entregaré envase vacío.'
              : 'No, compraré sin canje de envase vacío.'
          }
        />
      </Section>
      <Section title="Dónde lo entregamos">
        <Text style={styles.label}>Dirección y número, departamento si corresponde</Text>
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              style={styles.input}
              accessibilityLabel="Dirección de entrega"
              autoComplete="street-address"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!create.isPending}
            />
          )}
        />
        {errors.address?.message ? <Feedback error text={errors.address.message} /> : null}
        <Text style={styles.label}>Comuna</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Buscar comuna por nombre o código CUT"
          placeholder="Busca tu comuna"
          value={communeSearch}
          editable={!create.isPending}
          onChangeText={(value) => {
            setCommuneSearch(value);
            setValue('communeCode', '');
          }}
        />
        {selectedCommune ? (
          <Feedback text={`Comuna elegida: ${selectedCommune.name} (${selectedCommune.code})`} />
        ) : (
          <>
            {matches.map((commune) => (
              <Choice
                key={commune.code}
                label={`${commune.name} · ${commune.code}`}
                selected={false}
                disabled={create.isPending}
                onPress={() => {
                  setValue('communeCode', commune.code, { shouldValidate: true });
                  setCommuneSearch(commune.name);
                }}
              />
            ))}
            <Feedback
              text={
                search && matches.length === 0
                  ? 'No encontramos esa comuna.'
                  : 'Escribe para buscar y selecciona tu comuna. Si no aparece, agrega más letras o usa su código CUT.'
              }
            />
          </>
        )}
        {errors.communeCode?.message ? <Feedback error text={errors.communeCode.message} /> : null}
        <Text style={styles.label}>Notas para la entrega (opcional)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              multiline
              style={styles.input}
              accessibilityLabel="Notas opcionales para la entrega"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!create.isPending}
            />
          )}
        />
        {errors.notes?.message ? <Feedback error text={errors.notes.message} /> : null}
      </Section>
      <Section title="Resumen">
        <Text style={styles.label}>Efectivo contra entrega</Text>
        <Feedback text="Único método de pago. Pagas al recibir tu pedido." />
        <Text style={orderStyles.total}>
          Total: {total !== null && total <= 2147483647 ? formatClp(total) : 'Por definir'}
        </Text>
        <Feedback text="El servidor confirma el precio vigente al crear el pedido. Revisa el total definitivo en el detalle." />
      </Section>
      {Object.keys(errors).length > 0 ? (
        <Feedback error text="Revisa los campos marcados antes de pedir." />
      ) : null}
      {create.isError ? (
        <>
          <Feedback error text={orderError(create.error)} />
          <ActionButton
            secondary
            label="Revisar mis pedidos"
            onPress={() => router.replace('/customer')}
          />
        </>
      ) : null}
      <ActionButton
        label={create.isPending ? 'Creando pedido…' : 'Pedir con pago contra entrega'}
        disabled={
          create.isPending ||
          product?.unit_price_clp == null ||
          total === null ||
          total > 2147483647 ||
          create.isSuccess
        }
        onPress={() => void submit()}
      />
    </>
  );
}
