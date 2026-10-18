import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Icon, type IconName } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

export function BottomTabBar({
  items,
}: {
  items: { label: string; icon: IconName; selected: boolean; onPress: () => void }[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {items.map((item) => (
          <PulsePressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.selected }}
            onPress={item.onPress}
            style={styles.tab}
          >
            <View style={[styles.icon, item.selected && styles.selected]}>
              <Icon
                name={item.icon}
                color={item.selected ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
            <Text
              variant="label"
              compact
              style={{ color: item.selected ? theme.colors.primary : theme.colors.textMuted }}
            >
              {item.label}
            </Text>
          </PulsePressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.background,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    paddingTop: theme.spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: theme.layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  icon: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  selected: { backgroundColor: theme.colors.primaryLight },
});
