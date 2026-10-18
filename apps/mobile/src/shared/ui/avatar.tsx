import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { theme } from '@/theme';
import { Text } from './text';

const palette = [
  theme.colors.primary,
  theme.colors.accent,
  theme.colors.success,
  theme.colors.text,
];

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const { fontScale, width } = useWindowDimensions();
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1 ? `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}` : name.slice(0, 2)
  ).toLocaleUpperCase('es-CL');
  const hash = Array.from(name).reduce(
    (sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const size = Math.min(
    (large ? theme.layout.avatarLarge : theme.layout.avatar) * Math.max(1, fontScale),
    width - theme.spacing.screen * 2,
  );
  return (
    <View
      accessible={false}
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: palette[hash % palette.length] },
      ]}
    >
      <Text variant={large ? 'display' : 'label'} style={styles.initials}>
        {initials || 'G'}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  circle: {
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: { color: theme.colors.onPrimary },
});
