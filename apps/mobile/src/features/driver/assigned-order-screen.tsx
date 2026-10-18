import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Text } from 'react-native';
import { useAssignedOrder, useDriverActions } from '@/features/driver/offer-data';
import { driverError, driverProgressError } from '@/features/driver/offer-contracts';
import { formatClp, statusLabels } from '@/shared/orders/contracts';
import { ActionButton, Feedback, Page, styles } from '@/shared/ui/page';

export function AssignedOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useAssignedOrder(id);
  const { advance } = useDriverActions();
  const order = query.data;
  const progress = () => {
    if (!order || advance.isPending) return;
    if (order.status === 'accepted') {
      advance.mutate({ id: order.order_id, status: 'on_the_way' });
    } else if (order.status === 'on_the_way') {
      if (Platform.OS === 'web') {
        if (window.confirm('¿Ya entregaste el pedido al cliente?')) {
          advance.mutate({ id: order.order_id, status: 'delivered' });
        }
        return;
      }
      Alert.alert('Confirmar entrega', '¿Ya entregaste el pedido al cliente?', [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Sí, marcar como entregado',
          onPress: () => advance.mutate({ id: order.order_id, status: 'delivered' }),
        },
      ]);
    }
  };
  return (
    <Page
      title="Tu pedido asignado"
      description="La dirección se habilita después de confirmar tu aceptación."
    >
      {query.isPending ? <Feedback text="Consultando tu pedido…" /> : null}
      {query.error ? <Feedback error text={driverError(query.error)} /> : null}
      {!query.isPending && !query.error && !order ? (
        <Feedback text="Este pedido no está asignado a tu cuenta o tu acceso cambió." />
      ) : null}
      {order && !query.error ? (
        <>
          <Text style={styles.label}>{statusLabels[order.status]}</Text>
          <Text style={styles.body}>
            {order.brand} · {order.weight_kg} kg × {order.quantity}
          </Text>
          <Text style={styles.body}>
            {order.exchange_empty ? 'Con canje de envase vacío' : 'Sin canje de envase vacío'}
          </Text>
          <Text style={styles.label}>Dirección de entrega</Text>
          <Text selectable style={styles.body}>
            {order.delivery_address}
          </Text>
          <Text style={styles.body}>{order.commune_name}</Text>
          <Text style={styles.label}>Notas de entrega</Text>
          <Text style={styles.body}>{order.notes || 'Sin notas adicionales.'}</Text>
          <Text style={styles.label}>{formatClp(order.total_clp)} · Efectivo contra entrega</Text>
          {order.status === 'cancelled' ? (
            <Feedback error text="El pedido fue cancelado. No realices la entrega." />
          ) : null}
          {(order.status === 'accepted' || order.status === 'on_the_way') && !query.error ? (
            <ActionButton
              label={
                advance.isPending
                  ? 'Guardando…'
                  : order.status === 'accepted'
                    ? 'Salir a entregar'
                    : 'Marcar como entregado'
              }
              disabled={advance.isPending || query.isFetching}
              onPress={progress}
            />
          ) : null}
          {order.status === 'delivered' ? <Feedback text="Pedido entregado." /> : null}
        </>
      ) : null}
      {advance.isError ? <Feedback error text={driverProgressError(advance.error)} /> : null}
      {advance.isSuccess && advance.data.status === 'on_the_way' ? (
        <Feedback text="Listo, el pedido está en camino." />
      ) : null}
      <ActionButton
        secondary
        label={query.isFetching ? 'Actualizando…' : 'Actualizar pedido'}
        disabled={query.isFetching}
        onPress={() => void query.refetch()}
      />
      <ActionButton secondary label="Volver a ofertas" onPress={() => router.replace('/driver')} />
    </Page>
  );
}
