import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
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
import { driverError, isDriverOfferCurrent } from '@/features/driver/offer-contracts';
import { DriverAvailability, driverStyles } from '@/features/driver/driver-ui';
import { useDriverLicenseSubmission } from './document-data';
import {
  DriverActiveDelivery,
  DriverHomeContext,
  DriverHomeEmpty,
  DriverOfferCard,
} from './driver-home-cards';
import { getDisplayName } from '@/shared/ui/display-name';
import { Feedback, ui } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { screenStyles } from '@/shared/ui/screen';
import { theme } from '@/theme';

export function OffersScreen() {
  const { session } = useAuth();
  const { settings, offers } = useDriverOffers();
  const workspace = useDriverWorkspace();
  const license = useDriverLicenseSubmission(workspace.isError ? undefined : workspace.data);
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
      onSuccess: () => setMessage('Oferta rechazada.'),
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
        license.refresh(),
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary, theme.colors.lime]}
            progressBackgroundColor={theme.colors.background}
          />
        }
        renderItem={({ item }) => (
          <DriverOfferCard
            offer={item}
            now={now}
            busy={busy || uncertain}
            accepting={actions.accept.isPending && actions.accept.variables === item.order_id}
            rejecting={actions.reject.isPending && actions.reject.variables === item.order_id}
            accept={accept}
            reject={reject}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={driverStyles.header}>
              <View style={ui.flex}>
                <Text variant="note" style={styles.muted}>
                  Gasway · Reparto
                </Text>
                <Text variant="title" accessibilityRole="header">
                  Hola, {name}
                </Text>
              </View>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Actualizar jornada"
                accessibilityState={{ disabled: busy || refreshing, busy: refreshing }}
                disabled={busy || refreshing}
                onPress={refresh}
                style={styles.iconButton}
              >
                {refreshing ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <Icon name="refresh" />
                )}
              </PulsePressable>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Ir a mi cuenta de conductor"
                onPress={() => router.push('/driver-account')}
                style={styles.accountButton}
              >
                <Icon name="user" color={theme.colors.text} />
              </PulsePressable>
            </View>
            {assigned.data && !assigned.isError ? (
              <DriverActiveDelivery order={assigned.data} />
            ) : null}
            <DriverAvailability
              settings={settings.data}
              workspace={workspace.data}
              licenseSubmission={license.submission}
              hasOrder={!!assigned.data}
              busy={actions.settings.isPending}
              uncertain={uncertain || actions.accept.isPending || actions.reject.isPending}
              appearance="home"
              checking={settings.isPending || workspace.isPending || assigned.isPending}
              compact={items.length > 0}
              onChange={(available) => {
                if (!settings.data) return;
                clear();
                actions.settings.mutate({
                  is_available: available,
                });
              }}
            />
            {workspace.data && !workspace.isError ? (
              <DriverHomeContext
                workspace={workspace.data}
                communes={!settings.isError ? settings.data?.communes.length : undefined}
              />
            ) : null}
            {error ? <Feedback text={driverError(error)} error /> : null}
            {message ? <Feedback text={message} /> : null}
            {!assigned.data && !uncertain && workspace.data?.can_receive_offers ? (
              <View style={styles.offersHeading}>
                <Text variant="subtitle" accessibilityRole="header" style={ui.flex}>
                  Nuevas ofertas
                </Text>
                {items.length > 0 ? (
                  <View style={styles.count}>
                    <Text variant="label">{items.length}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <>
            {error || assigned.data ? null : offers.isPending || uncertain ? (
              <Skeleton rows={2} />
            ) : workspace.data?.can_receive_offers ? (
              <DriverHomeEmpty available={settings.data?.is_available === true} />
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  headerContent: { gap: theme.spacing.md },
  muted: { color: theme.colors.primary },
  iconButton: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButton: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  count: {
    minWidth: theme.layout.brandMark,
    minHeight: theme.layout.brandMark,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.lime,
  },
});
