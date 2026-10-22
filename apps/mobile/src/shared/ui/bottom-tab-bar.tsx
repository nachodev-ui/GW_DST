import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { Icon, type IconName } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

type TabItem = {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  badge?: boolean;
};
export function BottomTabBar({
  items,
}: {
  items: TabItem[];
  appearance?: 'standard' | 'floating';
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.safe,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
          paddingLeft: Math.max(insets.left, theme.spacing.screen),
          paddingRight: Math.max(insets.right, theme.spacing.screen),
        },
      ]}
    >
      <View accessibilityRole="tablist" style={styles.bar}>
        {items.map((item) => (
          <Tab key={item.label} item={item} />
        ))}
      </View>
    </View>
  );
}
function Tab({ item }: { item: TabItem }) {
  const selected = useSharedValue(item.selected ? 1 : 0);
  const reduced = useReducedMotion();
  useEffect(() => {
    selected.set(
      withTiming(item.selected ? 1 : 0, { duration: reduced ? 0 : theme.motion.transition }),
    );
  }, [item.selected, reduced, selected]);
  const indicator = useAnimatedStyle(() => ({
    opacity: selected.get(),
    transform: [{ scaleX: 0.5 + selected.get() * 0.5 }],
  }));
  return (
    <PulsePressable
      haptic
      accessibilityRole="tab"
      accessibilityState={{ selected: item.selected }}
      aria-selected={item.selected}
      accessibilityLabel={item.badge ? `${item.label}, tienes pedidos en curso` : item.label}
      onPress={item.onPress}
      style={styles.tab}
    >
      <Animated.View style={[styles.indicator, indicator]} />
      <View>
        <Icon
          name={item.icon}
          filled={item.selected}
          color={item.selected ? theme.colors.primary : theme.colors.textMuted}
        />
        {item.badge ? <View style={styles.badge} /> : null}
      </View>
      <Text
        variant="label"
        compact
        style={{ color: item.selected ? theme.colors.primary : theme.colors.textMuted }}
      >
        {item.label}
      </Text>
    </PulsePressable>
  );
}
const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.background, paddingTop: theme.spacing.sm },
  bar: {
    ...theme.navigation.shadow,
    flexDirection: 'row',
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    borderRadius: theme.navigation.radius,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: theme.navigation.minHeight,
    minWidth: theme.layout.touchTarget,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: theme.spacing.none,
    right: theme.spacing.none,
    bottom: theme.spacing.none,
    left: theme.spacing.none,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.card,
  },
  badge: {
    position: 'absolute',
    right: -theme.spacing.xs,
    top: -theme.spacing.xs,
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surface,
  },
});
