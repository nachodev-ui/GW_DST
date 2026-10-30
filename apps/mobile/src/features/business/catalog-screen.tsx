import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSelectedBusiness } from './business-shell';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { productLabel, formatClp } from '@/shared/orders/contracts';
import { Card, Feedback, Input, StatusBadge } from '@/shared/ui/components';
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
import { fetchBusinessProducts, saveBusinessProduct } from '@/features/business/business-data';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { ProductImage } from '@/shared/ui/product-image';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeading, workspaceStyles } from './workspace-ui';
export function CatalogScreen() {
  const business = useSelectedBusiness();
  const businessId = business?.id;
  if (business) return <BusinessWorkspace key={business.id} business={business} />;
  return (
    <Screen
      tabbed
      compactHeader
      title="Catálogo"
      onBack={() => router.replace({ pathname: '/business/manage', params: { businessId } })}
    >
      <EmptyState
        title="Negocio no disponible"
        description="Vuelve a Mi negocio y selecciona el negocio que quieres gestionar."
      />
    </Screen>
  );
}

function BusinessWorkspace({ business }: { business: Business }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BusinessProduct | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const products = useQuery({
    queryKey: ['business-products', session?.user.id, business.id],
    queryFn: () => fetchBusinessProducts(business.id),
    refetchInterval: 30_000,
  });
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['businesses'] }), products.refetch()]);
  return (
    <Screen
      tabbed
      compactHeader
      title="Catálogo"
      onBack={() =>
        router.replace({ pathname: '/business/manage', params: { businessId: business.id } })
      }
      onRefresh={refresh}
    >
      <View style={styles.summary}>
        <Icon name="store" color={theme.colors.primaryLight} />
        <View style={styles.identity}>
          <Text variant="note" style={styles.summaryLabel}>
            Catálogo del negocio
          </Text>
          <Text variant="label" style={styles.summaryName}>
            {business.name}
          </Text>
        </View>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Información del catálogo"
          accessibilityHint="Abre el detalle sobre precios, existencias y canje"
          onPress={() => setShowInfo(true)}
          style={styles.infoAction}
        >
          <Icon name="info" color={theme.colors.primaryLight} size={theme.layout.tagRemove} />
        </PulsePressable>
      </View>
      {!business.is_verified ? (
        <Feedback
          text="El negocio no está habilitado para editar productos. Contacta a administración."
          error
        />
      ) : null}
      <View style={styles.section}>
        <PulsePressable
          accessibilityRole="link"
          accessibilityLabel="Ver cobertura de reparto"
          style={styles.coverageLink}
          onPress={() =>
            router.push({ pathname: '/business/coverage', params: { businessId: business.id } })
          }
        >
          <Icon name="pin" size={theme.layout.tagRemove} />
          <Text variant="note" style={styles.coverageLabel}>
            Cobertura de reparto
          </Text>
          <Icon name="arrowRight" size={theme.layout.tagRemove} />
        </PulsePressable>
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
                  {p.is_listed ? (
                    <StatusBadge label="En catálogo" icon="check" tone="success" />
                  ) : (
                    <View style={styles.unlistedBadge}>
                      <Text variant="note" style={styles.unlistedLabel}>
                        Fuera del catálogo
                      </Text>
                    </View>
                  )}
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
      {showInfo ? (
        <BottomSheet visible title="Acerca del catálogo" onClose={() => setShowInfo(false)}>
          <ScrollView style={styles.editorScroll} contentContainerStyle={styles.section}>
            <Text variant="note" style={workspaceStyles.muted}>
              Precios y stock visibles para tus clientes. Cada pedido reserva stock; al cancelarlo
              se devuelve. Sin canje, el precio incluye el cilindro.
            </Text>
            <Text variant="note" style={workspaceStyles.muted}>
              Sin precio para una modalidad, no se puede comprar en ella.
            </Text>
          </ScrollView>
        </BottomSheet>
      ) : null}
    </Screen>
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
      title="Editar producto"
      onClose={dismiss}
      dismissible={!save.isPending}
      saving={save.isPending}
      saveDisabled={!isDirty || !isValid || !business.is_verified}
      saveLabel="Guardar cambios"
      onSave={() => void handleSubmit((values) => save.mutate(values))()}
      header={
        <Text variant="subtitle" accessibilityRole="header">
          Editar producto
        </Text>
      }
    >
      <ScrollView
        style={styles.editorScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.section}
      >
        <View style={styles.editorProduct}>
          <View style={styles.editorIllustration}>
            <ProductImage product={initial} size="compact" />
          </View>
          <View style={styles.identity}>
            <Text variant="note" style={workspaceStyles.muted}>
              {initial.brand}
            </Text>
            <Text variant="subtitle">{productLabel(initial)}</Text>
          </View>
        </View>
        <Controller
          control={control}
          name="is_listed"
          render={({ field }) => (
            <View style={styles.listingControl}>
              <Text variant="label" style={workspaceStyles.grow}>
                En catálogo
              </Text>
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
        {!listed ? (
          <Text variant="note" style={workspaceStyles.muted}>
            Activa el producto para editar precios y stock.
          </Text>
        ) : null}
        <View style={[styles.editorFields, fieldsDisabled && styles.dimmed]}>
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <Input
                ref={field.ref}
                label="Precio con canje (CLP)"
                prefix={
                  <Text variant="note" style={styles.currencyPrefix}>
                    $
                  </Text>
                }
                style={styles.numericInput}
                value={field.value}
                placeholder="Precio pendiente"
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) field.onChange(value);
                }}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                error={errors.price?.message}
                editable={!fieldsDisabled}
              />
            )}
          />
          <Controller
            control={control}
            name="priceWithoutExchange"
            render={({ field }) => (
              <Input
                ref={field.ref}
                label="Precio sin canje (CLP)"
                prefix={
                  <Text variant="note" style={styles.currencyPrefix}>
                    $
                  </Text>
                }
                style={styles.numericInput}
                value={field.value}
                placeholder="Sin precio"
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) field.onChange(value);
                }}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                editable={!fieldsDisabled}
                error={errors.priceWithoutExchange?.message}
                help="Incluye el cilindro. Opcional."
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
                style={styles.numericInput}
                value={field.value}
                onChangeText={(value) => {
                  if (/^\d*$/.test(value)) field.onChange(value);
                }}
                onBlur={field.onBlur}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={7}
                error={errors.stock?.message}
                editable={!fieldsDisabled}
              />
            )}
          />
        </View>
        {save.isError ? <Feedback text={businessError(save.error)} error /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    borderRadius: theme.business.radius,
    backgroundColor: theme.business.dark,
  },
  summaryLabel: { color: theme.colors.primaryLight },
  summaryName: { color: theme.business.onDark },
  infoAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverageLink: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: theme.layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  coverageLabel: { color: theme.colors.primary, flexShrink: 1 },
  unlistedBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
  unlistedLabel: { color: theme.colors.textMuted, fontSize: theme.business.navLabelSize },
  editorProduct: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  editorIllustration: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
  },
  editorScroll: { flexShrink: 1 },
  editorFields: { gap: theme.spacing.md },
  listingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
  },
  switchTarget: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numericInput: { fontSize: theme.typography.sizes.body, fontVariant: ['tabular-nums'] },
  currencyPrefix: { paddingLeft: theme.spacing.md, color: theme.colors.textMuted },
  dimmed: { opacity: theme.opacity.disabled },
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
