import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/shared/ui/avatar';
import { StatusBadge } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { communeCoverageState, CoverageCommune } from './coverage-contracts';
import { readinessStyles } from './driver-readiness-ui';

type CoverageState = ReturnType<typeof communeCoverageState>;

export function CoverageDriverDetails({
  name,
  status,
  communes,
}: {
  name: string;
  status: ReactNode;
  communes: CoverageCommune[];
}) {
  return (
    <View style={styles.driverDetails}>
      <View style={readinessStyles.identity}>
        <View style={readinessStyles.identityTop}>
          <Avatar name={name} large />
          <View style={readinessStyles.summary} accessibilityLiveRegion="polite">
            {status}
          </View>
        </View>
        <Text variant="title" accessibilityRole="header" numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.communeSection}>
        <View style={styles.communeHeading}>
          <Text
            variant="note"
            accessibilityRole="header"
            style={[styles.muted, styles.sectionLabel]}
          >
            Comunas de la distribuidora
          </Text>
          <Text variant="note" style={styles.communeCount}>
            {communes.length}
          </Text>
        </View>
        {communes.length ? (
          <View style={styles.communeChips}>
            {communes.map((entry) => (
              <View
                key={entry.code}
                accessible
                accessibilityLabel={entry.name}
                style={styles.communeChip}
              >
                <View style={styles.communeIcon}>
                  <Icon name="pin" size={theme.layout.tagRemoveIcon} />
                </View>
                <Text variant="note" numberOfLines={1} style={styles.communeName}>
                  {entry.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="note" style={styles.muted}>
            La distribuidora aún no define su cobertura.
          </Text>
        )}
      </View>
    </View>
  );
}

export function CoverageSummary({
  communes,
  active,
  isOpen,
  enabled,
  sharedState,
  onAll,
  onAvailable,
}: {
  communes: number;
  active: number;
  isOpen: boolean;
  enabled: boolean;
  sharedState: CoverageState | undefined;
  onAll: () => void;
  onAvailable: () => void;
}) {
  const schedule = isOpen ? 'Abierto ahora' : 'Fuera de horario';
  return (
    <View style={styles.summary}>
      <View style={styles.metrics}>
        {[
          {
            value: communes,
            label: communes === 1 ? 'comuna' : 'comunas',
            icon: 'pin',
            onPress: onAll,
          },
          { value: active, label: 'con reparto ahora', icon: 'truck', onPress: onAvailable },
        ].map((metric) => (
          <PulsePressable
            key={metric.icon}
            accessibilityRole="button"
            accessibilityLabel={`${metric.value} ${metric.label}`}
            onPress={metric.onPress}
            style={styles.metric}
          >
            <View style={styles.metricTop}>
              <Text variant="display" style={styles.number}>
                {metric.value}
              </Text>
              <Icon
                name={metric.icon as IconName}
                size={theme.layout.tagRemove}
                color={theme.colors.lime}
              />
            </View>
            <Text variant="note" compact style={styles.onDark}>
              {metric.label}
            </Text>
          </PulsePressable>
        ))}
      </View>
      <View style={styles.status}>
        <StatusBadge compact label={schedule} icon="clock" tone={isOpen ? 'success' : 'neutral'} />
        {!enabled ? (
          <StatusBadge compact label="Negocio no habilitado" tone="warning" />
        ) : sharedState && sharedState.label !== schedule ? (
          <StatusBadge
            compact
            label={sharedState.label}
            tone={sharedState.tone}
            icon={sharedState.available ? 'check' : 'clock'}
          />
        ) : null}
      </View>
    </View>
  );
}

export function CoverageFilter({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PulsePressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={styles.filterTarget}
    >
      <View style={[styles.filter, selected && styles.selectedFilter]}>
        <Text
          variant="note"
          compact
          numberOfLines={1}
          style={selected ? styles.olive : styles.muted}
        >
          {label}
        </Text>
      </View>
    </PulsePressable>
  );
}

export function CoverageHelp() {
  return (
    <View>
      {[
        { title: 'Elige las comunas', detail: 'Cobertura → Editar comunas.', icon: 'pin' },
        {
          title: 'Vincula a tu equipo',
          detail: 'Tus conductores heredan las comunas.',
          icon: 'user',
        },
        {
          title: 'Activa la disponibilidad',
          detail: 'Con el negocio abierto, recibe ofertas.',
          icon: 'clock',
        },
      ].map((step, index, steps) => (
        <View key={step.icon} style={styles.step}>
          <View style={styles.rail}>
            <View style={styles.stepNumber}>
              <Text variant="label" compact style={styles.olive}>
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 ? <View style={styles.connector} /> : null}
          </View>
          <View style={styles.stepCopy}>
            <Text variant="label">{step.title}</Text>
            <Text variant="note" style={styles.muted}>
              {step.detail}
            </Text>
          </View>
          <View style={styles.stepIcon}>
            <Icon name={step.icon as IconName} size={theme.layout.tagRemove} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  driverDetails: { gap: theme.spacing.xl },
  communeSection: { gap: theme.spacing.compact },
  communeHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sectionLabel: { flexShrink: 1 },
  communeCount: { color: theme.colors.textMuted, fontVariant: ['tabular-nums'] },
  communeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  communeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    paddingRight: theme.spacing.compact,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
  },
  communeIcon: {
    width: theme.layout.brandHorizontal,
    height: theme.layout.brandHorizontal,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
  },
  communeName: { flexShrink: 1, color: theme.colors.primary },
  summary: {
    backgroundColor: theme.business.dark,
    borderRadius: theme.business.radius,
    overflow: 'hidden',
  },
  metrics: { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.lg },
  metric: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  number: { color: theme.business.onDark, fontVariant: ['tabular-nums'] },
  onDark: { color: theme.colors.heroMuted },
  status: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.warm,
  },
  filterTarget: { minHeight: theme.layout.touchTarget, justifyContent: 'center' },
  filter: {
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  selectedFilter: { borderColor: theme.colors.primary, backgroundColor: theme.colors.background },
  olive: { color: theme.colors.primary },
  muted: { color: theme.colors.textMuted },
  step: { flexDirection: 'row', gap: theme.spacing.compact },
  rail: { alignItems: 'center', width: theme.layout.brandMark },
  stepNumber: {
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: theme.borders.thin,
    flex: 1,
    backgroundColor: theme.colors.primary,
    marginVertical: theme.spacing.xs,
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },
  stepIcon: {
    width: theme.layout.brandStacked,
    height: theme.layout.brandStacked,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warm,
  },
});
