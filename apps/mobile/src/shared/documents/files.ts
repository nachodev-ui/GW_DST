import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { getSupabase } from '@/shared/supabase/client';
import type { DocumentOwner } from './contracts';

export type SelectedDocumentFile = {
  uri: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  bytes: ArrayBuffer;
  release?: () => void;
};

export async function selectDocumentFile(): Promise<SelectedDocumentFile | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0]!;
  if (asset.size !== undefined && asset.size > 5 * 1024 * 1024)
    throw new Error('Elige un archivo de hasta 5 MB.');
  const bytes =
    Platform.OS === 'web' && asset.file
      ? await asset.file.arrayBuffer()
      : await new File(asset.uri).arrayBuffer();
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: privateFileType(bytes, 'documents').mimeType,
    bytes,
  };
}

export async function takeDocumentPhoto(): Promise<SelectedDocumentFile | null> {
  const picker = await import('expo-image-picker');
  const permission = await picker.requestCameraPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      'Permite el acceso a la cámara para tomar la foto. Puedes elegir un archivo si lo prefieres.',
    );
  const result = await picker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const bytes =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).arrayBuffer()
      : await new File(asset.uri).arrayBuffer();
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'Foto del documento.jpg',
    mimeType: privateFileType(bytes, 'documents').mimeType,
    bytes,
  };
}

export function documentBytesBase64(bytes: ArrayBuffer) {
  const parts: string[] = [];
  const data = new Uint8Array(bytes);
  for (let offset = 0; offset < data.length; offset += 8192)
    parts.push(String.fromCharCode(...data.subarray(offset, offset + 8192)));
  return btoa(parts.join(''));
}

export async function uploadDocumentFile(owner: DocumentOwner) {
  const selected = await selectDocumentFile();
  return selected ? uploadPrivateFile(owner, 'documents', selected.bytes) : null;
}

function privateFileType(bytes: ArrayBuffer, bucket: 'documents' | 'vehicle-photos') {
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024)
    throw new Error('El archivo debe pesar entre 1 byte y 5 MB.');
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => head[i] === b);
  const jpg = head[0] === 255 && head[1] === 216 && head[2] === 255;
  const pdf = String.fromCharCode(...head.slice(0, 5)) === '%PDF-';
  const ext = png ? 'png' : jpg ? 'jpg' : pdf && bucket === 'documents' ? 'pdf' : null;
  if (!ext) throw new Error('Selecciona un JPG, PNG o PDF válido. Para la foto usa JPG o PNG.');
  const mimeType = png ? 'image/png' : jpg ? 'image/jpeg' : 'application/pdf';
  return { ext, mimeType } as const;
}

export async function uploadPrivateFile(
  owner: DocumentOwner,
  bucket: 'documents' | 'vehicle-photos',
  bytes: ArrayBuffer,
) {
  const { ext, mimeType } = privateFileType(bytes, bucket);
  const path = `${owner.businessId}/${owner.type}/${owner.id}/${randomUUID()}.${ext}`;
  const { error } = await getSupabase().storage.from(bucket).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function documentSignedUrl(bucket: 'documents' | 'vehicle-photos', path: string) {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
