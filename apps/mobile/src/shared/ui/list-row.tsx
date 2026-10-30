import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import { Icon } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

export function ListRow({
  title,
  subtitle,
  leading,
  leadingStyle,
  trailing,
  onPress,
  disabled = false,
  highlighted = false,
  accessibilityLabel,
  showDivider = true,
  subtitleNumberOfLines,
}: {
  title: string;
  subtitle?: string;
  leading: ReactNode;
  leadingStyle?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  accessibilityLabel?: string;
  showDivider?: boolean;
  subtitleNumberOfLines?: number;
}) {
  const content = (
    <>
      <View style={[styles.leading, highlighted && styles.highlightIcon, leadingStyle]}>
        {leading}
      </View>
      <View style={styles.copy}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="note" numberOfLines={subtitleNumberOfLines} style={styles.muted}>
            {subtitle}
          </Text>
        ) : null}
        {trailing}
      </View>
      {onPress ? <Icon name="arrowRight" /> : null}
    </>
  );
  return onPress ? (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, !showDivider && styles.noDivider, highlighted && styles.highlighted]}
    >
      {content}
    </PulsePressable>
  ) : (
    <View style={[styles.row, !showDivider && styles.noDivider, highlighted && styles.highlighted]}>
      {content}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.layout.touchTarget,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
  },
  leading: {
    width: theme.layout.listIcon,
    height: theme.layout.listIcon,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, gap: theme.spacing.xs },
  muted: { color: theme.colors.textMuted },
  noDivider: { borderBottomWidth: theme.spacing.none },
  highlighted: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.card,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 0,
  },
  highlightIcon: { backgroundColor: theme.colors.background },
});
