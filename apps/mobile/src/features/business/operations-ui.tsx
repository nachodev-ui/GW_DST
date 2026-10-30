import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function OperationsMetric({
  label,
  icon,
  value,
}: {
  label: string;
  icon: IconName;
  value: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label} disponibles: ${value}`}
      style={operationsStyles.metric}
    >
      <View style={operationsStyles.row}>
        <Icon name={icon} size={theme.layout.tagRemove} />
        <Text variant="title" numberOfLines={1} style={operationsStyles.value}>
          {value}
        </Text>
      </View>
      <Text variant="note" numberOfLines={1} style={operationsStyles.muted}>
        {label}
      </Text>
    </View>
  );
}

export const operationsStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  metric: {
    flex: 1,
    minWidth: theme.spacing.none,
    padding: theme.spacing.compact,
    gap: theme.spacing.xs,
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
  },
  value: { fontVariant: ['tabular-nums'] },
  muted: { color: theme.business.muted },
  driver: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  driverDivider: {
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.business.border,
  },
  driverCopy: { flex: 1, minWidth: theme.spacing.none, gap: theme.spacing.xs },
  link: { width: 'auto', flexShrink: 0, paddingHorizontal: theme.spacing.none },
});
