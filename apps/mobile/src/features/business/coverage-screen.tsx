import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMyBusinesses } from './business-data';
import type { Business } from './business-contracts';
import { useBusinessCoverage } from './coverage-data';
import { CoverageEditor } from './coverage-editor';
import {
  communeCoverageState,
  coverageDriverLabels,
  groupCoverage,
  type BusinessCoverage,
  type CoverageCommune,
  type CoverageDriver,
} from './coverage-contracts';
import { WorkspaceHero, WorkspaceMetric, workspaceStyles } from './workspace-ui';
import { Button, Card, Feedback, Input, OptionCard, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { SegmentedTabs } from '@/shared/ui/segmented-tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

type Selection = { kind: 'commune' | 'driver'; id: string } | { kind: 'help' } | null;
type Row = { kind: 'commune'; value: CoverageCommune } | { kind: 'driver'; value: CoverageDriver };
const matches = (value: string, search: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .includes(search);

export function BusinessCoverageScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const businesses = useMyBusinesses();
  const business = businesses.data?.find((item) => item.id === businessId);
  if (!business)
    return (
      <Screen title="Cobertura" compactHeader onBack={() => router.replace('/business/manage')}>
        <EmptyState title="Negocio no disponible" description="Vuelve a seleccionar tu negocio." />
      </Screen>
    );
  return <CoverageWorkspace key={business.id} business={business} />;
}

function CoverageWorkspace({ business }: { business: Business }) {
  const coverage = useBusinessCoverage(business.id);
  const [tab, setTab] = useState<'communes' | 'drivers'>('communes');
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [editing, setEditing] = useState<BusinessCoverage | null>(null);
  const data = coverage.data;
  const communes = data ? groupCoverage(data) : [];
  const active = data
    ? communes.filter((commune) => communeCoverageState(data, commune).available > 0)
    : [];
  const covered = communes;
  const query = search
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
  const rows: Row[] =
    tab === 'communes'
      ? (filter === 'available' ? active : communes)
          .filter((commune) => matches(`${commune.name} ${commune.code}`, query))
          .map((value) => ({ kind: 'commune', value }))
      : (data?.drivers ?? [])
          .filter((driver) => matches(driver.name, query))
          .map((value) => ({ kind: 'driver', value }));
  const commune =
    selection?.kind === 'commune'
      ? communes.find((entry) => entry.code === selection.id)
      : undefined;
  const driver =
    selection?.kind === 'driver'
      ? data?.drivers.find((entry) => entry.id === selection.id)
      : undefined;
  const openTeam = () => {
    setSelection(null);
    router.push({ pathname: '/business/team', params: { businessId: business.id } });
  };
  const header = (
    <View style={styles.header}>
      <WorkspaceHero
        eyebrow="COBERTURA DE REPARTO"
        title="Dónde llegamos"
        description={business.name}
      >
        <Text variant="note" style={workspaceStyles.heroDescription}>
          Tu distribuidora define dónde repartir.
        </Text>
      </WorkspaceHero>
      {data ? (
        <>
          <Button
            label={communes.length ? 'Editar comunas' : 'Elegir comunas'}
            onPress={() => setEditing(data)}
            disabled={coverage.isError}
          />
          <View style={workspaceStyles.metrics}>
            <WorkspaceMetric
              value={String(covered.length)}
              label="Comunas de reparto"
              icon="pin"
              onPress={() => {
                setTab('communes');
                setFilter('all');
                setSearch('');
              }}
            />
            <WorkspaceMetric
              value={String(active.length)}
              label="Con reparto ahora"
              icon="truck"
              onPress={() => {
                setTab('communes');
                setFilter('available');
                setSearch('');
              }}
            />
          </View>
          {!data.business_enabled ? (
            <Feedback text="Falta habilitar el negocio o sus marcas." error />
          ) : !data.is_open ? (
            <Feedback text="Fuera de horario. Tu cobertura se conserva." />
          ) : null}
          {coverage.isError ? (
            <Feedback error text="No pudimos actualizar. Mostramos la última consulta." />
          ) : null}
          {data.drivers.length > 0 || communes.length > 0 ? (
            <>
              <SegmentedTabs
                value={tab}
                onChange={(value) => {
                  setTab(value);
                  setSearch('');
                }}
                label="Ver cobertura por"
                options={[
                  { value: 'communes', label: 'Comunas', count: communes.length },
                  { value: 'drivers', label: 'Conductores', count: data.drivers.length },
                ]}
              />
              {tab === 'communes' && communes.length > 0 ? (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Disponibilidad de reparto"
                  style={styles.filters}
                >
                  <OptionCard
                    label="Todas"
                    selected={filter === 'all'}
                    onPress={() => setFilter('all')}
                  />
                  <OptionCard
                    label="Con reparto ahora"
                    selected={filter === 'available'}
                    onPress={() => setFilter('available')}
                  />
                </View>
              ) : null}
              <Input
                label={tab === 'communes' ? 'Buscar comuna' : 'Buscar conductor'}
                value={search}
                onChangeText={setSearch}
              />
            </>
          ) : null}
        </>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Cómo sumar comunas"
          variant="link"
          onPress={() => setSelection({ kind: 'help' })}
        />
        <Button
          label={coverage.isFetching ? 'Actualizando…' : 'Actualizar'}
          variant="link"
          disabled={coverage.isFetching}
          onPress={() => void coverage.refetch()}
        />
      </View>
    </View>
  );
  return (
    <>
      <Screen
        title="Cobertura"
        compactHeader
        onBack={() =>
          router.replace({ pathname: '/business/manage', params: { businessId: business.id } })
        }
        list={
          <FlatList<Row>
            data={rows}
            contentContainerStyle={[screenStyles.content, styles.list]}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) =>
              item.kind === 'commune' ? `commune:${item.value.code}` : `driver:${item.value.id}`
            }
            ListHeaderComponent={header}
            ListEmptyComponent={
              !data ? (
                coverage.isError ? (
                  <EmptyState
                    title="No pudimos cargar la cobertura"
                    description="Intenta actualizar nuevamente."
                    action={{ label: 'Reintentar', onPress: () => void coverage.refetch() }}
                  />
                ) : (
                  <Skeleton rows={3} />
                )
              ) : (
                <EmptyState
                  icon="pin"
                  title={
                    search
                      ? 'Sin coincidencias'
                      : tab === 'drivers' && !data.drivers.length
                        ? 'Aún no hay conductores'
                        : tab === 'communes' && filter === 'available'
                          ? 'Sin reparto disponible ahora'
                          : 'Aún no hay comunas'
                  }
                  description={
                    search
                      ? 'Prueba otro nombre.'
                      : tab === 'drivers' && !data.drivers.length
                        ? 'Invita y habilita a tu equipo para comenzar a repartir.'
                        : tab === 'communes' && filter === 'available'
                          ? 'Revisa el horario y la disponibilidad de tu equipo.'
                          : 'Elige las comunas donde tu distribuidora hará entregas.'
                  }
                  action={
                    search
                      ? { label: 'Limpiar búsqueda', onPress: () => setSearch('') }
                      : tab === 'drivers' && !data.drivers.length
                        ? { label: 'Ir a Equipo', onPress: openTeam }
                        : filter === 'available' && tab === 'communes'
                          ? { label: 'Ver todas', onPress: () => setFilter('all') }
                          : { label: 'Elegir comunas', onPress: () => setEditing(data) }
                  }
                />
              )
            }
            renderItem={({ item }) => {
              if (item.kind === 'driver')
                return (
                  <Card
                    onPress={() => setSelection({ kind: 'driver', id: item.value.id })}
                    style={styles.card}
                  >
                    <View style={styles.pin}>
                      <Icon name="truck" />
                    </View>
                    <View style={styles.grow}>
                      <Text variant="label">{item.value.name}</Text>
                      <Text variant="note" style={workspaceStyles.muted}>
                        {communes.length}{' '}
                        {communes.length === 1 ? 'comuna heredada' : 'comunas heredadas'}
                      </Text>
                      <DriverBadge driver={item.value} />
                    </View>
                    <Icon name="arrowRight" />
                  </Card>
                );
              if (!data) return null;
              const state = communeCoverageState(data, item.value);
              return (
                <Card
                  onPress={() => setSelection({ kind: 'commune', id: item.value.code })}
                  style={styles.communeCard}
                >
                  <View style={styles.card}>
                    <View style={styles.pin}>
                      <Icon name="pin" />
                    </View>
                    <View style={styles.grow}>
                      <Text variant="subtitle">{item.value.name}</Text>
                      <Text variant="note" style={workspaceStyles.muted}>
                        {state.enabled}{' '}
                        {state.enabled === 1 ? 'conductor habilitado' : 'conductores habilitados'}
                      </Text>
                    </View>
                    <Icon name="arrowRight" />
                  </View>
                  <StatusBadge
                    label={state.label}
                    tone={state.tone}
                    icon={state.available ? 'check' : 'clock'}
                  />
                </Card>
              );
            }}
          />
        }
      />
      {editing ? (
        <CoverageEditor
          businessId={business.id}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <BottomSheet
        visible={selection !== null}
        title={
          selection?.kind === 'help'
            ? 'Cómo sumar comunas'
            : (commune?.name ?? driver?.name ?? 'Cobertura')
        }
        onClose={() => setSelection(null)}
      >
        <ScrollView contentContainerStyle={styles.sheet}>
          {selection?.kind === 'help' ? (
            <>
              <ListRow
                title="1. Elige las comunas"
                subtitle="Cobertura → Editar comunas."
                leading={<Icon name="user" />}
              />
              <ListRow
                title="2. Vincula a tu equipo"
                subtitle="Sus conductores heredan la cobertura del negocio."
                leading={<Icon name="pin" />}
              />
              <ListRow
                title="3. Activa su disponibilidad"
                subtitle="Con el negocio abierto, podrá recibir ofertas."
                leading={<Icon name="truck" />}
              />
              <Button label="Ir a Equipo" onPress={openTeam} />
            </>
          ) : commune ? (
            <>
              <Text variant="note" style={workspaceStyles.muted}>
                Equipo que hereda esta comuna.
              </Text>
              {!commune.drivers.length ? (
                <Feedback text="Cobertura guardada. Falta vincular conductores." />
              ) : null}
              {commune.drivers.map((entry) => (
                <ListRow
                  key={entry.id}
                  title={entry.name}
                  leading={<Icon name="truck" />}
                  trailing={<DriverBadge driver={entry} />}
                />
              ))}
              <Button label="Ver equipo" variant="secondary" onPress={openTeam} />
            </>
          ) : driver ? (
            <>
              <DriverBadge driver={driver} />
              <Text variant="subtitle">Comunas de la distribuidora</Text>
              {communes.length ? (
                communes.map((entry) => (
                  <ListRow key={entry.code} title={entry.name} leading={<Icon name="pin" />} />
                ))
              ) : (
                <Text variant="note" style={workspaceStyles.muted}>
                  La distribuidora aún no define su cobertura.
                </Text>
              )}
              <Text variant="note" style={workspaceStyles.muted}>
                Esta cobertura la administra tu distribuidora.
              </Text>
            </>
          ) : (
            <Feedback text="Este registro cambió. Actualiza la cobertura." />
          )}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

function DriverBadge({ driver }: { driver: CoverageDriver }) {
  return (
    <StatusBadge
      label={coverageDriverLabels[driver.status]}
      tone={
        driver.status === 'available'
          ? 'success'
          : driver.status === 'not_enabled'
            ? 'warning'
            : 'neutral'
      }
      icon={driver.status === 'available' ? 'check' : 'clock'}
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.md },
  list: { gap: theme.spacing.compact },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  communeCard: { gap: theme.spacing.md },
  grow: { flex: 1, gap: theme.spacing.xs },
  pin: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.control,
    padding: theme.spacing.compact,
  },
  sheet: { gap: theme.spacing.md },
});
