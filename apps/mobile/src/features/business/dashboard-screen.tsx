import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { formatClp } from '@/shared/orders/contracts';
import { Button, Feedback, OptionCard, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { SegmentedTabs } from '@/shared/ui/segmented-tabs';
import { Text } from '@/shared/ui/text';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { theme } from '@/theme';
import { fetchBusinessProducts } from './business-data';
import { useWorkspaceBusinesses } from './workspace-access';
import { useBusinessCoverage } from './coverage-data';
import { useBusinessDashboard, useBusinessProfile, useBusinessVehicles } from './workspace-data';
import { salesPeriodLabels, salesPeriods, type SalesPeriod } from './workspace-contracts';
import {
  BusinessShell,
  businessStyles as s,
  openBusiness,
  useSelectedBusiness,
} from './business-shell';

export function BusinessDashboardScreen() {
  const business = useSelectedBusiness();
  return business ? <Dashboard key={business.id} business={business} /> : null;
}
function Dashboard({
  business,
}: {
  business: NonNullable<ReturnType<typeof useSelectedBusiness>>;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const businesses = useWorkspaceBusinesses();
  const focused = useIsFocused();
  const [choosing, setChoosing] = useState(false);
  const [period, setPeriod] = useState<SalesPeriod>('today');
  const summary = useBusinessDashboard(business.id, period);
  const profile = useBusinessProfile(business.id);
  const coverage = useBusinessCoverage(business.id);
  const vehicles = useBusinessVehicles(business.id);
  const products = useQuery({
    enabled: focused,
    queryKey: ['business-products', session?.user.id, business.id],
    queryFn: () => fetchBusinessProducts(business.id),
    refetchInterval: 30_000,
  });
  const data = summary.isError ? undefined : summary.data;
  const crew = coverage.isError ? undefined : coverage.data;
  const fleet = vehicles.isError ? undefined : vehicles.data;
  const available = crew?.drivers.filter((driver) => driver.status === 'available').length;
  const freeVehicles = fleet?.filter(
    (vehicle) => vehicle.status === 'available' && vehicle.documents_eligible && !vehicle.is_busy,
  ).length;
  const publishedCount = products.data?.filter((product) => product.is_listed).length;
  const showSales = () =>
    router.push({ pathname: '/business/sales', params: { businessId: business.id, period } });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['business-dashboard', session?.user.id, business.id] }),
      coverage.refetch(),
      vehicles.refetch(),
      products.refetch(),
      profile.refetch(),
      businesses.refetch(),
    ]);
  return (
    <BusinessShell
      title={profile.data?.display_name ?? business.name}
      header={
        <View style={s.stack}>
          <View style={styles.nameRow}>
            <Text variant="title" accessibilityRole="header" style={styles.businessName}>
              {profile.data?.display_name ?? business.name}
            </Text>
            {business.is_demo ? (
              <View style={styles.demoTag}>
                <Text variant="note" compact style={styles.demoLabel}>
                  Demo
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.statusLine}>
            <StatusBadge
              label={business.is_verified ? 'Negocio habilitado' : 'Negocio no habilitado'}
              icon={business.is_verified ? 'check' : 'clock'}
              tone={business.is_verified ? 'success' : 'warning'}
              compact
            />
            {crew ? (
              <Text variant="note" compact style={s.muted}>
                · {crew.is_open ? 'Abierto' : 'Fuera del horario'}
              </Text>
            ) : null}
          </View>
        </View>
      }
      onRefresh={refresh}
      action={
        businesses.data && businesses.data.length > 1 ? (
          <Button label="Cambiar" variant="link" onPress={() => setChoosing(true)} />
        ) : undefined
      }
    >
      <View style={styles.salesSummary}>
        <SegmentedTabs
          label="Período de ventas"
          value={period}
          onChange={setPeriod}
          options={salesPeriods.map((value) => ({ value, label: salesPeriodLabels[value] }))}
        />
        <View style={[s.dark, styles.revenueCard]}>
          <View style={s.row}>
            <Text variant="label" style={[s.onDarkMuted, s.grow]}>
              Total vendido
            </Text>
            <Icon name="chart" color={theme.business.accent} />
          </View>
          <Text variant="display" style={[styles.revenueValue, s.onDark]}>
            {data ? formatClp(data.revenue_clp) : '—'}
          </Text>
          <Text variant="note" style={s.onDarkMuted}>
            {data
              ? `${data.delivered_count} entregas · ${data.cylinder_count} cilindros`
              : summary.isError
                ? 'No pudimos actualizar las ventas.'
                : 'Cargando ventas…'}
          </Text>
        </View>
      </View>
      {summary.isError ? (
        <View style={s.stack}>
          <Feedback
            error
            text="No pudimos cargar el resumen de ventas. Desliza para actualizar o reintenta."
          />
          <Button
            label="Reintentar ventas"
            variant="secondary"
            onPress={() => void summary.refetch()}
          />
        </View>
      ) : null}
      {data ? (
        <DashboardSection
          title="Actividad de ventas"
          action={<Button label="Ver ventas" variant="link" onPress={showSales} />}
        >
          <SalesChart key={period} days={data.days} />
        </DashboardSection>
      ) : null}
      <DashboardSection
        title="Operación ahora"
        action={
          <Button
            label="Gestionar"
            variant="link"
            onPress={() => openBusiness('/business/operations', business.id)}
          />
        }
      >
        <View style={styles.operations}>
          <View style={styles.statRow}>
            <OperationStat
              value={available === undefined ? '—' : String(available)}
              label="Conductores"
              accessibilityLabel="Conductores disponibles"
              icon="user"
              onPress={() => openBusiness('/business/operations', business.id)}
            />
            <View style={styles.statDivider} />
            <OperationStat
              value={freeVehicles === undefined ? '—' : String(freeVehicles)}
              label="Vehículos"
              accessibilityLabel="Vehículos disponibles"
              icon="truck"
              onPress={() => openBusiness('/business/operations', business.id)}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.statRow}>
            <OperationStat
              value={data ? String(data.active_count) : '—'}
              label="En reparto"
              accessibilityLabel="Pedidos en reparto"
              icon="navigate"
            />
            <View style={styles.statDivider} />
            <OperationStat
              value={data ? String(data.waiting_count) : '—'}
              label="Por asignar"
              accessibilityLabel="Pedidos por asignar"
              icon="clock"
            />
          </View>
        </View>
        {coverage.isError || vehicles.isError ? (
          <Feedback
            error
            text="Parte de la operación no está disponible. Desliza para actualizar."
          />
        ) : null}
        {crew && (!crew.business_enabled || !crew.communes.length) ? (
          <Text variant="note" style={s.muted}>
            {!crew.business_enabled
              ? 'El negocio todavía no está habilitado para repartir.'
              : 'Configura las comunas en Cobertura.'}
          </Text>
        ) : null}
      </DashboardSection>
      <DashboardSection title="Catálogo y cobertura">
        <View style={styles.catalog}>
          <PulsePressable
            accessibilityRole="button"
            style={styles.catalogRow}
            onPress={() => openBusiness('/business/catalog', business.id)}
          >
            <Icon name="orders" />
            <View style={s.grow}>
              <Text variant="label">Inventario y precios</Text>
              <Text variant="note" style={s.muted}>
                {products.data && !products.isError
                  ? `${publishedCount} ${publishedCount === 1 ? 'producto publicado' : 'productos publicados'} · ${products.data.filter((p) => p.is_listed && p.stock === 0).length} sin stock`
                  : products.isError
                    ? 'No pudimos cargar el inventario'
                    : 'Cargando inventario…'}
              </Text>
            </View>
            <Icon name="arrowRight" />
          </PulsePressable>
          <View style={styles.rowDivider} />
          <PulsePressable
            accessibilityRole="button"
            style={styles.catalogRow}
            onPress={() => openBusiness('/business/coverage', business.id)}
          >
            <Icon name="pin" />
            <View style={s.grow}>
              <Text variant="label">Zonas de reparto</Text>
              <Text variant="note" style={s.muted}>
                {crew
                  ? `${crew.communes.length} ${crew.communes.length === 1 ? 'comuna configurada' : 'comunas configuradas'}`
                  : 'Revisar cobertura'}
              </Text>
            </View>
            <Icon name="arrowRight" />
          </PulsePressable>
        </View>
      </DashboardSection>
      <BottomSheet
        visible={choosing}
        title="Selecciona tu distribuidora"
        onClose={() => setChoosing(false)}
      >
        <ScrollView contentContainerStyle={s.stack}>
          {businesses.data?.map((item) => (
            <OptionCard
              key={item.id}
              label={item.name}
              selected={item.id === business.id}
              onPress={() => {
                setChoosing(false);
                router.replace({ pathname: '/business/manage', params: { businessId: item.id } });
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </BusinessShell>
  );
}
function DashboardSection({
  title,
  action,
  children,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          variant="subtitle"
          accessibilityRole="header"
          numberOfLines={1}
          style={styles.sectionTitle}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}
function OperationStat({
  label,
  accessibilityLabel,
  value,
  icon,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  icon: IconName;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.statValueRow}>
        <Icon name={icon} size={theme.layout.tagRemove} color={theme.business.muted} />
        <Text variant="subtitle" style={styles.statValue}>
          {value}
        </Text>
      </View>
      <Text variant="note" numberOfLines={1} style={s.muted}>
        {label}
      </Text>
    </>
  );
  return onPress ? (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${value}`}
      onPress={onPress}
      style={styles.stat}
    >
      {content}
    </PulsePressable>
  ) : (
    <View accessible accessibilityLabel={`${accessibilityLabel}: ${value}`} style={styles.stat}>
      {content}
    </View>
  );
}
function SalesChart({
  days,
}: {
  days: { day: string; revenue_clp: number; delivered_count: number }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(0, ...days.map((day) => day.revenue_clp));
  const current = days.find((day) => day.day === selected);
  if (!days.some((day) => day.delivered_count > 0))
    return (
      <View style={styles.chartEmpty}>
        <Icon name="chart" size={theme.layout.tagRemove} color={theme.business.muted} />
        <Text variant="note" style={s.muted}>
          Sin ventas en este período
        </Text>
      </View>
    );
  return (
    <View style={s.card}>
      <Text variant="note" style={s.muted}>
        {current
          ? `${current.day.split('-').reverse().join('/')} · ${current.delivered_count} entregas · ${formatClp(current.revenue_clp)}`
          : 'Ventas diarias · CLP'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chart}>
          {days.map((day) => (
            <PulsePressable
              key={day.day}
              accessibilityRole="button"
              accessibilityLabel={`${day.day}, ${formatClp(day.revenue_clp)}, ${day.delivered_count} entregas`}
              accessibilityState={{ selected: day.day === selected }}
              onPress={() => setSelected(day.day)}
              style={styles.column}
            >
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height:
                        day.revenue_clp === 0
                          ? 0
                          : Math.max(
                              theme.business.barMinHeight,
                              (day.revenue_clp / max) * theme.business.chartHeight,
                            ),
                      backgroundColor:
                        day.day === selected ? theme.business.dark : theme.colors.lime,
                    },
                  ]}
                />
              </View>
              <Text variant="note" style={styles.chartLabel}>
                {day.day.slice(-2)}
              </Text>
            </PulsePressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  businessName: { flexShrink: 1 },
  demoTag: {
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  demoLabel: { color: theme.business.muted, fontSize: theme.business.navLabelSize },
  statusLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  salesSummary: { gap: theme.spacing.compact },
  revenueCard: { gap: theme.spacing.sm },
  revenueValue: {
    fontSize: theme.workspace.metricSize,
    lineHeight: theme.workspace.metricLine,
    fontVariant: ['tabular-nums'],
    marginVertical: theme.spacing.xs,
  },
  section: { gap: theme.spacing.compact, marginTop: theme.spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionTitle: { fontSize: theme.typography.sizes.body },
  operations: {
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
    padding: theme.spacing.xs,
  },
  statRow: { flexDirection: 'row', alignItems: 'stretch' },
  stat: {
    flex: 1,
    minWidth: theme.spacing.none,
    padding: theme.spacing.compact,
    gap: theme.spacing.xs,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  statValue: { fontVariant: ['tabular-nums'] },
  statDivider: {
    width: theme.borders.thin,
    backgroundColor: theme.business.border,
    marginVertical: theme.spacing.compact,
  },
  rowDivider: { height: theme.borders.thin, backgroundColor: theme.business.border },
  catalog: {
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
    paddingHorizontal: theme.spacing.md,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.md,
    minHeight: theme.layout.touchTarget,
  },
  chartEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.business.chartGap },
  column: { minWidth: theme.layout.touchTarget, alignItems: 'center', gap: theme.spacing.sm },
  barTrack: {
    height: theme.business.chartHeight,
    justifyContent: 'flex-end',
    width: theme.spacing.lg,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: theme.spacing.xs,
    borderTopRightRadius: theme.spacing.xs,
  },
  chartLabel: { fontSize: theme.business.chartLabelSize, color: theme.business.muted },
});
