import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { Button } from './components';
import { theme } from '@/theme';
export function EmptyState({
  title,
  description,
  icon = 'home',
  action,
}: {
  title: string;
  description: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.container}>
      <View style={styles.art}>
        <Svg width="120" height="92" viewBox="0 0 120 92" aria-hidden>
          <Circle cx="60" cy="46" r="42" fill={theme.colors.primaryLight} />
          <Path
            d="M18 57 60 20l42 37M31 47v33h58V47M51 80V59h18v21"
            stroke={theme.colors.primary}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="99" cy="18" r="6" fill={theme.colors.copper} />
        </Svg>
        <View style={styles.symbol}>
          <Icon name={icon} />
        </View>
      </View>
      <Text variant="subtitle" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      <Text variant="note" style={styles.description}>
        {description}
      </Text>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.compact,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  art: { alignItems: 'center' },
  symbol: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: theme.radii.pill,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.accentLight,
  },
  center: { textAlign: 'center' },
  description: { color: theme.colors.textMuted, textAlign: 'center' },
});
