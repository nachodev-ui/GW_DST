import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  useAssignedOrder,
  useDriverActions,
  useDriverSettings,
  useDriverWorkspace,
} from '@/features/driver/offer-data';
import { driverError } from '@/features/driver/offer-contracts';
import { DriverAvailability } from '@/features/driver/driver-ui';
import { useDriverLicenseSubmission } from './document-data';
import { Button, Card, Feedback, Input } from '@/shared/ui/components';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
import { theme } from '@/theme';

const searchKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .trim();

export function CoverageScreen() {
  const { settings } = useDriverSettings();
  const workspace = useDriverWorkspace();
  const license = useDriverLicenseSubmission(workspace.isError ? undefined : workspace.data);
  const assigned = useAssignedOrder();
  const { settings: save } = useDriverActions();
  const [search, setSearch] = useState('');
  const { refreshing, refresh } = useManualRefresh(async () => {
    if (save.isPending) return;
    await Promise.allSettled([
      settings.refetch({ cancelRefetch: false }),
      workspace.refetch({ cancelRefetch: false }),
      assigned.refetch({ cancelRefetch: false }),
      license.refresh(),
    ]);
  });
  const uncertain =
    settings.isPending ||
    settings.isError ||
    workspace.isPending ||
    workspace.isError ||
    assigned.isPending ||
    assigned.isError;
  const error = settings.error || workspace.error || assigned.error || save.error;
  const communes = settings.isError ? undefined : settings.data?.communes;
  const results = useMemo(() => {
    const query = searchKey(search);
    return (communes ?? [])
      .filter((commune) => searchKey(commune.name).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
  }, [communes, search]);
  const business = !workspace.isError ? workspace.data?.business : undefined;
  const activeOrder = !assigned.isError ? assigned.data : undefined;
  return (
    <Screen
      title="Disponibilidad y cobertura"
      compactHeader
      onBack={() => router.replace('/driver')}
      tabbed
      list={
        <FlatList
          data={results}
          keyExtractor={(commune) => commune.code}
          contentContainerStyle={screenStyles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              accessibilityLabel="Actualizar disponibilidad y cobertura"
              refreshing={refreshing}
              onRefresh={refresh}
              enabled={!save.isPending}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary, theme.colors.lime]}
              progressBackgroundColor={theme.colors.background}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <DriverAvailability
                settings={settings.data}
                workspace={workspace.data}
                licenseSubmission={license.submission}
                hasOrder={!!assigned.data}
                busy={save.isPending}
                uncertain={uncertain}
                checking={settings.isPending || workspace.isPending || assigned.isPending}
                appearance="coverage"
                onChange={(is_available) => save.mutate({ is_available })}
              />
              {activeOrder ? (
                <Button
                  label="Continuar mi entrega"
                  onPress={() =>
                    router.push({
                      pathname: '/driver-order/[id]',
                      params: { id: activeOrder.order_id },
                    })
                  }
                />
              ) : null}
              {error ? <Feedback text={driverError(error)} error /> : null}
              <Card style={styles.coverage}>
                <View style={styles.summary}>
                  <View style={styles.flex}>
                    <Text variant="note" style={styles.onDark}>
                      Tu zona de reparto
                    </Text>
                    <Text variant="display" style={styles.onDark}>
                      {communes ? `${communes.length}` : '—'}
                    </Text>
                    <Text variant="label" style={styles.onDark}>
                      {communes?.length === 1 ? 'comuna' : 'comunas'}
                    </Text>
                  </View>
                  <View style={styles.zoneIcon}>
                    <Icon name="pin" size={theme.layout.brandStacked} color={theme.colors.text} />
                  </View>
                </View>
                {business ? (
                  <View style={styles.business}>
                    <View style={styles.businessHeading}>
                      <Icon name="home" size={theme.spacing.screen} color={theme.colors.lime} />
                      <Text variant="label" style={[styles.flex, styles.onDark]}>
                        {business.name}
                      </Text>
                      {business.is_demo ? (
                        <Text variant="note" style={styles.onDark}>
                          Demo
                        </Text>
                      ) : null}
                    </View>
                    {business.brands.length > 0 ? (
                      <View style={styles.brands}>
                        {business.brands.map((brand) => (
                          <View key={brand} style={styles.brand}>
                            <Text variant="note" style={styles.onDark}>
                              {brand}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
              <View style={styles.communesHeading}>
                <View style={styles.flex}>
                  <Text variant="subtitle" accessibilityRole="header">
                    Comunas de reparto
                  </Text>
                  <Text variant="note" style={styles.muted}>
                    Las administra tu distribuidora.
                  </Text>
                </View>
                <PulsePressable
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar disponibilidad y cobertura"
                  accessibilityState={{ disabled: refreshing || save.isPending, busy: refreshing }}
                  disabled={refreshing || save.isPending}
                  onPress={refresh}
                  style={styles.refresh}
                >
                  {refreshing ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Icon name="refresh" />
                  )}
                </PulsePressable>
              </View>
              {communes && communes.length > 0 ? (
                <Input
                  label="Buscar en tus comunas"
                  placeholder="Buscar comuna"
                  hideLabel
                  prefix={<Icon name="search" />}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              ) : null}
              {searchKey(search) && communes?.length ? (
                <Text variant="note" style={styles.muted}>
                  {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <>
              {settings.isPending ? (
                <Skeleton rows={3} />
              ) : settings.isError ? null : communes?.length && searchKey(search) ? (
                <View style={styles.noResults}>
                  <EmptyState
                    icon="search"
                    title="Sin coincidencias"
                    description="Prueba con otro nombre de comuna."
                  />
                  <Button label="Limpiar búsqueda" variant="link" onPress={() => setSearch('')} />
                </View>
              ) : (
                <EmptyState
                  icon="pin"
                  title="Sin comunas de reparto"
                  description="Tu distribuidora debe definir la cobertura."
                />
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.commune}>
              <View style={styles.communeIcon}>
                <Icon name="pin" />
              </View>
              <Text variant="label" style={styles.flex}>
                {item.name}
              </Text>
            </View>
          )}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: theme.spacing.none },
  muted: { color: theme.colors.primary },
  onDark: { color: theme.colors.background },
  coverage: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    borderRadius: theme.radii.hero,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  zoneIcon: {
    width: theme.layout.illustrationSelector,
    height: theme.layout.illustrationSelector,
    borderRadius: theme.radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lime,
  },
  business: {
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.primary,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.compact,
  },
  businessHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  brands: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  brand: {
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.xs,
  },
  communesHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  refresh: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commune: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    minHeight: theme.layout.touchTarget,
  },
  communeIcon: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: { gap: theme.spacing.sm },
});
