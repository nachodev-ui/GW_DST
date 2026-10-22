import { memo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import {
  useAssignedOrder,
  useDriverActions,
  useDriverClock,
  useDriverOffers,
  useDriverWorkspace,
} from '@/features/driver/offer-data';
import {
  driverError,
  isDriverOfferCurrent,
  type DriverOffer,
} from '@/features/driver/offer-contracts';
import {
  CurrentDeliveryCard,
  DriverAvailability,
  DriverBusinessCard,
  driverStyles,
} from '@/features/driver/driver-ui';
import { productLabel, formatClp } from '@/shared/orders/contracts';
import { Avatar } from '@/shared/ui/avatar';
import { getDisplayName } from '@/shared/ui/display-name';
import { Button, Card, Feedback, ui } from '@/shared/ui/components';
import { CylinderIllustration } from '@/shared/ui/cylinder-illustration';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { screenStyles } from '@/shared/ui/screen';

const OfferCard = memo(function OfferCard({
  offer,
  busy,
  accept,
  reject,
}: {
  offer: DriverOffer;
  busy: boolean;
  accept: (id: string) => void;
  reject: (id: string) => void;
}) {
  return (
    <Card>
      <View style={driverStyles.header}>
        <CylinderIllustration weight={offer.weight_kg} size="small" />
        <View style={driverStyles.flex}>
          <Text variant="subtitle">
            {offer.brand} {productLabel(offer)}
          </Text>
          <Text>
            {offer.quantity} {offer.quantity === 1 ? 'cilindro' : 'cilindros'}
          </Text>
        </View>
      </View>
      <Text variant="label">{offer.commune_name}</Text>
      <Text>
        {offer.exchange_empty ? 'Cliente entrega envase vacío' : 'Cliente necesita envase'}
      </Text>
      {offer.exchange_empty && offer.returned_brand ? (
        <Text>
          Envase devuelto:{' '}
          {offer.returned_brand === 'unknown' ? 'marca por confirmar' : offer.returned_brand}
        </Text>
      ) : null}
      <Text variant="title">{formatClp(offer.total_clp)}</Text>
      <Text variant="note">Cobro en efectivo contra entrega</Text>
      <Text variant="note">
        Vence a las {new Date(offer.expires_at).toLocaleTimeString('es-CL')}
      </Text>
      <Button label="Aceptar pedido" disabled={busy} onPress={() => accept(offer.order_id)} />
      <Button
        label="Rechazar oferta"
        variant="secondary"
        disabled={busy}
        onPress={() => reject(offer.order_id)}
      />
    </Card>
  );
});

export function OffersScreen() {
  const { session } = useAuth();
  const { settings, offers } = useDriverOffers();
  const workspace = useDriverWorkspace();
  const assigned = useAssignedOrder();
  const now = useDriverClock();
  const actions = useDriverActions();
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const name = getDisplayName(session?.user.user_metadata, session?.user.email);
  const busy = actions.accept.isPending || actions.reject.isPending || actions.settings.isPending;
  const uncertain =
    settings.isPending ||
    settings.isError ||
    workspace.isPending ||
    workspace.isError ||
    assigned.isPending ||
    assigned.isError;
  const clear = () => {
    setMessage('');
    actions.accept.reset();
    actions.reject.reset();
    actions.settings.reset();
  };
  const accept = (id: string) => {
    clear();
    const offer = offers.data?.find((item) => item.order_id === id);
    if (!offer || !isDriverOfferCurrent(offer, Date.now())) {
      setMessage('La oferta venció. Actualiza para revisar las ofertas vigentes.');
      return;
    }
    if (
      uncertain ||
      assigned.data ||
      !workspace.data?.can_receive_offers ||
      !settings.data?.is_available
    )
      return;
    actions.accept.mutate(id, {
      onSuccess: (order) =>
        router.push({ pathname: '/driver-order/[id]', params: { id: order.order_id } }),
    });
  };
  const reject = (id: string) => {
    clear();
    actions.reject.mutate(id, {
      onSuccess: () => setMessage('Oferta rechazada. El pedido puede asignarse a otro conductor.'),
    });
  };
  const refresh = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        settings.refetch(),
        workspace.refetch(),
        offers.refetch(),
        assigned.refetch(),
      ]);
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  };
  const error =
    actions.accept.error ||
    actions.reject.error ||
    actions.settings.error ||
    settings.error ||
    workspace.error ||
    offers.error ||
    assigned.error;
  const items =
    !uncertain &&
    !offers.isError &&
    !assigned.data &&
    workspace.data?.can_receive_offers &&
    settings.data?.is_available
      ? (offers.data ?? []).filter((item) => isDriverOfferCurrent(item, now))
      : [];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <FlatList
        data={items}
        keyExtractor={(offer) => offer.order_id}
        contentContainerStyle={driverStyles.list}
        refreshing={refreshing}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <OfferCard offer={item} busy={busy || uncertain} accept={accept} reject={reject} />
        )}
        ListHeaderComponent={
          <View style={driverStyles.section}>
            <View style={driverStyles.header}>
              <View style={ui.flex}>
                <Text variant="note">Tu jornada de reparto</Text>
                <Text variant="display" accessibilityRole="header">
                  Hola, {name}
                </Text>
              </View>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Ir a mi cuenta de conductor"
                onPress={() => router.push('/driver-account')}
              >
                <Avatar name={name} />
              </PulsePressable>
            </View>
            {workspace.isPending ? (
              <Skeleton rows={2} />
            ) : workspace.data && !workspace.isError ? (
              <DriverBusinessCard workspace={workspace.data} />
            ) : null}
            {assigned.data && !assigned.isError ? (
              <CurrentDeliveryCard id={assigned.data.order_id} />
            ) : null}
            <DriverAvailability
              settings={settings.data}
              workspace={workspace.data}
              hasOrder={!!assigned.data}
              busy={actions.settings.isPending}
              uncertain={uncertain || busy}
              onChange={(available) => {
                if (!settings.data) return;
                clear();
                actions.settings.mutate({
                  is_available: available,
                });
              }}
            />
            {error ? <Feedback text={driverError(error)} error /> : null}
            {message ? <Feedback text={message} /> : null}
            <Button
              label="Actualizar jornada"
              variant="secondary"
              onPress={refresh}
              disabled={busy || refreshing}
            />
            <Text variant="subtitle" accessibilityRole="header">
              Ofertas vigentes
            </Text>
            <Text variant="note">
              Se consultan mientras esta pantalla está activa. La dirección se entrega únicamente al
              conductor asignado.
            </Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Feedback text="No podemos confirmar las ofertas. Actualiza tu jornada para reintentar." />
          ) : offers.isPending || uncertain ? (
            <Feedback text="Comprobando tu jornada y ofertas…" />
          ) : (
            <Feedback
              text={
                assigned.data
                  ? 'Ya tienes una entrega en curso.'
                  : !workspace.data?.can_receive_offers
                    ? 'Regulariza tu habilitación y tu negocio para recibir pedidos.'
                    : !settings.data?.is_available
                      ? 'Estás fuera de disponibilidad. Puedes activarte cuando estés listo.'
                      : 'No hay ofertas vigentes en las comunas de tu distribuidora.'
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}
