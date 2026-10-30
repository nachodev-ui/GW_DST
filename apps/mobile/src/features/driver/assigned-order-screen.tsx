import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { useAssignedOrder, useDriverActions } from '@/features/driver/offer-data';
import { driverError } from '@/features/driver/offer-contracts';
import { DeliverySummary } from './delivery-summary';
import { DeliveryActionNotice, useDeliveryActionAnnouncement } from './delivery-action-notice';
import { useDeliveryProgress } from './use-delivery-progress';
import { statusLabels, formatClp, productLabel } from '@/shared/orders/contracts';
import { Button, Feedback, RefreshButton, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { ProductImage } from '@/shared/ui/product-image';
import { Screen } from '@/shared/ui/screen';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { DriverTrackingCard } from '@/features/tracking/driver/driver-tracking-card';
import { theme } from '@/theme';

export function AssignedOrderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const validId = z.uuid().safeParse(id).success;
  const { session } = useAuth();
  const client = useQueryClient();
  const query = useAssignedOrder(id);
  const { advance } = useDriverActions();
  const progressAction = useDeliveryProgress(session?.user.id, id, advance.mutate);
  const [confirming, setConfirming] = useState<string | null>(null);
  const order = query.data;
  const busy = advance.isPending || query.isPending || progressAction.pending;
  const active = order?.status === 'accepted' || order?.status === 'on_the_way';
  const actionFeedback = progressAction.feedback;
  const notice =
    actionFeedback &&
    actionFeedback.state !== 'pending' &&
    (actionFeedback.state === 'error' || order?.status === actionFeedback.target)
      ? actionFeedback
      : null;
  const failedAction = notice?.state === 'error';
  const footerNotice = notice?.state === 'success' && notice.target === 'delivered' ? null : notice;
  useDeliveryActionAnnouncement(notice);
  const refresh = async () => {
    if (!validId || busy) return;
    const [result] = await Promise.all([
      query.refetch({ cancelRefetch: false }),
      client.invalidateQueries({
        queryKey: ['order-tracking', session?.user.id, id],
        exact: true,
        refetchType: 'active',
      }),
      client.invalidateQueries({
        queryKey: ['order-route', session?.user.id, id],
        refetchType: 'active',
      }),
    ]);
    if (!result.isError && progressAction.feedback?.state === 'error') progressAction.clear();
  };
  const progress = () => {
    if (!order || busy || query.isError || failedAction) return;
    if (order.status === 'accepted') progressAction.submit('on_the_way');
    else if (order.status === 'on_the_way' && confirming !== order.order_id)
      setConfirming(order.order_id);
    else if (order.status === 'on_the_way') {
      setConfirming(null);
      progressAction.submit('delivered');
    }
  };
  return (
    <Screen
      title="Tu entrega"
      compactHeader
      onBack={() => router.replace('/driver')}
      onRefresh={refresh}
      footer={
        (order && !query.isError) || notice || progressAction.pending ? (
          <View style={styles.footer}>
            {footerNotice ? (
              <DeliveryActionNotice
                key={footerNotice.key}
                feedback={footerNotice}
                onDismiss={progressAction.clear}
              />
            ) : null}
            {failedAction ? (
              <RefreshButton label="Revisar pedido" disabled={busy} onRefresh={refresh} />
            ) : (active && !query.isError) || progressAction.pending ? (
              <Button
                label={
                  busy
                    ? actionFeedback?.target === 'delivered'
                      ? 'Confirmando entrega…'
                      : 'Iniciando entrega…'
                    : order?.status === 'accepted'
                      ? 'Iniciar entrega'
                      : 'Marcar como entregado'
                }
                disabled={busy}
                loading={advance.isPending || progressAction.pending}
                onPress={progress}
              />
            ) : (
              <Button label="Volver a ofertas" onPress={() => router.replace('/driver')} />
            )}
          </View>
        ) : undefined
      }
    >
      {!validId ? (
        <Feedback
          text="El identificador del pedido no es válido. Vuelve a tus ofertas para abrir tu entrega."
          error
        />
      ) : query.isPending ? (
        <Skeleton rows={4} />
      ) : query.isError ? (
        <View style={styles.stack}>
          <Feedback text={driverError(query.error)} error />
          <RefreshButton label="Reintentar" onRefresh={refresh} />
        </View>
      ) : !order ? (
        <Feedback text="Este pedido no está asignado a tu cuenta o tu acceso cambió." />
      ) : (
        <>
          <View style={styles.destination}>
            <View style={styles.heading}>
              <View style={styles.row}>
                <Icon name="pin" size={theme.spacing.screen} />
                <Text variant="label" style={styles.muted}>
                  {order.status === 'delivered' ? 'Destino de entrega' : 'Tu destino'}
                </Text>
              </View>
              {order.status !== 'delivered' ? (
                <StatusBadge
                  label={statusLabels[order.status]}
                  icon={order.status === 'cancelled' ? 'close' : 'truck'}
                  tone={order.status === 'cancelled' ? 'error' : 'primary'}
                />
              ) : null}
            </View>
            <Text variant="title" selectable>
              {order.delivery_address}
            </Text>
            <Text style={styles.muted}>{order.commune_name}</Text>
          </View>
          <DriverTrackingCard orderId={order.order_id} active={active} />
          <DeliverySummary order={order} />
          {order.status === 'cancelled' ? (
            <Feedback text="El pedido fue cancelado. No realices la entrega." error />
          ) : null}
          <BottomSheet
            visible={
              confirming === order.order_id && order.status === 'on_the_way' && !failedAction
            }
            title="¿Entregaste el pedido?"
            onClose={() => setConfirming(null)}
            dismissible={!busy}
          >
            <ScrollView contentContainerStyle={styles.confirmation}>
              <View style={styles.confirmationProduct}>
                <ProductImage product={order} size="medium" />
                <View style={[styles.flex, styles.stack]}>
                  <Text variant="label">{order.brand}</Text>
                  <Text variant="title">{productLabel(order)}</Text>
                  <Text variant="label">
                    {order.quantity} {order.quantity === 1 ? 'cilindro' : 'cilindros'}
                  </Text>
                </View>
              </View>
              <View style={styles.receipt}>
                <Icon name="cash" />
                <View style={styles.flex}>
                  <Text variant="label">Total a cobrar</Text>
                  <Text variant="note" style={styles.muted}>
                    En efectivo
                  </Text>
                </View>
                <Text variant="title" style={styles.amount}>
                  {formatClp(order.total_clp)}
                </Text>
              </View>
              <View style={styles.confirmationExchange}>
                <Icon name={order.exchange_empty ? 'exchange' : 'check'} />
                <View style={styles.flex}>
                  <Text variant="label">
                    {order.exchange_empty ? 'Con canje de cilindro vacío' : 'Sin canje'}
                  </Text>
                  {order.exchange_empty ? (
                    <Text variant="note" style={styles.muted}>
                      Marca a retirar:{' '}
                      {order.returned_brand && order.returned_brand !== 'unknown'
                        ? order.returned_brand
                        : 'por confirmar'}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text variant="note" style={styles.muted}>
                Al confirmar, cierras el pedido y su seguimiento.
              </Text>
              <Button
                label={busy ? 'Confirmando entrega…' : 'Sí, pedido entregado'}
                disabled={busy}
                loading={advance.isPending || progressAction.pending}
                onPress={progress}
              />
              <Button
                label="Seguir en camino"
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirming(null)}
              />
            </ScrollView>
          </BottomSheet>
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: theme.spacing.none },
  stack: { gap: theme.spacing.md },
  destination: { gap: theme.spacing.xs },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  muted: { color: theme.colors.textMuted },
  footer: { gap: theme.spacing.sm },
  confirmation: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  confirmationProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.warm,
  },
  confirmationExchange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  amount: { color: theme.colors.primary, fontVariant: ['tabular-nums'] },
  receipt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
  },
});
