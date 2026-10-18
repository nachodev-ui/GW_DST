import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { ActionButton, Feedback, Page, styles } from '@/shared/ui/page';
import { canCancel, formatClp, statusLabels } from '@/shared/orders/contracts';
import {
  useCatalogue,
  useOrders,
  useOrdersList,
  useOrderActions,
  orderError,
} from '@/features/orders/customer/order-data';
import { Section, orderStyles } from '@/features/orders/customer/order-ui';

export function OrdersScreen() {
  const orders = useOrdersList();
  const catalogue = useCatalogue();
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={orders.data?.pages.flat() ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orderStyles.list}
        refreshing={orders.isRefetching}
        onRefresh={() => void orders.refetch()}
        ListHeaderComponent={
          <View style={orderStyles.header}>
            <Text style={styles.brandText}>gasway</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Mis pedidos
            </Text>
            <Feedback text="Tu gas, con pago al recibirlo." />
            <ActionButton label="Nuevo pedido" onPress={() => router.push('/orders/new')} />
            <ActionButton
              secondary
              label="Mi cuenta"
              onPress={() => router.push('/customer/account')}
            />
            {orders.isPending ? <Feedback text="Cargando tus pedidos…" /> : null}
            {orders.isError ? (
              <>
                <Feedback error text="No pudimos actualizar tus pedidos." />
                <ActionButton secondary label="Reintentar" onPress={() => void orders.refetch()} />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !orders.isPending && !orders.isError ? (
            <Feedback text="Todavía no tienes pedidos. Elige tu primer cilindro cuando lo necesites." />
          ) : null
        }
        ListFooterComponent={
          orders.hasNextPage ? (
            <ActionButton
              secondary
              label={orders.isFetchingNextPage ? 'Cargando…' : 'Ver más pedidos'}
              disabled={orders.isFetchingNextPage}
              onPress={() => void orders.fetchNextPage()}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const product = catalogue.data?.products.find((entry) => entry.id === item.product_id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver pedido ${item.id}, ${statusLabels[item.status]}`}
              onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
              style={({ pressed }) => [orderStyles.row, pressed && styles.dimmed]}
            >
              <Text style={orderStyles.heading}>
                {product ? `${product.brand} · ${product.weight_kg} kg` : 'Pedido de gas'} ·{' '}
                {item.quantity} {item.quantity === 1 ? 'cilindro' : 'cilindros'}
              </Text>
              <Text style={styles.label}>
                {statusLabels[item.status]} · {formatClp(item.total_clp)}
              </Text>
              <Text style={styles.body}>
                {new Date(item.created_at).toLocaleString('es-CL')} · {item.delivery_address}
              </Text>
              <Text style={styles.label}>Ver detalle</Text>
            </Pressable>
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
    <Page title="Pedido no válido" description="Revisa el enlace del pedido.">
      <ActionButton label="Ir a mis pedidos" onPress={() => router.replace('/customer')} />
    </Page>
  );
}
function OrderDetail({ id }: { id: string }) {
  const orders = useOrders(id);
  const catalogue = useCatalogue();
  const { cancel } = useOrderActions();
  const [confirm, setConfirm] = useState(false);
  const order = orders.data?.[0];
  const product = catalogue.data?.products.find((entry) => entry.id === order?.product_id);
  const commune = catalogue.data?.communes.find((entry) => entry.code === order?.commune_code);
  return (
    <Page title="Tu pedido" description="Consulta el estado y los datos de tu entrega.">
      <ActionButton
        secondary
        label="Volver a mis pedidos"
        onPress={() => router.replace('/customer')}
      />
      {orders.isPending ? <Feedback text="Cargando pedido…" /> : null}
      {orders.isError ? (
        <Feedback error text="No pudimos actualizar el pedido. Intenta nuevamente." />
      ) : null}
      {!orders.isPending && !orders.isError && !order ? (
        <Feedback text="No encontramos este pedido en tu cuenta." />
      ) : null}
      <ActionButton
        secondary
        label={orders.isRefetching ? 'Actualizando…' : 'Actualizar estado'}
        disabled={orders.isFetching}
        onPress={() => void orders.refetch()}
      />
      {order ? (
        <>
          <Section title={statusLabels[order.status]}>
            <Text selectable style={styles.body}>
              Pedido {order.id}
            </Text>
            <Feedback text={new Date(order.created_at).toLocaleString('es-CL')} />
            <Text style={styles.label}>
              {product ? `${product.brand} · ${product.weight_kg} kg` : 'Cilindro de gas'}
            </Text>
            <Feedback
              text={`${order.quantity} ${order.quantity === 1 ? 'cilindro' : 'cilindros'} · ${order.exchange_empty ? 'Con canje de envase vacío' : 'Sin canje de envase vacío'}`}
            />
            <Text style={orderStyles.total}>{formatClp(order.total_clp)}</Text>
            <Feedback text="Efectivo contra entrega" />
          </Section>
          <Section title="Entrega">
            <Text selectable style={styles.label}>
              {order.delivery_address}
            </Text>
            <Feedback
              text={
                commune ? `${commune.name} (${commune.code})` : `Comuna CUT ${order.commune_code}`
              }
            />
            {order.notes ? <Feedback text={order.notes} /> : null}
          </Section>
          {canCancel(order.status) && !orders.isError ? (
            <Section title="Cancelación">
              <Feedback text="Puedes cancelar antes de que el repartidor esté en camino." />
              {confirm ? (
                <>
                  <Feedback text="¿Confirmas que quieres cancelar este pedido?" />
                  <ActionButton
                    label={cancel.isPending ? 'Cancelando…' : 'Sí, cancelar pedido'}
                    disabled={cancel.isPending}
                    onPress={() => cancel.mutate(order.id, { onSuccess: () => setConfirm(false) })}
                  />
                  <ActionButton
                    secondary
                    label="Conservar pedido"
                    disabled={cancel.isPending}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <ActionButton secondary label="Cancelar pedido" onPress={() => setConfirm(true)} />
              )}
            </Section>
          ) : null}
          {cancel.isError ? <Feedback error text={orderError(cancel.error)} /> : null}
          {cancel.isSuccess ? <Feedback text="Pedido cancelado." /> : null}
        </>
      ) : null}
    </Page>
  );
}
