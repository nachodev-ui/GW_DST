import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetch } from 'expo/fetch';
import { Button, Feedback } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { documentError, type DocumentVersion } from './contracts';
import { documentBytesBase64, documentSignedUrl, type SelectedDocumentFile } from './files';
import { ImageDocumentView } from './image-document-view';
import PdfDocumentView from './pdf-document-view';

type ViewerSource = { name: string; mimeType: SelectedDocumentFile['mimeType'] } & (
  { selected: SelectedDocumentFile } | { path: string; bucket: 'documents' | 'vehicle-photos' }
);
export function useDocumentViewer() {
  const [source, setSource] = useState<ViewerSource | null>(null);
  return {
    openSelected: (file: SelectedDocumentFile) =>
      setSource({ selected: file, name: file.name, mimeType: file.mimeType }),
    openDocument: (document: DocumentVersion, title: string) =>
      setSource({
        path: document.file_path,
        bucket: 'documents',
        mimeType: document.mime_type,
        name: title,
      }),
    openPhoto: (path: string) =>
      setSource({
        path,
        bucket: 'vehicle-photos',
        mimeType: 'image/jpeg',
        name: 'Foto del vehículo',
      }),
    viewer: source ? (
      <DocumentViewer
        key={'path' in source ? source.path : source.selected.uri}
        source={source}
        onClose={() => setSource(null)}
      />
    ) : null,
  };
}
function DocumentViewer({ source, onClose }: { source: ViewerSource; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    void (async () => {
      if ('selected' in source)
        return source.mimeType === 'application/pdf'
          ? documentBytesBase64(source.selected.bytes)
          : source.selected.uri;
      const url = await documentSignedUrl(source.bucket, source.path);
      if (source.mimeType !== 'application/pdf') return url;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('No pudimos descargar el documento. Intenta nuevamente.');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024)
        throw new Error('El documento supera los 5 MB permitidos.');
      return documentBytesBase64(bytes);
    })()
      .then((value) => {
        if (current) setContent(value);
      })
      .catch((cause: unknown) => {
        if (current) setError(documentError(cause));
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [source, attempt]);
  return (
    <Modal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text variant="label" style={styles.title}>
            {source.name}
          </Text>
          <PulsePressable
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Cerrar visor"
            onPress={onClose}
          >
            <Icon name="close" />
          </PulsePressable>
        </View>
        {error ? (
          <View style={styles.message}>
            <Feedback error text={error} />
            <Button
              label="Reintentar"
              onPress={() => {
                setError('');
                setContent(null);
                setAttempt(attempt + 1);
              }}
            />
          </View>
        ) : !content ? (
          <View style={styles.message}>
            <Feedback text="Abriendo documento…" />
          </View>
        ) : source.mimeType === 'application/pdf' ? (
          <PdfDocumentView
            base64={content}
            dom={{
              style: styles.body,
              containerStyle: styles.body,
              unstable_useExpoModulesBridge: false,
            }}
          />
        ) : (
          <ImageDocumentView
            uri={content}
            label={source.name}
            onError={() => setError('No pudimos mostrar la imagen. Intenta nuevamente.')}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.brand.colors.cream },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.md,
    borderBottomWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
  },
  title: { flex: 1 },
  close: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: { padding: theme.spacing.screen, gap: theme.spacing.md },
});
