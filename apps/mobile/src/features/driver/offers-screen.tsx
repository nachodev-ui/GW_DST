import { memo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignOutButton } from '@/features/auth/zone-screen';
import { useAssignedOrder, useDriverActions, useDriverOffers } from '@/features/driver/offer-data';
import {
  driverError,
  type DriverOffer,
  type DriverSettings,
} from '@/features/driver/offer-contracts';
import { formatClp, type Commune } from '@/shared/orders/contracts';
import { ActionButton, Feedback, styles } from '@/shared/ui/page';
import { theme } from '@/theme/legacy';

function Coverage({
  initial,
  communes,
  disabled,
  saving,
  save,
}: {
  initial: DriverSettings;
  communes: Commune[];
  disabled: boolean;
  saving: boolean;
  save: (settings: DriverSettings) => void;
}) {
  const [selected, setSelected] = useState(initial.commune_codes);
  const [search, setSearch] = useState('');
  const matching = communes.filter((commune) =>
    `${commune.name} ${commune.code}`
      .toLocaleLowerCase('es-CL')
      .includes(search.toLocaleLowerCase('es-CL')),
  );
  return (
    <View style={driverStyles.section}>
      <Text style={styles.label}>
        Disponibilidad: {initial.is_available ? 'Disponible' : 'No disponible'}
      </Text>
      <Switch
        accessibilityLabel="Disponible para recibir ofertas"
        value={initial.is_available}
        disabled={disabled || saving || (!initial.is_available && selected.length === 0)}
        onValueChange={(value) => save({ is_available: value, commune_codes: selected })}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
      <Text style={styles.label}>Comunas que atiendes</Text>
      <Text style={styles.body}>
        Busca y selecciona tus comunas. Guarda los cambios para aplicarlos.
      </Text>
      <TextInput
        accessibilityLabel="Buscar comuna por nombre o código CUT"
        placeholder="Buscar comuna o código CUT"
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <Text style={styles.body}>
        Seleccionadas:{' '}
        {communes
          .filter((c) => selected.includes(c.code))
          .map((c) => c.name)
          .join(', ') || 'Ninguna'}
      </Text>
      {matching.slice(0, 12).map((commune) => {
        const checked = selected.includes(commune.code);
        return (
          <Pressable
            key={commune.code}
            accessibilityRole="checkbox"
            accessibilityLabel={`${commune.name}, ${commune.code}`}
            accessibilityState={{ checked, disabled: saving }}
            disabled={saving}
            onPress={() =>
              setSelected((current) =>
                checked
                  ? current.filter((code) => code !== commune.code)
                  : [...current, commune.code],
              )
            }
            style={({ pressed }) => [
              driverStyles.choice,
              checked && driverStyles.selected,
              pressed && styles.dimmed,
            ]}
          >
            <Text style={styles.label}>
              {checked ? 'Seleccionada: ' : ''}
              {commune.name} ({commune.code})
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.body}>
        {matching.length > 12
          ? 'Se muestran 12 resultados. Escribe para acotar la búsqueda.'
          : `${matching.length} comunas encontradas.`}
      </Text>
      <ActionButton
        label={saving ? 'Guardando…' : 'Guardar comunas'}
        disabled={saving || (initial.is_available && selected.length === 0)}
        onPress={() => save({ is_available: initial.is_available, commune_codes: selected })}
      />
    </View>
  );
}

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
    <View style={driverStyles.section}>
      <Text accessibilityRole="header" style={styles.label}>
        {offer.brand} · {offer.weight_kg} kg × {offer.quantity}
      </Text>
      <Text style={styles.body}>
        {offer.commune_name} ·{' '}
        {offer.exchange_empty ? 'Con canje de envase' : 'Sin canje de envase'}
      </Text>
      <Text style={styles.label}>{formatClp(offer.total_clp)} · Efectivo contra entrega</Text>
      <Text style={styles.body}>
        Vence a las {new Date(offer.expires_at).toLocaleTimeString('es-CL')}
      </Text>
      <ActionButton label="Aceptar pedido" disabled={busy} onPress={() => accept(offer.order_id)} />
      <ActionButton
        secondary
        label="Rechazar oferta"
        disabled={busy}
        onPress={() => reject(offer.order_id)}
      />
    </View>
  );
});

export function OffersScreen() {
  const { settings, communes, offers } = useDriverOffers();
  const assigned = useAssignedOrder();
  const actions = useDriverActions();
  const [message, setMessage] = useState('');
  const busy = actions.accept.isPending || actions.reject.isPending || actions.settings.isPending;
  const clearResult = () => {
    setMessage('');
    actions.accept.reset();
    actions.reject.reset();
    actions.settings.reset();
  };
  const accept = (id: string) => {
    clearResult();
    actions.accept.mutate(id, {
      onSuccess: (order) =>
        router.push({ pathname: '/driver-order/[id]', params: { id: order.order_id } }),
    });
  };
  const reject = (id: string) => {
    clearResult();
    actions.reject.mutate(id, {
      onSuccess: () =>
        setMessage('Oferta rechazada. El pedido sigue disponible para otros repartidores.'),
    });
  };
  const error =
    actions.accept.error ||
    actions.reject.error ||
    actions.settings.error ||
    settings.error ||
    communes.error ||
    offers.error ||
    assigned.error;
  const refresh = () => {
    void settings.refetch();
    void communes.refetch();
    void offers.refetch();
    void assigned.refetch();
  };
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={offers.data ?? []}
        keyExtractor={(offer) => offer.order_id}
        contentContainerStyle={driverStyles.list}
        refreshing={offers.isRefetching}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <OfferCard offer={item} busy={busy || !!assigned.data} accept={accept} reject={reject} />
        )}
        ListHeaderComponent={
          <View style={driverStyles.section}>
            <Text accessibilityRole="header" style={styles.title}>
              Ofertas para repartir
            </Text>
            <Text style={styles.body}>
              Recibes ofertas nuevas de tus comunas mientras estás disponible. Se actualizan cada 5
              segundos en esta pantalla.
            </Text>
            {assigned.data ? (
              <ActionButton
                label="Ver mi pedido asignado"
                onPress={() =>
                  router.push({
                    pathname: '/driver-order/[id]',
                    params: { id: assigned.data!.order_id },
                  })
                }
              />
            ) : null}
            {settings.data && communes.data ? (
              <Coverage
                key={JSON.stringify(settings.data)}
                initial={settings.data}
                communes={communes.data}
                disabled={busy || !!assigned.data}
                saving={busy}
                save={(values) => {
                  clearResult();
                  actions.settings.mutate(values, {
                    onSuccess: () => setMessage('Disponibilidad y comunas guardadas.'),
                  });
                }}
              />
            ) : (
              <Feedback text="Cargando disponibilidad y comunas…" />
            )}
            {busy ? <Feedback text="Confirmando operación…" /> : null}
            {message ? <Feedback text={message} /> : null}
            {error ? <Feedback text={driverError(error)} error /> : null}
            <ActionButton
              secondary
              label="Actualizar ofertas y pedido asignado"
              disabled={busy}
              onPress={refresh}
            />
            <SignOutButton />
            <Text accessibilityRole="header" style={styles.label}>
              Ofertas vigentes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Feedback
            text={
              offers.isPending
                ? 'Buscando ofertas…'
                : 'No tienes ofertas vigentes. Revisa tu disponibilidad y comunas.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const driverStyles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
  },
  section: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  choice: {
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selected: { borderColor: theme.colors.primary, borderWidth: theme.borders.accent },
});
