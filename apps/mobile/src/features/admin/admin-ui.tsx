import type { PropsWithChildren, ReactNode } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { documentSignedUrl } from '@/shared/documents/files';
import { documentError } from '@/shared/documents/contracts';
import { Button, Feedback } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
import { theme } from '@/theme';
import type { AdminBusiness } from './admin-data';

export function AdminPage({
  title,
  onBack,
  action,
  footer,
  onRefresh,
  children,
}: PropsWithChildren<{
  title: string;
  onBack?: () => void;
  action?: ReactNode;
  footer?: ReactNode;
  onRefresh?: (() => Promise<unknown>) | undefined;
}>) {
  const { refreshing, refresh } = useManualRefresh(onRefresh);
  return (
    <SafeAreaView
      edges={footer ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      style={s.page}
    >
      <StatusBar style="dark" />
      <View style={[s.row, s.header]}>
        {onBack ? (
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            style={s.iconButton}
          >
            <Icon name="arrowLeft" />
          </PulsePressable>
        ) : (
          <GaswayLogo variant="monogram" />
        )}
        <Text variant="subtitle" accessibilityRole="header" style={s.grow}>
          {title}
        </Text>
        {action}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
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
        {children}
      </ScrollView>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function QueryFeedback({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: unknown;
  retry: () => void;
}) {
  return pending ? (
    <Feedback text="Cargando…" />
  ) : error ? (
    <View style={s.stack}>
      <Feedback error text={documentError(error)} />
      <Button label="Reintentar" variant="secondary" onPress={retry} />
    </View>
  ) : null;
}

export function AdminChip({
  label,
  icon,
  tone = 'pending',
}: {
  label: string;
  icon: IconName;
  tone?: 'pending' | 'approved' | 'rejected' | 'warning' | 'neutral';
}) {
  const color =
    tone === 'rejected'
      ? theme.colors.error
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'neutral'
          ? theme.colors.textMuted
          : tone === 'approved'
            ? theme.brand.colors.green
            : theme.brand.colors.olive;
  return (
    <View style={s.chip} accessible accessibilityLabel={label}>
      <Icon name={icon} size={theme.layout.tagRemove} color={color} />
      <Text variant="note" compact style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export function ReviewProgress({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <View style={s.stackSmall}>
      <View style={s.between}>
        <Text variant="note" style={s.muted}>
          Revisados
        </Text>
        <Text variant="note">
          {done}/{total}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}
        style={s.track}
      >
        <View style={[s.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

export function oldestLabel(at: string | null, today: string) {
  if (!at) return 'Sin pendientes';
  const day = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
  const days = Math.max(
    0,
    Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86400000),
  );
  return days === 0 ? 'Hoy' : `${days} ${days === 1 ? 'día' : 'días'}`;
}

export function BusinessReviewCard({
  business,
  today,
  onPress,
}: {
  business: AdminBusiness;
  today: string;
  onPress: () => void;
}) {
  const reviewed = business.approved + business.rejected;
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${business.pending} pendientes`}
      onPress={onPress}
      style={s.card}
    >
      <View style={s.row}>
        <Icon name="store" />
        <Text variant="subtitle" style={s.grow}>
          {business.name}
        </Text>
        <Icon name="arrowRight" />
      </View>
      <View style={s.wrap}>
        <AdminChip label={`${business.pending} pendientes`} icon="orders" />
        <AdminChip
          label={oldestLabel(business.oldest_pending_at, today)}
          icon="clock"
          tone="neutral"
        />
      </View>
      <ReviewProgress done={reviewed} total={reviewed + business.pending} />
    </PulsePressable>
  );
}

export function AdminImage({
  path,
  photo = false,
  large = false,
  pdf = false,
  onPress,
}: {
  path: string | null;
  photo?: boolean;
  large?: boolean;
  pdf?: boolean;
  onPress?: (() => void) | undefined;
}) {
  const { session } = useAuth();
  const focused = useIsFocused();
  const image = useQuery({
    queryKey: ['admin-document-image', session?.user.id, photo, path],
    enabled: !!path && !pdf && focused,
    queryFn: () => documentSignedUrl(photo ? 'vehicle-photos' : 'documents', path!),
    staleTime: 40_000,
    refetchInterval: focused ? 45_000 : false,
    gcTime: 0,
  });
  const content =
    image.data && !image.isError ? (
      <Image
        source={{ uri: image.data }}
        resizeMode="contain"
        style={large ? s.photo : s.thumbnail}
        accessibilityLabel={photo ? 'Foto del vehículo' : 'Miniatura del documento'}
      />
    ) : (
      <View style={[s.placeholder, large ? s.photo : s.thumbnail]}>
        <Icon name={pdf ? 'orders' : photo ? 'truck' : 'image'} />
        {pdf ? <Text variant="note">PDF</Text> : null}
      </View>
    );
  return onPress ? (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={photo ? 'Ver foto' : 'Ver documento'}
      onPress={onPress}
    >
      {content}
    </PulsePressable>
  ) : (
    content
  );
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.business.maxWidth,
    alignSelf: 'center',
  },
  footer: {
    padding: theme.spacing.screen,
    borderTopWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  stack: { gap: theme.spacing.md },
  stackSmall: { gap: theme.spacing.sm },
  muted: { color: theme.colors.textMuted },
  card: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
  },
  activeCard: { borderColor: theme.brand.colors.olive, borderWidth: theme.borders.focus },
  chip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
  },
  metric: {
    minWidth: theme.business.metricMinWidth,
    flexGrow: 1,
    flexBasis: '45%',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
  },
  number: { fontSize: theme.business.metricSize, lineHeight: theme.business.metricLine },
  iconButton: { padding: theme.spacing.sm, borderRadius: theme.radii.control },
  track: {
    height: theme.documentation.stepHeight,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.brand.colors.olive },
  thumbnail: {
    width: theme.documentation.thumbnailSize,
    height: theme.documentation.thumbnailSize,
    borderRadius: theme.radii.control,
  },
  photo: {
    width: '100%',
    height: theme.documentation.previewHeight,
    borderRadius: theme.radii.control,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warm,
  },
  destructive: {
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
  },
  selected: { backgroundColor: theme.colors.primaryLight, borderRadius: theme.radii.control },
  reason: { width: 'auto', maxWidth: '100%', flexShrink: 1, borderRadius: theme.radii.pill },
});
