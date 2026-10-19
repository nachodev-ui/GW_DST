import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/text';
import { Button, Card, CashNote, Feedback, ui } from '@/shared/ui/components';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { Avatar } from '@/shared/ui/avatar';
import { getDisplayName } from '@/shared/ui/display-name';
import { CylinderIllustration } from '@/shared/ui/cylinder-illustration';
import { ListRow } from '@/shared/ui/list-row';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { BrandLogo, brandLogoKeys } from '@/shared/ui/brand-logo';
import { theme } from '@/theme';

import { productLabel, canCancel, formatClp, statusLabels } from '@/shared/orders/contracts';
import {
  useCatalogue,
  useOrders,
  useOrderEvents,
  useOrdersList,
  useOrderActions,
  orderError,
} from '@/features/orders/customer/order-data';
import {
  OrderTimeline,
  OrderStatus,
  Section,
  orderStyles,
  OrderProgressSummary,
  orderHeadlines,
} from '@/features/orders/customer/order-ui';

export function CustomerHomeScreen() {
  return <OrdersScreen home />;
}

export function OrdersScreen({ home = false }: { home?: boolean }) {
  const orders = useOrdersList();
  const catalogue = useCatalogue();
  const { session } = useAuth();
  const name = getDisplayName(session?.user.user_metadata, session?.user.email);
  const items = orders.data?.pages.flat() ?? [];
  const activeOrder = items.find(
    (order) => order.status !== 'delivered' && order.status !== 'cancelled',
  );
  const refreshAction = (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel="Actualizar pedidos"
      accessibilityState={{ disabled: orders.isFetching }}
      disabled={orders.isFetching}
      onPress={() => void orders.refetch()}
      style={[ui.iconButton, homeStyles.refresh]}
    >
      <Icon name="refresh" />
    </PulsePressable>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <FlatList
        data={home ? [] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orderStyles.list}
        ListHeaderComponent={
          <View style={orderStyles.header}>
            {home ? (
              <>
                <View style={homeStyles.greeting}>
                  <View style={ui.flex}>
                    <Text variant="note" style={ui.muted}>
                      Qué bueno verte
                    </Text>
                    <Text accessibilityRole="header" variant="display">
                      Hola, {name}
                    </Text>
                  </View>
                  <PulsePressable
                    accessibilityRole="button"
                    accessibilityLabel="Ir a Mi cuenta"
                    onPress={() => router.push('/customer/account')}
                    style={homeStyles.avatarButton}
                  >
                    <Avatar name={name} />
                  </PulsePressable>
                </View>
                {activeOrder ? (
                  <Card
                    style={homeStyles.active}
                    accessibilityLabel={`Seguir mi pedido. ${statusLabels[activeOrder.status]}`}
                    onPress={() =>
                      router.push({ pathname: '/orders/[id]', params: { id: activeOrder.id } })
                    }
                  >
                    <OrderStatus status={activeOrder.status} />
                    <Text accessibilityRole="header" variant="title">
                      {orderHeadlines[activeOrder.status]}
                    </Text>
                    <OrderProgressSummary status={activeOrder.status} />
                    <View style={[ui.button, ui.secondary]}>
                      <Text variant="label" compact style={ui.primaryText}>
                        Seguir mi pedido
                      </Text>
                    </View>
                  </Card>
                ) : null}
                <Card
                  style={homeStyles.orderAction}
                  accessibilityLabel="Pedir gas. Elegir mi cilindro"
                  onPress={() => router.push('/orders/new')}
                >
                  <View style={homeStyles.cylinder}>
                    <CylinderIllustration size="small" />
                  </View>
                  <View style={homeStyles.orderCopy}>
                    <Text variant="subtitle" accessibilityRole="header">
                      Pedir gas
                    </Text>
                    <Text variant="note" style={ui.muted}>
                      Elegir mi cilindro
                    </Text>
                  </View>
                  <View style={homeStyles.orderArrow}>
                    <Icon name="arrowRight" color={theme.colors.onPrimary} />
                  </View>
                </Card>
                <CashNote />
              </>
            ) : (
              <>
                <View style={ui.brandHeader}>
                  <Text accessibilityRole="header" variant="display" style={ui.flex}>
                    Tus pedidos
                  </Text>
                  {refreshAction}
                </View>
                <Feedback text="Todo lo que has pedido, en un solo lugar." />
                <Button label="Pedir gas" onPress={() => router.push('/orders/new')} />
              </>
            )}
            {orders.isPending ? <Skeleton /> : null}
            {orders.isError ? (
              <>
                <Feedback error text="No pudimos actualizar tus pedidos." />
                <Button
                  variant="secondary"
                  label="Reintentar"
                  onPress={() => void orders.refetch()}
                />
              </>
            ) : null}
            {orders.isRefetching ? <Skeleton rows={1} /> : null}
          </View>
        }
        ListEmptyComponent={
          !home && !orders.isPending && !orders.isError ? (
            <View style={homeStyles.empty}>
              <CylinderIllustration size="hero" weight={5} />
              <Text variant="subtitle">Tu primer cilindro te espera</Text>
              <Feedback text="Pide gas y lo verás aquí." />
            </View>
          ) : null
        }
        ListFooterComponent={
          !home && orders.hasNextPage ? (
            <View style={homeStyles.more}>
              {orders.isFetchingNextPage ? <Skeleton rows={1} /> : null}
              <Button
                variant="secondary"
                label={orders.isFetchingNextPage ? 'Cargando…' : 'Ver más pedidos'}
                disabled={orders.isFetchingNextPage}
                onPress={() => void orders.fetchNextPage()}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const product = catalogue.data?.products.find((entry) => entry.id === item.product_id);
          return (
            <ListRow
              accessibilityLabel={`Ver pedido ${item.id}, ${statusLabels[item.status]}`}
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
              leading={
                product ? (
                  <BrandLogo
                    brand={brandLogoKeys[product.brand]}
                    variant="mark"
                    size={theme.layout.brandMark}
                  />
                ) : (
                  <Icon name="orders" />
                )
              }
              leadingStyle={homeStyles.brandCircle}
              title={product ? `${product.brand} · ${productLabel(product)}` : 'Pedido de gas'}
              subtitle={`${item.quantity} ${item.quantity === 1 ? 'cilindro' : 'cilindros'} · ${formatClp(item.total_clp)}`}
              trailing={<OrderStatus status={item.status} />}
            />
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
      <Button label="Ir a mis pedidos" onPress={() => router.replace('/customer')} />
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
  return (
    <Screen
      title={order ? orderHeadlines[order.status] : 'Tu pedido'}
      onBack={() => router.replace('/customer')}
    >
      {orders.isPending ? <Skeleton /> : null}
      {orders.isError ? (
        <Feedback error text="No pudimos actualizar el pedido. Intenta nuevamente." />
      ) : null}
      {!orders.isPending && !orders.isError && !order ? (
        <Feedback text="No encontramos este pedido en tu cuenta." />
      ) : null}
      {orders.isRefetching && !orders.isPending ? <Skeleton rows={1} /> : null}
      <Button
        variant="secondary"
        label={orders.isRefetching ? 'Actualizando…' : 'Actualizar estado'}
        disabled={orders.isFetching}
        onPress={() => {
          void orders.refetch();
          void events.refetch();
        }}
      />
      {order ? (
        <>
          <OrderStatus status={order.status} />
          <Section title="Así va tu pedido">
            {events.isPending ? <Skeleton /> : null}
            {events.isError ? (
              <Feedback
                error
                text="No pudimos actualizar el progreso. Actualiza el estado para reintentar."
              />
            ) : null}
            {events.data ? (
              <OrderTimeline events={events.data} cancelled={order.status === 'cancelled'} />
            ) : null}
          </Section>
          <Section title="Tu cilindro">
            <View style={homeStyles.productSummary}>
              {product ? (
                <BrandLogo
                  brand={brandLogoKeys[product.brand]}
                  variant="horizontal"
                  size={theme.layout.brandHorizontal}
                />
              ) : null}
              <View style={ui.flex}>
                <Text variant="title">
                  {product ? `${product.brand} · ${productLabel(product)}` : 'Cilindro de gas'}
                </Text>
                <Text variant="display" style={orderStyles.total}>
                  {formatClp(order.total_clp)}
                </Text>
              </View>
            </View>
            <Text selectable style={ui.muted}>
              Pedido {order.id}
            </Text>
            <Feedback text={new Date(order.created_at).toLocaleString('es-CL')} />
            <Feedback
              text={`${order.quantity} ${order.quantity === 1 ? 'cilindro' : 'cilindros'} · ${order.exchange_empty ? 'Con canje de envase vacío' : 'Sin canje de envase vacío'}`}
            />
            <CashNote />
          </Section>
          <Section title="Entrega">
            <ListRow
              title={order.delivery_address}
              subtitle={commune ? commune.name : 'Comuna de entrega'}
              leading={<Icon name="pin" />}
            />
            {order.notes ? <Feedback text={order.notes} /> : null}
          </Section>
          {canCancel(order.status) && !orders.isError ? (
            <Section title="Cancelación">
              <Feedback text="Puedes cancelar antes de que el repartidor esté en camino." />
              {confirm ? (
                <>
                  <Feedback text="¿Confirmas que quieres cancelar este pedido?" />
                  <Button
                    variant="destructive"
                    label={cancel.isPending ? 'Cancelando…' : 'Sí, cancelar pedido'}
                    disabled={cancel.isPending}
                    onPress={() => cancel.mutate(order.id, { onSuccess: () => setConfirm(false) })}
                  />
                  <Button
                    variant="secondary"
                    label="Conservar pedido"
                    disabled={cancel.isPending}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <Button
                  variant="destructive"
                  label="Cancelar pedido"
                  onPress={() => setConfirm(true)}
                />
              )}
            </Section>
          ) : null}
          {cancel.isError ? <Feedback error text={orderError(cancel.error)} /> : null}
          {cancel.isSuccess ? <Feedback text="Pedido cancelado." /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const homeStyles = StyleSheet.create({
  brandCircle: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    backgroundColor: theme.colors.surface,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  avatarButton: { minWidth: theme.layout.touchTarget, minHeight: theme.layout.touchTarget },
  refresh: { backgroundColor: theme.colors.warm, borderRadius: theme.radii.pill },
  orderAction: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  orderCopy: { flex: 1, gap: theme.spacing.xs },
  cylinder: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.control,
  },
  orderArrow: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
  },
  active: { backgroundColor: theme.colors.primaryLight, gap: theme.spacing.md },
  empty: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  more: { paddingVertical: theme.spacing.lg, gap: theme.spacing.md },
  productSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
});
