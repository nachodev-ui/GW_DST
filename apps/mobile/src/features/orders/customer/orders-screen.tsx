import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { Text } from '@/shared/ui/text';
import { Button, Card, Feedback, ui } from '@/shared/ui/components';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { ProductImage } from '@/shared/ui/product-image';
import { Enter } from '@/shared/ui/enter';
import { EmptyState } from '@/shared/ui/empty-state';
import { ListRow } from '@/shared/ui/list-row';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { SegmentedTabs } from '@/shared/ui/segmented-tabs';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { OrderBusinessCard } from './order-business-card';
import { theme } from '@/theme';
import { productLabel, canCancel, formatClp, statusLabels } from '@/shared/orders/contracts';
import {
  useCatalogue,
  useOrders,
  useOrderEvents,
  useOrdersList,
  useOrderActions,
  orderError,
} from './order-data';
import {
  OrderTimeline,
  OrderStatus,
  OrderHero,
  OrderProgressSummary,
  Section,
  orderStyles,
} from './order-ui';

export function OrdersScreen() {
  const orders = useOrdersList();
  const catalogue = useCatalogue();
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const items = (orders.data?.pages.flat() ?? []).filter(
    (order) =>
      filter === 'all' ||
      (filter === 'active'
        ? order.status !== 'delivered' && order.status !== 'cancelled'
        : order.status === 'delivered' || order.status === 'cancelled'),
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orderStyles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={orderStyles.header}>
            <View style={ui.brandHeader}>
              <View style={ui.flex}>
                <Text accessibilityRole="header" variant="display">
                  Tus pedidos
                </Text>
              </View>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Actualizar pedidos"
                disabled={orders.isFetching}
                onPress={() => void orders.refetch()}
                style={styles.refresh}
              >
                <Icon name="refresh" />
              </PulsePressable>
            </View>
            <Button label="Hacer un nuevo pedido" onPress={() => router.push('/orders/new')} />
            <SegmentedTabs
              label="Filtrar pedidos"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'En curso' },
                { value: 'closed', label: 'Historial' },
              ]}
            />
            {orders.isPending ? <Skeleton /> : null}
            {orders.isError || catalogue.isError ? (
              <EmptyState
                icon="refresh"
                title="No pudimos actualizar"
                description="Los datos ya disponibles siguen aquí."
                action={{
                  label: 'Reintentar',
                  onPress: () => {
                    void orders.refetch();
                    void catalogue.refetch();
                  },
                }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !orders.isPending && !orders.isError ? (
            <EmptyState
              icon="orders"
              title={
                filter === 'active'
                  ? 'Sin pedidos en curso aquí'
                  : 'Tu próxima entrega parte contigo'
              }
              description={
                orders.hasNextPage
                  ? 'No hay coincidencias entre los pedidos cargados. Puedes cargar más abajo.'
                  : filter === 'all'
                    ? 'Cuando hagas tu primer pedido, podrás revisar aquí cada detalle.'
                    : 'Los pedidos de esta categoría aparecerán aquí.'
              }
            />
          ) : null
        }
        ListFooterComponent={
          orders.hasNextPage ? (
            <View style={styles.more}>
              <Button
                variant="secondary"
                label={orders.isFetchingNextPage ? 'Cargando…' : 'Cargar más pedidos'}
                disabled={orders.isFetchingNextPage}
                onPress={() => void orders.fetchNextPage()}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const product = catalogue.data?.products.find((entry) => entry.id === item.product_id);
          return (
            <Card
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
              accessibilityLabel={`${product ? `${product.brand}, ${productLabel(product)}, ` : ''}${statusLabels[item.status]}, ${formatClp(item.total_clp)}. Ver pedido`}
            >
              <View style={styles.totalRow}>
                <OrderStatus status={item.status} />
                <Text variant="note" style={ui.muted}>
                  {new Date(item.created_at).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              <View style={styles.productSummary}>
                {product ? <ProductImage product={product} /> : <Icon name="orders" />}
                <View style={ui.flex}>
                  <Text variant="subtitle">
                    {product ? `${product.brand} · ${productLabel(product)}` : 'Pedido de gas'}
                  </Text>
                  <Text variant="note" style={ui.muted}>
                    {item.quantity} {item.quantity === 1 ? 'cilindro' : 'cilindros'}
                  </Text>
                </View>
                <Icon name="arrowRight" />
              </View>
              <View style={styles.totalRow}>
                <Text variant="note" style={ui.muted}>
                  Pago contra entrega
                </Text>
                <Text variant="title" style={orderStyles.total}>
                  {formatClp(item.total_clp)}
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
export function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const parsed = z.uuid().safeParse(params.id);
  return parsed.success ? (
    <OrderDetail id={parsed.data} />
  ) : (
    <Screen title="Pedido no válido" onBack={() => router.replace('/customer')}>
      <EmptyState
        icon="orders"
        title="No podemos abrir este pedido"
        description="Vuelve al historial y elige uno de tus pedidos."
        action={{ label: 'Ir a mis pedidos', onPress: () => router.replace('/customer/orders') }}
      />
    </Screen>
  );
}
function OrderDetail({ id }: { id: string }) {
  const orders = useOrders(id);
  const events = useOrderEvents(id);
  const catalogue = useCatalogue();
  const { cancel } = useOrderActions();
  const [confirm, setConfirm] = useState(false);
  const order = orders.data?.[0];
  const product = catalogue.data?.products.find((entry) => entry.id === order?.product_id);
  const commune = catalogue.data?.communes.find((entry) => entry.code === order?.commune_code);
  const refresh = () => {
    void orders.refetch();
    void events.refetch();
    void catalogue.refetch();
  };
  return (
    <Screen title="Tu pedido" compactHeader onBack={() => router.replace('/customer')}>
      {orders.isPending ? <Skeleton rows={4} /> : null}
      {orders.isError ? (
        <EmptyState
          icon="refresh"
          title="No pudimos actualizar el pedido"
          description="Revisa tu conexión y vuelve a intentarlo."
          action={{ label: 'Reintentar', onPress: refresh }}
        />
      ) : null}
      {!orders.isPending && !orders.isError && !order ? (
        <EmptyState
          icon="orders"
          title="No encontramos este pedido"
          description="Revisa los pedidos asociados a tu cuenta."
          action={{ label: 'Ver mis pedidos', onPress: () => router.replace('/customer/orders') }}
        />
      ) : null}
      {order ? (
        <>
          <Enter>
            <OrderHero status={order.status} />
          </Enter>
          <OrderProgressSummary status={order.status} />
          <OrderBusinessCard orderId={order.id} />
          <Button
            variant="secondary"
            label={orders.isRefetching ? 'Actualizando…' : 'Actualizar estado'}
            disabled={orders.isFetching || events.isFetching}
            onPress={refresh}
          />
          <Enter index={1}>
            <Section title="Tu cilindro">
              <View style={styles.productSummary}>
                {product ? <ProductImage product={product} size="medium" /> : null}
                <View style={ui.flex}>
                  <Text variant="title">
                    {product ? `${product.brand} · ${productLabel(product)}` : 'Cilindro de gas'}
                  </Text>
                  <Text variant="note" style={ui.muted}>
                    {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'}
                  </Text>
                  <Text variant="display" style={orderStyles.total}>
                    {formatClp(order.total_clp)}
                  </Text>
                </View>
              </View>
              <Text variant="note" style={ui.muted}>
                {order.exchange_empty ? 'Con canje de envase vacío' : 'Sin canje de envase vacío'}
              </Text>
              {order.exchange_empty && order.returned_brand ? (
                <Text variant="note">
                  Envase devuelto:{' '}
                  {order.returned_brand === 'unknown'
                    ? 'marca por confirmar'
                    : order.returned_brand}
                </Text>
              ) : null}
              {catalogue.isError ? (
                <View style={ui.stack}>
                  <Feedback error text="No pudimos actualizar la descripción del producto." />
                  <Button
                    variant="secondary"
                    label="Reintentar catálogo"
                    onPress={() => void catalogue.refetch()}
                  />
                </View>
              ) : null}
            </Section>
          </Enter>
          <Enter index={2}>
            <Section title="Llegamos aquí">
              <ListRow
                title={order.delivery_address}
                {...(commune ? { subtitle: commune.name } : {})}
                leading={<Icon name="pin" />}
              />
              {order.notes ? (
                <Text variant="note" style={ui.muted}>
                  {order.notes}
                </Text>
              ) : null}
            </Section>
          </Enter>
          <Section title="Paso a paso">
            {events.isPending ? <Skeleton /> : null}
            {events.isError ? (
              <View style={ui.stack}>
                <Feedback error text="No pudimos actualizar los eventos." />
                <Button
                  variant="secondary"
                  label="Reintentar progreso"
                  onPress={() => void events.refetch()}
                />
              </View>
            ) : null}
            {events.data ? (
              <OrderTimeline events={events.data} cancelled={order.status === 'cancelled'} />
            ) : null}
          </Section>
          <View style={ui.stack}>
            <Text variant="note" style={ui.muted}>
              {new Date(order.created_at).toLocaleString('es-CL')}
            </Text>
            <Text selectable variant="note" style={ui.muted}>
              Pedido {order.id}
            </Text>
          </View>
          {canCancel(order.status) && !orders.isError ? (
            <Button
              variant="destructive"
              label="Cancelar pedido"
              onPress={() => {
                cancel.reset();
                setConfirm(true);
              }}
            />
          ) : null}
          <BottomSheet
            visible={confirm && canCancel(order.status) && !orders.isError}
            title="¿Cancelar este pedido?"
            onClose={() => setConfirm(false)}
            dismissible={!cancel.isPending}
          >
            <Text style={ui.muted}>Si confirmas, el pedido quedará cancelado.</Text>
            <Button
              label="Conservar pedido"
              disabled={cancel.isPending}
              onPress={() => setConfirm(false)}
            />
            <Button
              variant="destructive"
              label={cancel.isPending ? 'Cancelando…' : 'Sí, cancelar pedido'}
              disabled={cancel.isPending}
              onPress={() => cancel.mutate(order.id, { onSuccess: () => setConfirm(false) })}
            />
            {cancel.isError ? <Feedback error text={orderError(cancel.error)} /> : null}
          </BottomSheet>
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  refresh: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    padding: theme.spacing.compact,
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  more: { paddingVertical: theme.spacing.lg },
  productSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
});
