import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { formatClp } from '@/shared/orders/contracts';
import { Button, Feedback } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { SegmentedTabs } from '@/shared/ui/segmented-tabs';
import { Text } from '@/shared/ui/text';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { theme } from '@/theme';
import {
  BusinessShell,
  BusinessSection,
  businessStyles as s,
  useSelectedBusiness,
} from './business-shell';
import { useBusinessDashboard, useBusinessSales } from './workspace-data';
import { salesPeriods, salesPeriodLabels, type SalesPeriod } from './workspace-contracts';
import { SaleDeliveryCard } from './sale-delivery-card';

export function BusinessSalesScreen() {
  const business = useSelectedBusiness();
  return business ? <Sales key={business.id} businessId={business.id} /> : null;
}
function Sales({ businessId }: { businessId: string }) {
  const { period: initialPeriod } = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<SalesPeriod>(
    salesPeriods.find((value) => value === initialPeriod) ?? 'today',
  );
  const [showInfo, setShowInfo] = useState(false);
  const sales = useBusinessSales(businessId, period);
  const dashboard = useBusinessDashboard(businessId, period);
  const data = dashboard.isError ? undefined : dashboard.data;
  const items = sales.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <BusinessShell
      title="Ventas"
      onRefresh={() => Promise.all([sales.refetch(), dashboard.refetch()])}
    >
      <SegmentedTabs
        label="Período de ventas"
        value={period}
        onChange={setPeriod}
        options={salesPeriods.map((value) => ({ value, label: salesPeriodLabels[value] }))}
      />
      <View style={styles.summary}>
        <View style={styles.income}>
          <View style={s.row}>
            <Text variant="note" style={[s.grow, s.onDarkMuted]}>
              Total vendido · {salesPeriodLabels[period]}
            </Text>
            <PulsePressable
              accessibilityRole="button"
              accessibilityLabel="Cómo se calcula el total vendido"
              onPress={() => setShowInfo(true)}
              style={styles.infoAction}
            >
              <Icon name="info" color={theme.business.onDark} size={theme.layout.tagRemove} />
            </PulsePressable>
          </View>
          <Text variant="display" style={[s.metricValue, s.onDark]}>
            {data ? formatClp(data.revenue_clp) : '—'}
          </Text>
          <Text variant="note" style={s.onDarkMuted}>
            {data
              ? `${data.delivered_count} entregas · ${data.cylinder_count} cilindros`
              : dashboard.isPending
                ? 'Cargando resumen…'
                : 'Resumen no disponible'}
          </Text>
        </View>
      </View>
      {dashboard.isError ? (
        <View style={s.stack}>
          <Feedback error text="No pudimos cargar el resumen." />
          <Button label="Reintentar" variant="link" onPress={() => void dashboard.refetch()} />
        </View>
      ) : null}
      <BusinessSection title="Entregas del período">
        {sales.isPending ? (
          <Feedback text="Cargando ventas…" />
        ) : sales.isError ? (
          <View style={s.stack}>
            <Feedback error text="No pudimos actualizar las ventas." />
            <Button label="Reintentar" variant="secondary" onPress={() => void sales.refetch()} />
          </View>
        ) : null}
        {!sales.isPending && !sales.isError && items.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="orders" color={theme.business.muted} size={theme.layout.brandMark} />
            <Text variant="label">Sin entregas en este período</Text>
            <Text variant="note" style={s.muted}>
              Prueba otro período.
            </Text>
          </View>
        ) : null}
        {items.map((sale) => (
          <SaleDeliveryCard key={sale.id} sale={sale} />
        ))}
        {sales.hasNextPage ? (
          <Button
            label={sales.isFetchingNextPage ? 'Cargando…' : 'Cargar más ventas'}
            variant="secondary"
            disabled={sales.isFetching}
            onPress={() => void sales.fetchNextPage()}
          />
        ) : null}
      </BusinessSection>
      {showInfo ? (
        <BottomSheet visible title="Acerca de tus ventas" onClose={() => setShowInfo(false)}>
          <ScrollView contentContainerStyle={s.section}>
            <Text variant="note" style={s.muted}>
              Suma de los precios de venta de las entregas completadas en el período. No incluye
              pedidos en curso ni cancelados. El pago es en efectivo contra entrega.
            </Text>
          </ScrollView>
        </BottomSheet>
      ) : null}
    </BusinessShell>
  );
}
const styles = StyleSheet.create({
  summary: {
    backgroundColor: theme.business.surface,
    borderRadius: theme.business.radius,
    overflow: 'hidden',
  },
  income: {
    backgroundColor: theme.business.dark,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.screen,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  infoAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
    backgroundColor: theme.business.surface,
    borderRadius: theme.business.radius,
  },
});
