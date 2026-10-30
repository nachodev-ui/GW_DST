import { Image, StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { SelectedDocumentFile } from './files';

export function SelectedDocumentPreview({
  file,
  onView,
}: {
  file: SelectedDocumentFile;
  onView: () => void;
}) {
  return (
    <View style={styles.row}>
      {file.mimeType === 'application/pdf' ? (
        <View style={styles.thumbnail}>
          <Icon name="orders" />
          <Text variant="note">PDF</Text>
        </View>
      ) : (
        <Image
          source={{ uri: file.uri }}
          style={styles.thumbnail}
          resizeMode="cover"
          accessibilityLabel={`Vista previa de ${file.name}`}
        />
      )}
      <View style={styles.info}>
        <Text variant="label" numberOfLines={2}>
          {file.name}
        </Text>
        <Text variant="note" style={styles.muted}>
          {(file.bytes.byteLength / 1024 / 1024).toFixed(2)} MB
        </Text>
      </View>
      <Button label="Ver" variant="link" onPress={onView} />
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  info: { flex: 1, minWidth: 0 },
  muted: { color: theme.colors.textMuted },
  thumbnail: {
    width: theme.documentation.thumbnailSize,
    height: theme.documentation.thumbnailSize,
    backgroundColor: theme.brand.colors.cream,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
