import { type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useGlobalSearchParams, useLocalSearchParams, usePathname } from 'expo-router';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
import { theme } from '@/theme';
import { StatusBar } from 'expo-status-bar';
import { useWorkspaceBusinesses } from './workspace-access';

export type BusinessPath =
  | '/business/manage'
  | '/business/sales'
  | '/business/operations'
  | '/business/details'
  | '/business/team'
  | '/business/catalog'
  | '/business/coverage';
export const openBusiness = (pathname: BusinessPath, businessId: string) =>
  router.push({ pathname, params: { businessId } });
export function useSelectedBusiness() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const businesses = useWorkspaceBusinesses();
  return (
    businesses.data?.find((item) => item.id === businessId) ??
    (!businessId ? businesses.data?.[0] : undefined)
  );
}
export function BusinessShell({
  title,
  subtitle,
  header,
  children,
  onRefresh,
  action,
  footer,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  header?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  onRefresh?: () => Promise<unknown>;
}>) {
  const { refreshing, refresh } = useManualRefresh(onRefresh);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={businessStyles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={businessStyles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={businessStyles.masthead}>
          <GaswayLogo variant="monogram" />
          <Text variant="label" style={businessStyles.eyebrow}>
            DISTRIBUIDOR
          </Text>
          <View style={businessStyles.grow} />
          {action}
        </View>
        <ScrollView
          style={footer ? businessStyles.scroll : undefined}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={businessStyles.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
        >
          {header ?? (
            <View style={businessStyles.stack}>
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="note" style={businessStyles.muted}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
          {children}
        </ScrollView>
        {footer ? <View style={businessStyles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const navigation: { label: string; icon: IconName; path: BusinessPath }[] = [
  { label: 'Panel', icon: 'dashboard', path: '/business/manage' },
  { label: 'Ventas', icon: 'chart', path: '/business/sales' },
  { label: 'Operación', icon: 'truck', path: '/business/operations' },
  { label: 'Perfil', icon: 'store', path: '/business/details' },
];
export function BusinessNavigation() {
  const path = usePathname();
  const { businessId } = useGlobalSearchParams<{ businessId?: string }>();
  const businesses = useWorkspaceBusinesses();
  const selected = businesses.data?.find((item) => item.id === businessId) ?? businesses.data?.[0];
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[businessStyles.navSafe, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}
    >
      <View
        style={businessStyles.nav}
        accessibilityRole="tablist"
        accessibilityLabel="Gestión del distribuidor"
      >
        {navigation.map((item) => {
          const active =
            path === item.path ||
            (item.path === '/business/operations' &&
              ['/business/team', '/business/catalog', '/business/coverage'].includes(path));
          return (
            <PulsePressable
              key={item.path}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[businessStyles.navItem, active && businessStyles.navActive]}
              onPress={() => {
                if (selected)
                  router.replace({ pathname: item.path, params: { businessId: selected.id } });
              }}
            >
              <Icon name={item.icon} color={active ? theme.colors.primary : theme.business.muted} />
              <Text
                variant="note"
                compact
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={theme.business.navLabelMinScale}
                style={[
                  businessStyles.navLabel,
                  active ? businessStyles.activeLabel : businessStyles.muted,
                ]}
              >
                {item.label}
              </Text>
            </PulsePressable>
          );
        })}
      </View>
    </View>
  );
}
export function BusinessSection({
  title,
  action,
  children,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={businessStyles.section}>
      <View style={businessStyles.sectionHeader}>
        <Text variant="subtitle" accessibilityRole="header" style={businessStyles.grow}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}
export function BusinessMetric({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: IconName;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Icon name={icon} />
      <Text variant="title" style={businessStyles.metricValue}>
        {value}
      </Text>
      <Text variant="note" style={businessStyles.muted}>
        {label}
      </Text>
    </>
  );
  return onPress ? (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={businessStyles.metric}
    >
      {content}
    </PulsePressable>
  ) : (
    <View style={businessStyles.metric}>{content}</View>
  );
}
export const businessStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.business.canvas },
  scroll: { flex: 1 },
  footer: {
    flexShrink: 0,
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.compact,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.business.border,
    backgroundColor: theme.business.canvas,
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
  },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.md,
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.business.border,
  },
  eyebrow: { letterSpacing: theme.typography.tracking.eyebrow, color: theme.business.muted },
  content: {
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
  },
  stack: { gap: theme.spacing.sm },
  section: { gap: theme.spacing.md },
  grow: { flex: 1, minWidth: theme.spacing.none },
  flexCell: {
    flexGrow: 1,
    flexBasis: theme.business.metricMinWidth,
    minWidth: theme.business.metricMinWidth,
  },
  muted: { color: theme.business.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.compact },
  card: {
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  dark: {
    backgroundColor: theme.business.dark,
    borderRadius: theme.business.radius,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  onDark: { color: theme.business.onDark },
  onDarkMuted: { color: theme.colors.heroMuted },
  metric: {
    flexGrow: 1,
    flexBasis: '44%',
    minWidth: theme.business.metricMinWidth,
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metricValue: {
    fontVariant: ['tabular-nums'],
    fontSize: theme.business.metricSize,
    lineHeight: theme.business.metricLine,
  },
  navSafe: {
    backgroundColor: theme.business.surface,
    borderTopColor: theme.business.border,
    borderTopWidth: theme.borders.thin,
  },
  nav: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
  },
  navItem: {
    flex: 1,
    minWidth: theme.spacing.none,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.navigation.minHeight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderTopWidth: theme.business.navIndicator,
    borderTopColor: theme.business.surface,
  },
  navActive: { borderTopColor: theme.colors.primary, backgroundColor: theme.business.soft },
  activeLabel: { color: theme.colors.primary },
  navLabel: {
    fontSize: theme.business.navLabelSize,
    lineHeight: theme.business.navLabelLine,
    textAlign: 'center',
    width: '100%',
  },
});
