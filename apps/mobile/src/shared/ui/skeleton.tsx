import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View
      accessible
      accessibilityLabel="Cargando"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.stack}
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.circle} />
          <View style={styles.copy}>
            <View style={styles.title} />
            <View style={styles.line} />
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg, paddingVertical: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  circle: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
  },
  copy: { flex: 1, gap: theme.spacing.sm },
  title: {
    height: theme.layout.skeletonTitle,
    width: '80%',
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
  line: {
    height: theme.layout.skeletonLine,
    width: '55%',
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
});
