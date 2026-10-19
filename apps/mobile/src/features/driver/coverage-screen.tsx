import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  useAssignedOrder,
  useDriverActions,
  useDriverSettings,
  useDriverWorkspace,
} from '@/features/driver/offer-data';
import { driverError, type DriverSettings } from '@/features/driver/offer-contracts';
import { DriverAvailability, DriverBusinessCard, driverStyles } from '@/features/driver/driver-ui';
import { type Commune } from '@/shared/orders/contracts';
import { Button, Card, Feedback, Input } from '@/shared/ui/components';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';

export function CoverageScreen() {
  const { settings, communes } = useDriverSettings();
  const workspace = useDriverWorkspace();
  const assigned = useAssignedOrder();
  const { settings: save } = useDriverActions();
  const uncertain =
    settings.isPending ||
    settings.isError ||
    workspace.isPending ||
    workspace.isError ||
    assigned.isPending ||
    assigned.isError;
  const error = settings.error || communes.error || workspace.error || assigned.error || save.error;
  return (
    <Screen title="Cobertura" onBack={() => router.replace('/driver')} tabbed>
      <Text>
        La disponibilidad usa las comunas guardadas. Editar esta lista no cambia tu cobertura hasta
        que la guardes.
      </Text>
      {workspace.data && !workspace.isError ? (
        <DriverBusinessCard workspace={workspace.data} />
      ) : null}
      <DriverAvailability
        settings={settings.data}
        workspace={workspace.data}
        hasOrder={!!assigned.data}
        busy={save.isPending}
        uncertain={uncertain}
        onChange={(available) => {
          if (settings.data)
            save.mutate({ is_available: available, commune_codes: settings.data.commune_codes });
        }}
      />
      {settings.isPending || communes.isPending ? (
        <Skeleton rows={4} />
      ) : settings.data && communes.data ? (
        <CoverageFields
          initial={settings.data}
          communes={communes.data}
          disabled={uncertain || communes.isError || !!assigned.data || save.isPending}
          save={(values, onSuccess) => save.mutate(values, { onSuccess })}
        />
      ) : null}
      {assigned.data ? (
        <Feedback text="Puedes continuar tu entrega actual; cambia las comunas al terminarla." />
      ) : null}
      {error ? <Feedback text={driverError(error)} error /> : null}
      <Button
        label="Actualizar cobertura"
        variant="secondary"
        disabled={save.isPending || settings.isFetching}
        onPress={() => {
          void settings.refetch();
          void communes.refetch();
          void workspace.refetch();
          void assigned.refetch();
        }}
      />
    </Screen>
  );
}

function CoverageFields({
  initial,
  communes,
  disabled,
  save,
}: {
  initial: DriverSettings;
  communes: Commune[];
  disabled: boolean;
  save: (values: DriverSettings, onSuccess: (values: DriverSettings) => void) => void;
}) {
  const [selected, setSelected] = useState(initial.commune_codes);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const matching = communes.filter((commune) =>
    `${commune.name} ${commune.code}`
      .toLocaleLowerCase('es-CL')
      .includes(search.toLocaleLowerCase('es-CL')),
  );
  const changed = [...selected].sort().join(',') !== [...initial.commune_codes].sort().join(',');
  return (
    <View style={driverStyles.section}>
      <Text variant="subtitle" accessibilityRole="header">
        Comunas donde repartes
      </Text>
      <Input
        label="Buscar comuna o código CUT"
        value={search}
        onChangeText={setSearch}
        editable={!disabled}
      />
      <Text variant="note">
        Seleccionadas:{' '}
        {communes
          .filter((commune) => selected.includes(commune.code))
          .map((commune) => commune.name)
          .join(', ') || 'Ninguna'}
      </Text>
      {matching.slice(0, 12).map((commune) => {
        const checked = selected.includes(commune.code);
        return (
          <PulsePressable
            key={commune.code}
            accessibilityRole="checkbox"
            accessibilityLabel={`${commune.name}, ${commune.code}`}
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            onPress={() => {
              setMessage('');
              setSelected((current) =>
                checked
                  ? current.filter((code) => code !== commune.code)
                  : [...current, commune.code],
              );
            }}
          >
            <Card>
              <View style={driverStyles.header}>
                <Icon name={checked ? 'check' : 'pin'} />
                <View style={driverStyles.flex}>
                  <Text variant="label">{commune.name}</Text>
                  <Text variant="note">
                    {commune.code}
                    {checked ? ' · Seleccionada' : ''}
                  </Text>
                </View>
              </View>
            </Card>
          </PulsePressable>
        );
      })}
      <Text variant="note">
        {matching.length > 12
          ? 'Se muestran 12 resultados. Escribe para acotar la búsqueda.'
          : `${matching.length} comunas encontradas.`}
      </Text>
      {changed ? <Feedback text="Tienes cambios de cobertura sin guardar." /> : null}
      {initial.is_available && selected.length === 0 ? (
        <Feedback text="Para quitar todas las comunas, primero deja de recibir ofertas." error />
      ) : null}
      {message ? <Feedback text={message} /> : null}
      <Button
        label="Guardar comunas"
        disabled={disabled || !changed || (initial.is_available && selected.length === 0)}
        onPress={() =>
          save({ is_available: initial.is_available, commune_codes: selected }, (values) => {
            setSelected(values.commune_codes);
            setMessage('Cobertura guardada.');
          })
        }
      />
      <Button
        label="Descartar cambios"
        variant="secondary"
        disabled={disabled || !changed}
        onPress={() => {
          setSelected(initial.commune_codes);
          setMessage('');
        }}
      />
    </View>
  );
}
