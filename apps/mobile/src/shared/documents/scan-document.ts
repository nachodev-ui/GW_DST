import { isRunningInExpoGo } from 'expo';
import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { Alert, Platform, TurboModuleRegistry, type TurboModule } from 'react-native';
import { z } from 'zod';
import { readPublicEnv } from '@/shared/config/env';
import { takeDocumentPhoto, type SelectedDocumentFile } from './files';

const maxBytes = 5 * 1024 * 1024;
const scanResponse = z.object({
  status: z.enum(['success', 'cancel']),
  scannedImages: z.array(z.string().regex(/^(file|content):\/\//)).optional(),
});

export function isDocumentScannerAvailable() {
  if ((Platform.OS !== 'android' && Platform.OS !== 'ios') || isRunningInExpoGo()) return false;
  try {
    // Capture improvement for Gasway Test only; never a documentary approval gate.
    return (
      new URL(readPublicEnv().supabaseUrl).hostname === 'xnrueexpwzvxotgwmamj.supabase.co' &&
      TurboModuleRegistry.get<TurboModule>('DocumentScanner') !== null
    );
  } catch {
    return false;
  }
}

function removeScanFile(uri: string) {
  // Delete only scanner outputs inside this app's own storage, never picked files.
  if (!uri.startsWith(Paths.cache.uri) && !uri.startsWith(Paths.document.uri)) return;
  try {
    new File(uri).delete();
  } catch {
    // A missing or already released temporary file must not block leaving the flow.
  }
}

async function offerCamera(message: string): Promise<SelectedDocumentFile | null> {
  const useCamera = await new Promise<boolean>((resolve) => {
    Alert.alert(
      'Escanear documento',
      message,
      [
        { text: 'Volver', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Usar cámara', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
  return useCamera ? takeDocumentPhoto() : null;
}

function jpegFile(uri: string, bytes: ArrayBuffer): SelectedDocumentFile {
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 3));
  if (head[0] !== 255 || head[1] !== 216 || head[2] !== 255)
    throw new Error('El escáner no entregó una imagen JPEG válida.');
  return {
    uri,
    name: 'Documento escaneado.jpg',
    mimeType: 'image/jpeg',
    bytes,
    release: () => removeScanFile(uri),
  };
}

async function prepareScan(uri: string): Promise<SelectedDocumentFile> {
  const bytes = await new File(uri).arrayBuffer();
  if (bytes.byteLength <= maxBytes) {
    const output = new File(Paths.cache, `gasway-scan-${randomUUID()}.jpg`);
    try {
      output.write(new Uint8Array(bytes));
      return jpegFile(output.uri, bytes);
    } catch (cause) {
      removeScanFile(output.uri);
      throw cause;
    }
  }

  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  try {
    const image = await context.renderAsync();
    try {
      // Keep the full resolution for small print; stop rather than compress indefinitely.
      for (const compress of [0.85, 0.7, 0.55]) {
        const output = await image.saveAsync({ format: SaveFormat.JPEG, compress });
        let keep = false;
        try {
          const compressed = await new File(output.uri).arrayBuffer();
          if (compressed.byteLength <= maxBytes) {
            const selected = jpegFile(output.uri, compressed);
            keep = true;
            return selected;
          }
        } finally {
          if (!keep) removeScanFile(output.uri);
        }
      }
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
  throw new Error('El documento supera los 5 MB después de comprimir.');
}

export async function scanDocumentFile(): Promise<SelectedDocumentFile | null> {
  if (!isDocumentScannerAvailable())
    return offerCamera('El escáner no está disponible. Puedes tomar una foto del documento.');

  let images: string[] = [];
  let fallback = 'No pudimos escanear el documento. Puedes tomar una foto o volver a intentarlo.';
  try {
    // The package enforces its TurboModule at import time. Never import it in Expo Go.
    const { default: scanner, ResponseType } = await import('react-native-document-scanner-plugin');
    const picker = await import('expo-image-picker');
    if (!(await picker.requestCameraPermissionsAsync()).granted) {
      fallback = 'Permite el acceso a la cámara o vuelve para elegir un archivo.';
      throw new Error('Camera permission denied');
    }
    const result: unknown = await scanner.scanDocument({
      maxNumDocuments: 1,
      croppedImageQuality: 100,
      responseType: ResponseType.ImageFilePath,
    });
    const parsed = scanResponse.parse(result);
    images = parsed.scannedImages ?? [];
    if (parsed.status === 'cancel' || images.length === 0) return null;
    // iOS does not enforce maxNumDocuments. Never silently discard extra pages.
    if (images.length !== 1) {
      fallback =
        'Escanea una sola página por documento. Puedes usar la cámara o volver a intentarlo.';
      throw new Error('Multiple scanned pages');
    }
    return await prepareScan(images[0]!);
  } catch {
    // Native errors may contain paths or personal data. Keep them out of UI and logs.
  } finally {
    images.forEach(removeScanFile);
  }
  return offerCamera(fallback);
}
