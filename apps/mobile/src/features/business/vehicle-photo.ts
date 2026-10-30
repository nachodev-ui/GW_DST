import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { uploadPrivateFile, type SelectedDocumentFile } from '@/shared/documents/files';
import type { DocumentOwner } from '@/shared/documents/contracts';
import type { DocumentSource } from '@/shared/documents/file-source-picker';

export async function selectVehiclePhoto(
  source: Exclude<DocumentSource, 'scanner'> = 'file',
): Promise<SelectedDocumentFile | null> {
  const ImagePicker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
    throw new Error('Permite el acceso a la cámara para tomar la foto.');
  const options = {
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  } satisfies import('expo-image-picker').ImagePickerOptions;
  const selected =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (selected.canceled) return null;
  const context = ImageManipulator.manipulate(selected.assets[0]!.uri);
  context.resize({ width: 1280 });
  const rendered = await context.renderAsync();
  const output = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  try {
    const bytes =
      Platform.OS === 'web'
        ? await (await fetch(output.uri)).arrayBuffer()
        : await new File(output.uri).arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024)
      throw new Error('Elige una foto de hasta 5 MB después de comprimir.');
    return {
      uri: selected.assets[0]!.uri,
      name: 'Foto del vehículo.jpg',
      mimeType: 'image/jpeg',
      bytes,
    };
  } finally {
    context.release();
    rendered.release();
    if (Platform.OS !== 'web') new File(output.uri).delete();
  }
}

export async function pickVehiclePhoto(owner: DocumentOwner) {
  const selected = await selectVehiclePhoto();
  return selected ? uploadPrivateFile(owner, 'vehicle-photos', selected.bytes) : null;
}
