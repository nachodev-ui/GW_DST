import { Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
export function RouteAttribution() {
  return (
    <View style={styles.label}>
      <Text
        variant="note"
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL('https://www.openstreetmap.org/fixthemap').catch(() => undefined);
        }}
      >
        Ruta OSRM · © OpenStreetMap contributors · Corregir mapa
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xs,
    borderRadius: theme.radii.control,
  },
});
