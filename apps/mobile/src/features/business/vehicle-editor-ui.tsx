import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Input, StatusBadge } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { coverageDriverLabels, type CoverageDriver } from './coverage-contracts';

export function VehicleSection({
  title,
  info,
  children,
}: PropsWithChildren<{ title: string; info?: string | undefined }>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text variant="label" accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {info ? (
          <PulsePressable
            accessibilityRole="button"
            accessibilityLabel={`Información de ${title.toLocaleLowerCase('es-CL')}`}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded(!expanded)}
            style={styles.infoAction}
          >
            <Icon name="info" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
          </PulsePressable>
        ) : null}
      </View>
      {expanded && info ? (
        <Text variant="note" style={styles.muted}>
          {info}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function VehicleInput({ label, style, ...props }: ComponentProps<typeof Input>) {
  return (
    <View style={styles.field}>
      <Text variant="note" style={styles.fieldLabel}>
        {label}
      </Text>
      <Input
        {...props}
        label={label}
        hideLabel
        style={[styles.input, style, props.error && styles.inputError]}
      />
    </View>
  );
}

export function VehicleChoices({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
        {children}
      </View>
    </ScrollView>
  );
}

export function VehicleChoice({
  label,
  icon,
  statusTone,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  icon?: IconName;
  statusTone?: 'success' | 'neutral';
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PulsePressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected, disabled && styles.disabled]}
    >
      {statusTone ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <StatusBadge compact label={label} tone={statusTone} />
        </View>
      ) : (
        <>
          {icon ? (
            <Icon
              name={icon}
              size={theme.layout.tagRemove}
              color={selected ? theme.colors.primary : theme.colors.textMuted}
            />
          ) : null}
          <Text variant="note" style={selected ? styles.olive : styles.muted}>
            {label}
          </Text>
        </>
      )}
    </PulsePressable>
  );
}

export function VehicleDriverChoice({
  driver,
  selected,
  disabled,
  onPress,
}: {
  driver?: CoverageDriver;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const name = driver?.name ?? 'Sin conductor';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1 ? `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}` : name.slice(0, 2)
  ).toLocaleUpperCase('es-CL');
  return (
    <PulsePressable
      accessibilityRole="radio"
      accessibilityLabel={driver ? `${name}, ${coverageDriverLabels[driver.status]}` : name}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={onPress}
      style={[styles.driver, selected && styles.selected, disabled && styles.disabled]}
    >
      <View accessible={false} style={styles.avatar}>
        {driver ? (
          <Text variant="note" style={styles.olive}>
            {initials}
          </Text>
        ) : (
          <Icon name="user" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
        )}
      </View>
      <View
        style={styles.driverCopy}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant="note" numberOfLines={1} style={!driver && styles.muted}>
          {name}
        </Text>
        {driver ? (
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
          />
        ) : null}
      </View>
      <View accessible={false} style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Icon name="check" size={theme.layout.tagRemoveIcon} /> : null}
      </View>
    </PulsePressable>
  );
}

export const vehicleEditorStyles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  fields: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.compact },
  column: { flex: 1, minWidth: theme.spacing.none },
  drivers: { gap: theme.spacing.xs },
  recovery: { gap: theme.spacing.sm },
});

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.spacing.lg,
  },
  sectionTitle: { color: theme.colors.text, flexShrink: 1 },
  infoAction: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    marginVertical: -theme.spacing.compact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: theme.spacing.xs },
  fieldLabel: { color: theme.colors.textMuted, fontSize: theme.business.navLabelSize },
  input: {
    minHeight: theme.layout.touchTarget,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.compact,
    borderColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.background,
  },
  inputError: { borderColor: theme.colors.error },
  choices: { flexDirection: 'row', gap: theme.spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.touchTarget,
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.xs,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.control,
  },
  selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.background },
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.touchTarget,
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.compact,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.control,
  },
  driverCopy: { flex: 1, minWidth: theme.spacing.none, gap: theme.spacing.none },
  avatar: {
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background,
  },
  radio: {
    width: theme.layout.tagRemove,
    height: theme.layout.tagRemove,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
  },
  radioSelected: { borderColor: theme.colors.primary },
  olive: { color: theme.colors.primary },
  muted: { color: theme.colors.textMuted },
  disabled: { opacity: theme.opacity.disabled },
});
