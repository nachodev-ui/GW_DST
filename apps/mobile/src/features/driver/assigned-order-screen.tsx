import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useAssignedOrder, useDriverActions } from '@/features/driver/offer-data';
import { driverError, driverProgressError } from '@/features/driver/offer-contracts';
import { productLabel, formatClp, statusLabels } from '@/shared/orders/contracts';
import { Button, Card, Feedback, Section, StatusBadge } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';

export function AssignedOrderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const validId = z.uuid().safeParse(id).success;
  const query = useAssignedOrder(id);
  const { advance } = useDriverActions();
  const [confirming, setConfirming] = useState(false);
  const order = query.data;
  const busy = advance.isPending || query.isFetching;
  const progress = () => {
    if (!order || busy || query.isError) return;
    if (order.status === 'accepted') advance.mutate({ id: order.order_id, status: 'on_the_way' });
    else if (order.status === 'on_the_way' && !confirming) setConfirming(true);
    else if (order.status === 'on_the_way') {
      setConfirming(false);
      advance.mutate({ id: order.order_id, status: 'delivered' });
    }
  };
  return (
    <Screen title="Tu entrega" onBack={() => router.replace('/driver')}>
      {!validId ? (
        <Feedback
          text="El identificador del pedido no es válido. Vuelve a tus ofertas para abrir tu entrega."
          error
        />
      ) : (
        <>
          {query.isPending ? (
            <Skeleton rows={4} />
          ) : query.isError ? (
            <Feedback text={driverError(query.error)} error />
          ) : !order ? (
            <Feedback text="Este pedido no está asignado a tu cuenta o tu acceso cambió." />
          ) : (
            <>
              <StatusBadge
                label={statusLabels[order.status]}
                icon={
                  order.status === 'delivered'
                    ? 'check'
                    : order.status === 'cancelled'
                      ? 'close'
                      : 'truck'
                }
                tone={
                  order.status === 'delivered'
                    ? 'success'
                    : order.status === 'cancelled'
                      ? 'error'
                      : 'primary'
                }
              />
              <Card>
                <Text variant="title">
                  {order.brand} {productLabel(order)}
                </Text>
                <Text>
                  {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'}
                </Text>
                <Text>
                  {order.exchange_empty
                    ? 'Cliente entrega envase vacío'
                    : 'Cliente necesita envase'}
                </Text>
                {order.exchange_empty && order.returned_brand ? (
                  <Text>
                    Envase devuelto:{' '}
                    {order.returned_brand === 'unknown'
                      ? 'marca por confirmar'
                      : order.returned_brand}
                    . Revisar tipo, válvula y condición.
                  </Text>
                ) : null}
              </Card>
              <Section title="Dirección de entrega">
                <Text selectable>{order.delivery_address}</Text>
                <Text>{order.commune_name}</Text>
              </Section>
              <Section title="Indicaciones del cliente">
                <Text selectable>{order.notes || 'Sin indicaciones adicionales.'}</Text>
              </Section>
              <Card>
                <Text variant="label">Total a cobrar</Text>
                <Text variant="title">{formatClp(order.total_clp)}</Text>
                <Text>Efectivo contra entrega</Text>
              </Card>
              {order.status === 'cancelled' ? (
                <Feedback text="El pedido fue cancelado. No realices la entrega." error />
              ) : null}
              {order.status === 'accepted' || order.status === 'on_the_way' ? (
                <>
                  {order.status === 'on_the_way' && confirming ? (
                    <Card>
                      <Text variant="subtitle">Confirmar entrega al cliente</Text>
                      <Text>
                        Confirma solo cuando hayas entregado el pedido. Esta acción cierra la
                        entrega.
                      </Text>
                      <Button label="Sí, pedido entregado" disabled={busy} onPress={progress} />
                      <Button
                        label="Seguir en camino"
                        variant="secondary"
                        disabled={busy}
                        onPress={() => setConfirming(false)}
                      />
                    </Card>
                  ) : (
                    <Button
                      label={
                        advance.isPending
                          ? 'Guardando…'
                          : order.status === 'accepted'
                            ? 'Salir a entregar'
                            : 'Marcar como entregado'
                      }
                      disabled={busy}
                      onPress={progress}
                    />
                  )}
                </>
              ) : null}
              {order.status === 'delivered' ? (
                <Feedback text="Entrega finalizada. Vuelve a Ofertas y activa tu disponibilidad cuando estés listo para continuar." />
              ) : null}
            </>
          )}
          {advance.isError ? <Feedback text={driverProgressError(advance.error)} error /> : null}
          <Button
            label={query.isFetching ? 'Actualizando…' : 'Actualizar entrega'}
            variant="secondary"
            disabled={query.isFetching || advance.isPending}
            onPress={() => void query.refetch()}
          />
        </>
      )}
      <Button
        label="Volver a ofertas"
        variant="secondary"
        onPress={() => router.replace('/driver')}
      />
    </Screen>
  );
}
