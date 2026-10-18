import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { styles as pageStyles } from '@/shared/ui/page';

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={orderStyles.section}>
      <Text accessibilityRole="header" style={orderStyles.heading}>
        {title}
      </Text>
      {children}
    </View>
  );
}
export function Choice({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        orderStyles.choice,
        selected && orderStyles.selected,
        (pressed || disabled) && pageStyles.dimmed,
      ]}
    >
      <Text style={[pageStyles.label, selected && orderStyles.selectedText]}>{label}</Text>
    </Pressable>
  );
}
export const orderStyles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  heading: {
    ...pageStyles.label,
    fontSize: theme.typography.sizes.subtitle,
    fontWeight: theme.typography.weights.bold,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  choice: {
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  selected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  selectedText: { color: theme.colors.onPrimary },
  total: { ...pageStyles.title, color: theme.colors.primary },
  row: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.border,
  },
  list: {
    padding: theme.spacing.lg,
    maxWidth: theme.layout.formWidth,
    width: '100%',
    alignSelf: 'center',
    gap: theme.spacing.md,
  },
  header: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
});
