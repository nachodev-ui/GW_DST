import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/shared/ui/avatar';
import { StatusBadge } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { coverageDriverLabels, type BusinessCoverage } from './coverage-contracts';
import { invitationLabels, type TeamRow } from './team-contracts';

export function TeamTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  scrollable = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count: string }[];
  label: string;
  scrollable?: boolean;
}) {
  const tabs = (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.tabs}>
      {options.map((option) => (
        <PulsePressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityLabel={`${option.label}, ${option.count}`}
          accessibilityState={{ selected: value === option.value }}
          aria-selected={value === option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.tab,
            !scrollable && styles.equalTab,
            value === option.value && styles.selectedTab,
          ]}
        >
          <Text
            variant="label"
            compact
            numberOfLines={1}
            style={[styles.tabLabel, value === option.value ? styles.active : styles.muted]}
          >
            {option.label}
          </Text>
          <Text variant="note" compact numberOfLines={1} style={styles.count}>
            {option.count}
          </Text>
        </PulsePressable>
      ))}
    </View>
  );
  return scrollable ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {tabs}
    </ScrollView>
  ) : (
    tabs
  );
}

export function TeamPersonRow({
  person,
  driverView,
  coverage,
  onPress,
  onInfo,
}: {
  person: TeamRow;
  driverView: boolean;
  coverage: BusinessCoverage | undefined;
  onPress: () => void;
  onInfo: () => void;
}) {
  const driver = coverage?.drivers.find((entry) => entry.id === person.driver_id);
  const label = driverView
    ? !coverage
      ? 'Habilitación sin confirmar'
      : driver
        ? coverageDriverLabels[driver.status]
        : 'Vinculación por comprobar'
    : invitationLabels[person.invitation_status];
  const tone = driverView
    ? driver?.status === 'available'
      ? 'success'
      : driver?.status === 'not_enabled' || !driver
        ? 'warning'
        : 'neutral'
    : person.invitation_status === 'accepted'
      ? 'success'
      : person.invitation_status === 'pending'
        ? 'warning'
        : 'neutral';
  return (
    <View style={styles.person}>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={`${person.name}, ${person.email ?? ''}, ${label}`}
        accessibilityHint={driverView ? 'Ver habilitación' : 'Ver invitación y acciones'}
        onPress={onPress}
        style={styles.personAction}
      >
        <Avatar name={person.name} />
        <View style={styles.personCopy}>
          <Text variant="label" numberOfLines={1}>
            {person.name}
          </Text>
          {person.email ? (
            <Text variant="note" numberOfLines={1} style={styles.muted}>
              {person.email}
            </Text>
          ) : null}
          <StatusBadge compact label={label} tone={tone} />
        </View>
        {!driverView ? <Icon name="arrowRight" size={theme.layout.tagRemove} /> : null}
      </PulsePressable>
      {driverView ? (
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Detalle del vínculo de ${person.name}`}
          onPress={onInfo}
          style={styles.infoAction}
        >
          <Icon name="info" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
        </PulsePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: theme.business.navIndicator,
    borderBottomColor: theme.colors.background,
  },
  equalTab: { flex: 1, minWidth: 0 },
  selectedTab: { borderBottomColor: theme.colors.primary },
  tabLabel: { flexShrink: 1 },
  active: { color: theme.colors.primary },
  muted: { color: theme.colors.textMuted },
  count: { color: theme.colors.textMuted, fontVariant: ['tabular-nums'] },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.business.radius,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
    paddingRight: theme.spacing.xs,
  },
  personAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.compact,
    minWidth: 0,
  },
  personCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  infoAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
