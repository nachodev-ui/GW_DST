import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { productLabel, formatClp } from '@/shared/orders/contracts';
import { Button, Card, Feedback, Input } from '@/shared/ui/components';
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

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { StatusBadge } from '@/shared/ui/components';
import { ProductImage } from '@/shared/ui/product-image';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHero, WorkspaceHeading, workspaceStyles } from './workspace-ui';
import { ServiceSettingsEditor } from './service-settings-editor';
export function CatalogScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const businesses = useMyBusinesses();
  const business = businesses.data?.find((item) => item.id === businessId);
  return (
    <Screen
      compactHeader
      title="Catálogo"
      onBack={() => router.replace({ pathname: '/business/manage', params: { businessId } })}
    >
      {business ? (
        <BusinessWorkspace key={business.id} business={business} />
      ) : (
        <EmptyState
          title="Negocio no disponible"
          description="Vuelve a Mi negocio y selecciona el negocio que quieres gestionar."
        />
      )}
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
      <WorkspaceHero
        eyebrow="CATÁLOGO DEL NEGOCIO"
        title="Listo para ofrecer"
        description="Organiza tus productos, precios y existencias."
      >
        <Text variant="note" style={workspaceStyles.heroDescription}>
          {business.name}
        </Text>
      </WorkspaceHero>
      {!business.is_verified ? (
        <Feedback
          text="El negocio no está habilitado para editar productos. Contacta a administración."
          error
        />
      ) : null}
      <View style={styles.section}>
        <View style={workspaceStyles.note}>
          <Text variant="note" style={[workspaceStyles.muted, workspaceStyles.grow]}>
            Estos precios y existencias se muestran al elegir tu distribuidora. Cada pedido reserva
            stock; al cancelarlo se devuelve. El precio sin canje incluye el envase.
          </Text>
        </View>
        <ServiceSettingsEditor business={business} />
        <Button
          label="Ver cobertura de reparto"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/business/coverage', params: { businessId: business.id } })
          }
        />
        <WorkspaceHeading title="Tus productos" detail="Selecciona un producto para editarlo" />
        {products.isPending ? (
          <Skeleton />
        ) : products.isError ? (
          <EmptyState
            title="No pudimos cargar el catálogo"
            description="Revisa tu conexión y vuelve a intentarlo."
            action={{ label: 'Reintentar', onPress: () => void products.refetch() }}
          />
        ) : products.data.length === 0 ? (
          <EmptyState
            icon="orders"
            title="Aún no hay productos"
            description="Solicita a administración la configuración de productos para tus marcas."
          />
        ) : (
          products.data.map((p) => (
            <Card
              key={p.product_id}
              style={styles.product}
              {...(business.is_verified && editing === null
                ? { onPress: () => setEditing(p) }
                : {})}
            >
              <View style={styles.row}>
                <View style={styles.illustration}>
                  <ProductImage product={p} size="small" />
                </View>
                <View style={styles.identity}>
                  <Text variant="note" style={workspaceStyles.muted}>
                    {p.brand}
                  </Text>
                  <Text variant="subtitle">{productLabel(p)}</Text>
                  <StatusBadge
                    label={p.is_listed ? 'En catálogo' : 'Fuera del catálogo'}
                    icon={p.is_listed ? 'check' : 'close'}
                    tone={p.is_listed ? 'success' : 'accent'}
                  />
                </View>
              </View>
              <View style={styles.productFooter}>
                <View style={styles.identity}>
                  <Text variant="note" style={workspaceStyles.muted}>
                    Precio por cilindro
                  </Text>
                  <Text variant="subtitle">
                    {p.unit_price_clp === null ? 'Precio pendiente' : formatClp(p.unit_price_clp)}
                  </Text>
                </View>
                <View style={styles.stock}>
                  <Text variant="subtitle">{p.stock}</Text>
                  <Text variant="note" style={workspaceStyles.muted}>
                    disponibles
                  </Text>
                </View>
              </View>
              <Text variant="label" style={styles.editLabel}>
                {business.is_verified ? 'Editar producto →' : 'Edición no habilitada'}
              </Text>
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
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<BusinessProductForm>({
    resolver: zodResolver(businessProductFormSchema),
    mode: 'onChange',
    defaultValues: {
      price: initial.unit_price_clp?.toString() ?? '',
      priceWithoutExchange: initial.price_without_exchange_clp?.toString() ?? '',
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
  const listed = watch('is_listed');
  const fieldsDisabled = !listed || save.isPending;
  const dismiss = () => {
    void queryClient.invalidateQueries({ queryKey: ['business-products'] });
    close();
  };
  return (
    <BottomSheet
      visible
      title={`Editar ${initial.brand} ${productLabel(initial)}`}
      onClose={dismiss}
      dismissible={!save.isPending}
      saving={save.isPending}
      saveDisabled={!isDirty || !isValid || !business.is_verified}
      saveLabel="Guardar cambios"
      onSave={() => void handleSubmit((values) => save.mutate(values))()}
      header={
        <View style={styles.editorHeading}>
          <View style={styles.illustration}>
            <ProductImage product={initial} size="small" />
          </View>
          <View style={styles.identity}>
            <Text variant="note" style={workspaceStyles.muted}>
              Editar producto
            </Text>
            <Text variant="subtitle" accessibilityRole="header">
              {initial.brand} {productLabel(initial)}
            </Text>
            <StatusBadge
              label={listed ? 'En catálogo' : 'Fuera del catálogo'}
              icon={listed ? 'check' : 'close'}
              tone={listed ? 'success' : 'neutral'}
            />
          </View>
        </View>
      }
    >
      <ScrollView
        style={styles.editorScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.section}
      >
        <Controller
          control={control}
          name="is_listed"
          render={({ field }) => (
            <View style={styles.listingControl}>
              <View style={styles.identity}>
                <Text variant="label">En catálogo</Text>
                <Text variant="note" style={workspaceStyles.muted}>
                  {field.value
                    ? 'El producto se incluye en tu catálogo.'
                    : 'Fuera del catálogo. Conservamos su precio y stock.'}
                </Text>
              </View>
              <View style={styles.switchTarget}>
                <Switch
                  accessibilityLabel="En catálogo"
                  value={field.value}
                  hitSlop={theme.spacing.sm}
                  onValueChange={field.onChange}
                  disabled={save.isPending}
                  onBlur={field.onBlur}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={theme.colors.onPrimary}
                  ios_backgroundColor={theme.colors.border}
                />
              </View>
            </View>
          )}
        />
        <View style={[styles.editorFields, fieldsDisabled && styles.dimmed]}>
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <>
                <Input
                  ref={field.ref}
                  label="Precio con canje (CLP)"
                  prefix="$"
                  style={styles.priceInput}
                  value={field.value}
                  onChangeText={(value) => {
                    if (/^\d*$/.test(value)) field.onChange(value);
                  }}
                  onBlur={field.onBlur}
                  keyboardType="number-pad"
                  maxLength={10}
                  error={errors.price?.message}
                  editable={!fieldsDisabled}
                  help="Pesos enteros, sin puntos ni decimales. Vacío deja el precio pendiente."
                />
                <Text variant="note" accessibilityLiveRegion="polite" style={workspaceStyles.muted}>
                  {field.value === ''
                    ? 'Precio pendiente'
                    : errors.price
                      ? 'Revisa el precio ingresado.'
                      : `Vista previa: ${formatClp(Number(field.value))}`}
                </Text>
              </>
            )}
          />
          <Controller
            control={control}
            name="priceWithoutExchange"
            render={({ field }) => (
              <Input
                label="Precio sin canje, con envase (CLP)"
                prefix="$"
                value={field.value}
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) field.onChange(value);
                }}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                maxLength={10}
                editable={!fieldsDisabled}
                error={errors.priceWithoutExchange?.message}
                help="Total por cilindro con su envase. Vacío permite consultar, pero impide comprar sin canje."
              />
            )}
          />
          <Controller
            control={control}
            name="stock"
            render={({ field }) => (
              <View style={styles.editorFields}>
                <Text variant="label">Cilindros disponibles</Text>
                <View style={styles.stockStepper}>
                  <Button
                    label="−"
                    variant="secondary"
                    accessibilityLabel="Quitar un cilindro disponible"
                    disabled={fieldsDisabled || Number(field.value) <= 0}
                    onPress={() => field.onChange(String(Math.max(0, Number(field.value) - 1)))}
                  />
                  <View style={styles.identity}>
                    <Input
                      ref={field.ref}
                      label="Cilindros disponibles"
                      hideLabel
                      style={styles.stockInput}
                      value={field.value}
                      onChangeText={(value) => {
                        if (/^\d*$/.test(value)) field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      keyboardType="number-pad"
                      maxLength={7}
                      accessibilityHint={errors.stock?.message}
                      editable={!fieldsDisabled}
                    />
                  </View>
                  <Button
                    label="+"
                    variant="secondary"
                    accessibilityLabel="Agregar un cilindro disponible"
                    disabled={fieldsDisabled || !!errors.stock}
                    onPress={() => field.onChange(String(Number(field.value) + 1))}
                  />
                </View>
                {errors.stock ? (
                  <Text variant="note" accessibilityRole="alert" style={styles.fieldError}>
                    {errors.stock.message}
                  </Text>
                ) : null}
                <Text variant="note" style={workspaceStyles.muted}>
                  Cilindros enteros, sin decimales.
                </Text>
              </View>
            )}
          />
        </View>
        {save.isError ? <Feedback text={businessError(save.error)} error /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  editorHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  editorScroll: { flexShrink: 1 },
  editorFields: { gap: theme.spacing.compact },
  listingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    backgroundColor: theme.colors.warm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
  },
  switchTarget: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInput: { fontSize: theme.typography.sizes.title },
  stockInput: { textAlign: 'center', fontSize: theme.typography.sizes.subtitle },
  stockStepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dimmed: { opacity: theme.opacity.disabled },
  fieldError: { color: theme.colors.error },
  identity: { flex: 1, gap: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  product: {
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  illustration: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
  },
  productFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
  stock: { gap: theme.spacing.xs, alignItems: 'flex-end' },
  editLabel: { color: theme.colors.primary },
  section: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
});
