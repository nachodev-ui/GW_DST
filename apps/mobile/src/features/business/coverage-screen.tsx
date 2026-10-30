import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type TextInputInstance,
} from 'react-native';
import { router } from 'expo-router';
import { useSelectedBusiness } from './business-shell';
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
import { workspaceStyles } from './workspace-ui';
import {
  CoverageDriverDetails,
  CoverageFilter,
  CoverageHelp,
  CoverageSummary,
} from './coverage-ui';
import { TeamTabs } from './team-ui';
import { Button, Card, Feedback, Input, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
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
  const business = useSelectedBusiness();
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
  const { refreshing, refresh } = useManualRefresh(() =>
    coverage.refetch({ cancelRefetch: false }),
  );
  const [tab, setTab] = useState<'communes' | 'drivers'>('communes');
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const [search, setSearch] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const searchInput = useRef<TextInputInstance>(null);
  const dismissSearch = () => {
    searchInput.current?.blur();
    Keyboard.dismiss();
    setSearchActive(false);
  };
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setSearchActive(searchInput.current?.isFocused() ?? false),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setSearchActive(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const [selection, setSelection] = useState<Selection>(null);
  const [editing, setEditing] = useState<BusinessCoverage | null>(null);
  const data = coverage.data;
  const communes = data ? groupCoverage(data) : [];
  const active = data
    ? communes.filter((commune) => communeCoverageState(data, commune).available > 0)
    : [];
  const communeStates = data ? communes.map((entry) => communeCoverageState(data, entry)) : [];
  const sharedState = communeStates.reduce<(typeof communeStates)[number] | undefined>(
    (common, state) =>
      !common ||
      communeStates.filter((entry) => entry.label === state.label).length >
        communeStates.filter((entry) => entry.label === common.label).length
        ? state
        : common,
    undefined,
  );
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
    dismissSearch();
    setSelection(null);
    router.push({ pathname: '/business/team', params: { businessId: business.id } });
  };
  const header = (
    <View style={styles.header}>
      <View style={[styles.actions, searchActive && styles.searchHidden]}>
        {data ? (
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel={communes.length ? 'Editar comunas' : 'Elegir comunas'}
            accessibilityState={{ disabled: coverage.isError }}
            disabled={coverage.isError}
            onPress={() => setEditing(data)}
            style={[styles.editAction, coverage.isError && styles.disabled]}
          >
            <Icon name="edit" size={theme.layout.tagRemove} />
            <Text variant="label" compact style={styles.olive}>
              {communes.length ? 'Editar comunas' : 'Elegir comunas'}
            </Text>
          </PulsePressable>
        ) : (
          <View />
        )}
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Cómo sumar comunas"
          onPress={() => setSelection({ kind: 'help' })}
          style={styles.infoAction}
        >
          <Icon name="info" size={theme.layout.tagRemove} />
        </PulsePressable>
      </View>
      {data ? (
        <>
          <View style={searchActive && styles.searchHidden}>
            <CoverageSummary
              communes={communes.length}
              active={active.length}
              isOpen={data.is_open}
              enabled={data.business_enabled}
              sharedState={sharedState}
              onAll={() => {
                setTab('communes');
                setFilter('all');
                setSearch('');
              }}
              onAvailable={() => {
                setTab('communes');
                setFilter('available');
                setSearch('');
              }}
            />
          </View>
          {coverage.isError ? (
            <Feedback error text="No pudimos actualizar. Mostramos la última consulta." />
          ) : null}
          {data.drivers.length > 0 || communes.length > 0 ? (
            <>
              <TeamTabs
                value={tab}
                onChange={(value) => {
                  dismissSearch();
                  setTab(value);
                  setSearch('');
                }}
                label="Ver cobertura por"
                options={[
                  { value: 'communes', label: 'Comunas', count: String(communes.length) },
                  { value: 'drivers', label: 'Conductores', count: String(data.drivers.length) },
                ]}
              />
              {tab === 'communes' && communes.length > 0 ? (
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Disponibilidad de reparto"
                  style={styles.filters}
                >
                  <CoverageFilter
                    label="Todas"
                    selected={filter === 'all'}
                    onPress={() => {
                      dismissSearch();
                      setFilter('all');
                    }}
                  />
                  <CoverageFilter
                    label="Con reparto ahora"
                    selected={filter === 'available'}
                    onPress={() => {
                      dismissSearch();
                      setFilter('available');
                    }}
                  />
                </View>
              ) : null}
              <Input
                ref={searchInput}
                label={tab === 'communes' ? 'Buscar comuna' : 'Buscar conductor'}
                hideLabel
                placeholder={tab === 'communes' ? 'Buscar comuna' : 'Buscar conductor'}
                prefix={
                  <Icon
                    name="search"
                    size={theme.layout.tagRemove}
                    color={theme.colors.textMuted}
                  />
                }
                frameStyle={styles.searchFrame}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setSearchActive(true)}
                onBlur={() => setSearchActive(false)}
              />
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
  return (
    <>
      <TouchableWithoutFeedback accessible={false} onPress={dismissSearch}>
        <View style={styles.listContainer}>
          <Screen
            tabbed
            title="Cobertura"
            compactHeader
            onBack={() =>
              router.replace({ pathname: '/business/manage', params: { businessId: business.id } })
            }
            list={
              <View style={styles.listContainer}>
                {header}
                <FlatList<Row>
                  data={rows}
                  style={styles.listContainer}
                  contentContainerStyle={[screenStyles.content, styles.list]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  onScrollBeginDrag={dismissSearch}
                  keyExtractor={(item) =>
                    item.kind === 'commune'
                      ? `commune:${item.value.code}`
                      : `driver:${item.value.id}`
                  }
                  alwaysBounceVertical
                  refreshControl={
                    <RefreshControl
                      accessibilityLabel="Actualizar cobertura"
                      refreshing={refreshing}
                      onRefresh={refresh}
                      tintColor={theme.colors.primary}
                      colors={[theme.colors.primary, theme.colors.lime]}
                      progressBackgroundColor={theme.colors.background}
                    />
                  }
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
                            ? {
                                label: 'Limpiar búsqueda',
                                onPress: () => {
                                  dismissSearch();
                                  setSearch('');
                                },
                              }
                            : tab === 'drivers' && !data.drivers.length
                              ? { label: 'Ir a Equipo', onPress: openTeam }
                              : filter === 'available' && tab === 'communes'
                                ? {
                                    label: 'Ver todas',
                                    onPress: () => {
                                      dismissSearch();
                                      setFilter('all');
                                    },
                                  }
                                : {
                                    label: 'Elegir comunas',
                                    onPress: () => {
                                      dismissSearch();
                                      setEditing(data);
                                    },
                                  }
                        }
                      />
                    )
                  }
                  renderItem={({ item }) => {
                    if (item.kind === 'driver')
                      return (
                        <Card
                          onPress={() => {
                            dismissSearch();
                            setSelection({ kind: 'driver', id: item.value.id });
                          }}
                          style={styles.card}
                        >
                          <View style={styles.pin}>
                            <Icon name="truck" />
                          </View>
                          <View style={styles.grow}>
                            <Text variant="label" numberOfLines={1}>
                              {item.value.name}
                            </Text>
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
                        onPress={() => {
                          dismissSearch();
                          setSelection({ kind: 'commune', id: item.value.code });
                        }}
                        style={styles.card}
                      >
                        <View style={styles.pin}>
                          <Icon name="pin" />
                        </View>
                        <View style={styles.grow}>
                          <Text variant="label" numberOfLines={1}>
                            {item.value.name}
                          </Text>
                          <Text variant="note" numberOfLines={1} style={workspaceStyles.muted}>
                            {state.enabled} {state.enabled === 1 ? 'conductor' : 'conductores'}
                          </Text>
                        </View>
                        {state.label !== sharedState?.label ? (
                          <StatusBadge
                            compact
                            label={state.label}
                            tone={state.tone}
                            icon={state.available ? 'check' : 'clock'}
                          />
                        ) : null}
                        <Icon
                          name="arrowRight"
                          size={theme.layout.tagRemoveIcon}
                          color={theme.colors.textMuted}
                        />
                      </Card>
                    );
                  }}
                />
              </View>
            }
          />
        </View>
      </TouchableWithoutFeedback>
      {editing ? (
        <CoverageEditor
          businessId={business.id}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <BottomSheet
        visible={selection !== null}
        header={
          driver ? (
            <Text variant="note" style={workspaceStyles.muted}>
              Cobertura
            </Text>
          ) : undefined
        }
        title={
          selection?.kind === 'help'
            ? 'Sumar comunas'
            : (commune?.name ?? driver?.name ?? 'Cobertura')
        }
        onClose={() => setSelection(null)}
      >
        <ScrollView style={driver && styles.driverSheetScroll} contentContainerStyle={styles.sheet}>
          {selection?.kind === 'help' ? (
            <>
              <CoverageHelp />
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
            <CoverageDriverDetails
              name={driver.name}
              status={<DriverBadge driver={driver} />}
              communes={communes}
            />
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
      compact
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
  header: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.compact,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
  },
  listContainer: { flex: 1 },
  searchHidden: { display: 'none' },
  list: { gap: theme.spacing.sm, paddingTop: theme.spacing.xs },
  filters: { flexDirection: 'row', gap: theme.spacing.sm },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
  infoAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
  },
  olive: { color: theme.colors.primary },
  disabled: { opacity: theme.opacity.disabled },
  searchFrame: {
    minHeight: theme.layout.touchTarget,
    paddingLeft: theme.spacing.compact,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  searchInput: { minHeight: theme.layout.touchTarget, paddingVertical: theme.spacing.sm },
  card: {
    ...theme.elevation.flat,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.compact,
    borderRadius: theme.business.radius,
  },
  grow: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  pin: {
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
    padding: theme.spacing.compact,
  },
  sheet: { gap: theme.spacing.md },
  driverSheetScroll: { flexGrow: 0 },
});
