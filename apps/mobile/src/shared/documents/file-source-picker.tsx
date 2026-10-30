import { View } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/components';
import { theme } from '@/theme';
import { isDocumentScannerAvailable } from './scan-document';

export type DocumentSource = 'camera' | 'file' | 'scanner';
export function FileSourcePicker({
  visible,
  onClose,
  onSelect,
  allowScan = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: DocumentSource) => void;
  allowScan?: boolean;
}) {
  const scanner = allowScan && isDocumentScannerAvailable();
  return (
    <BottomSheet visible={visible} title="Adjuntar documento" onClose={onClose}>
      <View style={{ gap: theme.spacing.md }}>
        <Button
          label={scanner ? 'Escanear documento' : 'Tomar foto'}
          onPress={() => {
            onClose();
            onSelect(scanner ? 'scanner' : 'camera');
          }}
        />
        <Button
          label="Elegir archivo"
          variant="secondary"
          style={{ backgroundColor: theme.brand.colors.cream }}
          onPress={() => {
            onClose();
            onSelect('file');
          }}
        />
      </View>
    </BottomSheet>
  );
}
