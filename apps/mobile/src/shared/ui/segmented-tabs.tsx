import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './text';
import { theme } from '@/theme';

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: {
  value: T;
  options: { value: T; label: string; count?: string | number }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.tabs}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value, disabled }}
          aria-selected={value === option.value}
          aria-disabled={disabled}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            styles.tab,
            value === option.value && styles.selected,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Text variant="label" style={value === option.value ? styles.activeText : styles.text}>
            {option.label}
            {option.count !== undefined ? ` (${option.count})` : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
  },
  tab: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: theme.layout.listIcon,
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: theme.colors.surface },
  activeText: { color: theme.colors.primary, textAlign: 'center' },
  text: { color: theme.colors.textMuted, textAlign: 'center' },
  pressed: { opacity: theme.opacity.pressed },
  disabled: { opacity: theme.opacity.disabled },
});
