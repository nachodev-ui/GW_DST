import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { productLabel, formatClp } from '@/shared/orders/contracts';
import { Button, Card, Feedback, Input, OptionCard } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { theme } from '@/theme';
import {
  businessError,
  businessProductFormSchema,
  type Business,
  type BusinessProduct,
  type BusinessProductForm,
} from '@/features/business/business-contracts';
import {
  fetchBusinessProducts,
  saveBusinessProduct,
  useMyBusinesses,
} from '@/features/business/business-data';

export function BusinessScreen() {
  const businesses = useMyBusinesses();
  const [selected, setSelected] = useState<string | null>(null);
  const business = businesses.data?.find((b) => b.id === selected) ?? businesses.data?.[0];
  if (!business) return null; // The workspace layout handles loading, errors and removed membership.
  return (
    <Screen title="Mi negocio" onBack={() => router.replace('/')}>
      {businesses.data && businesses.data.length > 1 ? (
        <View
          style={styles.section}
          accessibilityRole="radiogroup"
          accessibilityLabel="Negocio que gestionas"
        >
          {businesses.data.map((b) => (
            <OptionCard
              key={b.id}
              label={b.name}
              selected={business.id === b.id}
              onPress={() => setSelected(b.id)}
            />
          ))}
        </View>
      ) : null}
      <BusinessWorkspace key={business.id} business={business} />
    </Screen>
  );
}

function BusinessWorkspace({ business }: { business: Business }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BusinessProduct | null>(null);
  const products = useQuery({
    queryKey: ['business-products', session?.user.id, business.id],
    queryFn: () => fetchBusinessProducts(business.id),
    refetchInterval: 30_000,
  });
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['businesses'] }), products.refetch()]);
  return (
    <>
      <View style={styles.identity}>
        <Text variant="title" accessibilityRole="header">
          {business.name}
        </Text>
        <Text>
          {business.member_role === 'owner' ? 'Responsable del negocio' : 'Encargado del negocio'}
        </Text>
        <Text variant="note">Marcas configuradas: {business.brands.join(', ') || 'Ninguna'}</Text>
        {business.is_demo ? (
          <Feedback text="Negocio de prueba. Datos y revisión ficticios; no acredita antecedentes ni habilita un piloto real." />
        ) : null}
        {!business.is_verified ? (
          <Feedback
            text="El negocio no está habilitado. Contacta a administración para revisar su estado."
            error
          />
        ) : null}
      </View>
      <View style={styles.section}>
        <Text variant="subtitle" accessibilityRole="header">
          Equipo
        </Text>
        <Text>
          Incorpora conductores mediante invitaciones individuales o una planilla CSV. Cada persona
          acepta su vínculo y administración revisa su habilitación.
        </Text>
        <Button
          label="Gestionar equipo"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/business/team', params: { businessId: business.id } })
          }
        />
      </View>
      <View style={styles.section}>
        <Text variant="subtitle" accessibilityRole="header">
          Catálogo del negocio
        </Text>
        <Text>
          Prepara precios en pesos y existencias por producto. La compra todavía usa el catálogo de
          prueba anterior; estos valores se conectarán al elegir vendedor y reservar stock.
        </Text>
        {products.isPending ? (
          <Feedback text="Cargando productos…" />
        ) : products.isError ? (
          <Feedback text="No pudimos cargar el catálogo. Actualiza para reintentar." error />
        ) : products.data.length === 0 ? (
          <Text>
            No hay productos activos para las marcas configuradas. Solicita su configuración a
            administración.
          </Text>
        ) : (
          products.data.map((p) => (
            <Card key={p.product_id}>
              <Text variant="label">
                {p.brand} {productLabel(p)}
              </Text>
              <Text>
                {p.unit_price_clp === null ? 'Precio pendiente' : formatClp(p.unit_price_clp)} ·{' '}
                {p.stock} cilindros
              </Text>
              <Text variant="note">
                {p.is_listed
                  ? 'Incluido en el catálogo del negocio'
                  : 'Fuera del catálogo del negocio'}
              </Text>
              <Button
                label={`Editar ${p.brand} ${productLabel(p)}`}
                variant="secondary"
                disabled={!business.is_verified || editing !== null}
                onPress={() => setEditing(p)}
              />
            </Card>
          ))
        )}
        {editing ? (
          <ProductEditor
            key={`${editing.product_id}:${editing.revision}`}
            business={business}
            initial={editing}
            close={() => setEditing(null)}
          />
        ) : null}
      </View>
      <Button
        label="Actualizar datos"
        variant="secondary"
        disabled={products.isFetching}
        onPress={() => void refresh()}
      />
    </>
  );
}

function ProductEditor({
  business,
  initial,
  close,
}: {
  business: Business;
  initial: BusinessProduct;
  close: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessProductForm>({
    resolver: zodResolver(businessProductFormSchema),
    mode: 'onBlur',
    defaultValues: {
      price: initial.unit_price_clp?.toString() ?? '',
      stock: initial.stock.toString(),
      is_listed: initial.is_listed,
    },
  });
  const save = useMutation({
    mutationFn: (values: BusinessProductForm) => saveBusinessProduct(business.id, initial, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-products'] });
      close();
    },
  });
  return (
    <Card>
      <Text variant="subtitle">
        Editar {initial.brand} {productLabel(initial)}
      </Text>
      <Controller
        control={control}
        name="price"
        render={({ field }) => (
          <Input
            ref={field.ref}
            label="Precio por cilindro (CLP)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.price?.message}
            editable={!save.isPending}
            help="Pesos enteros, sin puntos ni decimales. Vacío deja el precio pendiente."
          />
        )}
      />
      <Controller
        control={control}
        name="stock"
        render={({ field }) => (
          <Input
            ref={field.ref}
            label="Cilindros disponibles"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            maxLength={7}
            error={errors.stock?.message}
            editable={!save.isPending}
          />
        )}
      />
      <Controller
        control={control}
        name="is_listed"
        render={({ field }) => (
          <View style={styles.identity}>
            <Text>
              {field.value ? 'Se incluirá en el catálogo.' : 'Quedará fuera del catálogo.'}
            </Text>
            <Button
              label={field.value ? 'Quitar del catálogo' : 'Incluir en el catálogo'}
              variant="secondary"
              disabled={save.isPending}
              onPress={() => field.onChange(!field.value)}
            />
          </View>
        )}
      />
      {save.isError ? <Feedback text={businessError(save.error)} error /> : null}
      <Button
        label={save.isPending ? 'Guardando…' : 'Guardar producto'}
        disabled={save.isPending || !business.is_verified}
        onPress={() => void handleSubmit((values) => save.mutate(values))()}
      />
      <Button
        label={save.isError ? 'Cerrar y cargar datos actuales' : 'Cancelar edición'}
        variant="secondary"
        disabled={save.isPending}
        onPress={() => {
          void queryClient.invalidateQueries({ queryKey: ['business-products'] });
          close();
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  identity: { gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
  section: {
    gap: theme.spacing.md,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.lg,
  },
});
