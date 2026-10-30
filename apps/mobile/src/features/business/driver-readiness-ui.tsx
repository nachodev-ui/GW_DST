import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBadge } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { type documentVersionStatus } from '@/shared/documents/owner-documents';
import { theme } from '@/theme';

type LicenseState = ReturnType<typeof documentVersionStatus>;
export type ReadinessState = {
  label: string;
  tone: 'success' | 'warning' | 'error' | 'neutral';
  icon: IconName;
};

// Presentation only: retain the existing document resolver's precedence and eligibility.
export function licensePresentation(state: LicenseState, today: string): ReadinessState {
  if (state.approved) return { label: 'Vigente', tone: 'success', icon: 'check' };
  if (state.pending) return { label: 'En revisión', tone: 'warning', icon: 'clock' };
  if (!state.latest) return { label: 'Pendiente', tone: 'warning', icon: 'clock' };
  if (state.latest.status === 'rejected')
    return { label: 'Rechazado', tone: 'error', icon: 'close' };
  if (state.latest.expires_on && state.latest.expires_on < today)
    return { label: 'Vencido', tone: 'warning', icon: 'calendar' };
  return { label: 'Actualizar', tone: 'warning', icon: 'refresh' };
}

export function Requirement({
  icon,
  title,
  value,
  state,
  plate = false,
  detail,
  children,
}: PropsWithChildren<{
  icon: IconName;
  title: string;
  value: string;
  state: ReadinessState;
  plate?: boolean;
  detail?: string | undefined;
}>) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.iconTile}>
          <Icon name={icon} color={theme.colors.text} />
        </View>
        <View style={s.copy}>
          <View style={s.titleRow}>
            <Text variant="note" style={[s.muted, s.title]}>
              {title}
            </Text>
            {detail ? (
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel={`Información: ${title}`}
                accessibilityState={{ expanded: showDetail }}
                onPress={() => setShowDetail(!showDetail)}
                hitSlop={theme.spacing.compact}
                style={s.info}
              >
                <Icon name="info" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
              </PulsePressable>
            ) : null}
          </View>
          <Text variant={plate ? 'subtitle' : 'label'} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View style={s.status}>
          <StatusBadge compact {...state} />
        </View>
      </View>
      {children}
      {showDetail ? (
        <Text variant="note" style={s.muted}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function LicenseSide({
  title,
  state,
  presentation,
}: {
  title: string;
  state: LicenseState;
  presentation: ReadinessState;
}) {
  return (
    <View
      style={[
        s.side,
        presentation.tone === 'error' && s.rejected,
        presentation.label === 'Vencido' && s.expired,
      ]}
    >
      <Text variant="label">{title}</Text>
      <StatusBadge compact label={state.label} tone={presentation.tone} icon={presentation.icon} />
      {state.latest?.rejection_reason ? (
        <Text variant="note" style={s.error}>
          {state.latest.rejection_reason}
        </Text>
      ) : null}
    </View>
  );
}

export const readinessStyles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.lg },
  eyebrow: { color: theme.colors.textMuted },
  identity: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.card,
    borderTopWidth: theme.borders.accent,
    borderTopColor: theme.colors.text,
  },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  summary: { flex: 1, alignItems: 'flex-end' },
  requirements: { gap: theme.spacing.md },
  card: {
    padding: theme.spacing.md,
    gap: theme.spacing.compact,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  iconTile: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    flexShrink: 0,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: theme.spacing.none },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  title: { flexShrink: 1 },
  status: { maxWidth: '40%', flexShrink: 1, alignItems: 'flex-end' },
  info: {
    width: theme.layout.icon,
    height: theme.layout.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sides: { flexDirection: 'row', gap: theme.spacing.sm },
  side: {
    flex: 1,
    minWidth: theme.spacing.none,
    padding: theme.spacing.compact,
    gap: theme.spacing.sm,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
  },
  rejected: { backgroundColor: theme.colors.errorLight, borderColor: theme.colors.error },
  expired: {
    backgroundColor: theme.colors.warningLight,
    borderColor: theme.colors.warning,
    borderStyle: 'dashed',
  },
  attribution: { color: theme.colors.textMuted, fontSize: theme.business.navLabelSize },
  muted: { color: theme.colors.textMuted },
  error: { color: theme.colors.error },
});
const s = readinessStyles;
