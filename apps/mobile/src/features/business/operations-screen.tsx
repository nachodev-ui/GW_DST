import { useState } from 'react';
import { DriverReadinessSheet } from './driver-readiness';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Feedback, StatusBadge } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { Avatar } from '@/shared/ui/avatar';
import { businessError } from './business-contracts';
import {
  BusinessShell,
  BusinessSection,
  businessStyles as s,
  useSelectedBusiness,
  openBusiness,
} from './business-shell';
import { useBusinessCoverage } from './coverage-data';
import { coverageDriverLabels } from './coverage-contracts';
import { activateBusinessVehicle, useBusinessVehicles } from './workspace-data';
import { isVehicleReadyToActivate, type BusinessVehicle } from './workspace-contracts';
import { VehicleEditor } from './vehicle-editor';
import { FleetVehicleCard } from './fleet-vehicle-card';
import { FleetFilters, FleetHeaderActions } from './fleet-ui';
import { OperationsMetric, operationsStyles as ui } from './operations-ui';

export function BusinessOperationsScreen() {
  const business = useSelectedBusiness();
  return business ? <Operations key={business.id} business={business} /> : null;
}
function Operations({
  business,
}: {
  business: NonNullable<ReturnType<typeof useSelectedBusiness>>;
}) {
  const coverage = useBusinessCoverage(business.id);
  const vehicles = useBusinessVehicles(business.id);
  const client = useQueryClient();
  const [editing, setEditing] = useState<BusinessVehicle | 'new' | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'ready'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [readinessDriver, setReadinessDriver] = useState<{ id: string; name: string } | null>(null);
  const crew = coverage.isError ? undefined : coverage.data?.drivers;
  const fleet = vehicles.isError ? undefined : vehicles.data;
  const availableVehicles = fleet?.filter(
    (v) => v.status === 'available' && v.documents_eligible && !v.is_busy,
  );
  const readyVehicles = fleet?.filter(isVehicleReadyToActivate);
  const visibleVehicles =
    filter === 'ready' ? readyVehicles : filter === 'available' ? availableVehicles : fleet;
  const refreshFleet = () =>
    Promise.all(
      ['business-vehicles', 'business-dashboard', 'business-coverage'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const activation = useMutation({
    mutationFn: (vehicle: BusinessVehicle) => activateBusinessVehicle(business.id, vehicle),
    onSuccess: async (_result, vehicle) => {
      setNotice(`${vehicle.plate} disponible.`);
      await refreshFleet();
    },
    onError: () => refreshFleet(),
  });
  return (
    <BusinessShell
      title="Operación"
      onRefresh={() => Promise.all([coverage.refetch(), vehicles.refetch()])}
    >
      <View style={s.stack}>
        <Text variant="note" style={s.muted}>
          Disponibles
        </Text>
        <View style={ui.row}>
          <OperationsMetric
            label="Conductores"
            icon="user"
            value={crew ? String(crew.filter((d) => d.status === 'available').length) : '—'}
          />
          <OperationsMetric
            label="Vehículos"
            icon="truck"
            value={availableVehicles ? String(availableVehicles.length) : '—'}
          />
        </View>
      </View>
      <View style={s.card}>
        <ListRow
          title="Equipo"
          subtitle="Invitaciones"
          subtitleNumberOfLines={1}
          leading={<Icon name="user" />}
          onPress={() => openBusiness('/business/team', business.id)}
        />
        <ListRow
          title="Cobertura"
          subtitleNumberOfLines={1}
          subtitle={
            coverage.data ? `${coverage.data.communes.length} comunas` : 'Gestionar comunas'
          }
          leading={<Icon name="pin" />}
          onPress={() => openBusiness('/business/coverage', business.id)}
        />
        <ListRow
          title="Catálogo"
          subtitle="Precios y stock"
          subtitleNumberOfLines={1}
          showDivider={false}
          leading={<Icon name="orders" />}
          onPress={() => openBusiness('/business/catalog', business.id)}
        />
      </View>
      <BusinessSection
        title="Conductores"
        action={
          <Button
            label="Ver equipo"
            variant="link"
            style={ui.link}
            onPress={() => openBusiness('/business/team', business.id)}
          />
        }
      >
        <View style={s.card}>
          {coverage.isPending ? (
            <Feedback text="Cargando conductores…" />
          ) : coverage.isError ? (
            <>
              <Feedback error text="No pudimos cargar el estado de los conductores." />
              <Button
                label="Reintentar equipo"
                variant="secondary"
                onPress={() => void coverage.refetch()}
              />
            </>
          ) : !crew?.length ? (
            <Text variant="note" style={s.muted}>
              Aún no tienes conductores vinculados. Incorpóralos desde Equipo.
            </Text>
          ) : (
            crew.map((driver, index) => (
              <View key={driver.id} style={[ui.driver, index > 0 && ui.driverDivider]}>
                <View style={ui.row}>
                  <Avatar name={driver.name} />
                  <View style={ui.driverCopy}>
                    <Text variant="label" numberOfLines={1}>
                      {driver.name}
                    </Text>
                    <StatusBadge
                      compact
                      label={coverageDriverLabels[driver.status]}
                      tone={
                        driver.status === 'available'
                          ? 'success'
                          : driver.status === 'not_enabled'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </View>
                </View>
                {driver.status === 'not_enabled' ? (
                  <Button
                    label="Ver qué falta"
                    variant="link"
                    style={ui.link}
                    accessibilityLabel={`Ver qué falta para habilitar a ${driver.name}`}
                    onPress={() => setReadinessDriver({ id: driver.id, name: driver.name })}
                  />
                ) : null}
              </View>
            ))
          )}
        </View>
      </BusinessSection>
      <BusinessSection
        title="Flota"
        action={
          <FleetHeaderActions
            disabled={!business.is_verified || !crew || activation.isPending}
            onAdd={() => {
              setNotice(null);
              activation.reset();
              setEditing('new');
            }}
          />
        }
      >
        <FleetFilters
          value={filter}
          onChange={setFilter}
          total={fleet?.length}
          ready={readyVehicles?.length}
          available={availableVehicles?.length}
        />
        {notice ? <Feedback text={notice} /> : null}
        {activation.isError ? (
          <Feedback
            error
            text={`${activation.variables.plate}: ${businessError(activation.error)}`}
          />
        ) : null}
        {vehicles.isPending ? (
          <Feedback text="Cargando vehículos…" />
        ) : vehicles.isError ? (
          <>
            <Feedback error text="No pudimos cargar la flota." />
            <Button
              label="Reintentar flota"
              variant="secondary"
              onPress={() => void vehicles.refetch()}
            />
          </>
        ) : null}
        {fleet && !visibleVehicles?.length ? (
          <View style={s.card}>
            <Icon name="truck" />
            <Text variant="label">
              {filter === 'ready' && fleet.length
                ? 'Sin vehículos por activar'
                : filter === 'available' && fleet.length
                  ? 'Sin vehículos disponibles'
                  : 'Registra tu primer vehículo'}
            </Text>
            <Text variant="note" style={s.muted}>
              Organiza patentes, conductores y mantenciones desde este espacio.
            </Text>
          </View>
        ) : null}
        {visibleVehicles?.map((vehicle) => (
          <FleetVehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            businessId={business.id}
            driverName={crew?.find((driver) => driver.id === vehicle.driver_id)?.name}
            canEdit={business.is_verified && !!crew}
            activating={activation.isPending && activation.variables.id === vehicle.id}
            activationPending={activation.isPending}
            onActivate={() => {
              setNotice(null);
              activation.mutate(vehicle);
            }}
            onEdit={() => {
              setNotice(null);
              activation.reset();
              setEditing(vehicle);
            }}
          />
        ))}
      </BusinessSection>
      {editing && crew ? (
        <VehicleEditor
          key={editing === 'new' ? 'new' : editing.id}
          businessId={business.id}
          vehicle={editing === 'new' ? null : editing}
          drivers={crew}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            setNotice('Vehículo guardado.');
          }}
        />
      ) : null}
      {readinessDriver ? (
        <DriverReadinessSheet
          businessId={business.id}
          driver={readinessDriver}
          onClose={() => setReadinessDriver(null)}
        />
      ) : null}
    </BusinessShell>
  );
}
