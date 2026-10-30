import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { readPublicEnv } from '@/shared/config/env';
import {
  ownerDocumentsSchema,
  type DocumentType,
  type DocumentVersion,
} from '@/shared/documents/contracts';
import { documentSignedUrl } from '@/shared/documents/files';
import { getSupabase } from '@/shared/supabase/client';

export const vehicleDocumentSteps = [
  {
    type: 'photo',
    title: 'Foto del vehículo',
    short: 'Foto',
    hint: 'Muestra el vehículo completo y su patente.',
  },
  {
    type: 'vehicle_registration',
    title: 'Padrón del vehículo',
    short: 'Padrón',
    hint: 'Incluye todos los datos y la patente, sin recortar.',
  },
  {
    type: 'circulation_permit',
    title: 'Permiso de circulación',
    short: 'Permiso',
    hint: 'Adjunta el permiso vigente, con su fecha visible.',
  },
  {
    type: 'technical_inspection',
    title: 'Revisión técnica',
    short: 'Revisión',
    hint: 'Fotografía el certificado completo y su vencimiento.',
  },
  {
    type: 'homologation_certificate',
    title: 'Certificado de homologación',
    short: 'Homologación',
    hint: 'Para vehículos que aún usan homologación en lugar de revisión técnica.',
  },
  {
    type: 'soap',
    title: 'SOAP',
    short: 'SOAP',
    hint: 'Adjunta el seguro obligatorio con su vigencia visible.',
  },
] as const;
export type VehicleDocumentStep = (typeof vehicleDocumentSteps)[number];
export type VehicleDocuments = ReturnType<typeof ownerDocumentsSchema.parse>;

// Project ref is public. No demo flag, role or local toggle can enable this in Project.
export function allowsDocumentTestSkip() {
  return new URL(readPublicEnv().supabaseUrl).hostname === 'xnrueexpwzvxotgwmamj.supabase.co';
}

export function useVehicleDocuments(vehicleId: string) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['owner-documents', session?.user.id, 'vehicle', vehicleId],
    enabled: !!session && !!vehicleId && focused,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_owner_documents', {
        p_owner_type: 'vehicle',
        p_owner_id: vehicleId,
      });
      if (error) throw error;
      return ownerDocumentsSchema.parse(data);
    },
    refetchInterval: focused ? 30_000 : false,
  });
}

export function useDocumentImage(path: string | null | undefined, photo = false) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['private-document-image', session?.user.id, photo, path],
    enabled: !!session && !!path && focused,
    queryFn: () => documentSignedUrl(photo ? 'vehicle-photos' : 'documents', path!),
    staleTime: 40_000,
    refetchInterval: focused ? 45_000 : false,
    gcTime: 0,
  });
}

export function versionsFor(data: VehicleDocuments, type: DocumentType) {
  return data.items
    .filter((item) => item.type === type)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function latestDocument(data: VehicleDocuments, type: DocumentType) {
  return versionsFor(data, type).find((item) => !['superseded', 'replaced'].includes(item.status));
}

export function documentFeedback(doc: DocumentVersion | undefined, today: string) {
  if (!doc) return { label: 'Falta', tone: 'neutral', icon: 'orders' } as const;
  if (doc.status === 'replaced')
    return { label: 'Envío reemplazado', tone: 'neutral', icon: 'orders' } as const;
  if (doc.status === 'superseded')
    return { label: 'Versión anterior', tone: 'neutral', icon: 'orders' } as const;
  if (doc.status === 'rejected')
    return { label: 'Rechazado · corregir', tone: 'error', icon: 'info' } as const;
  if (doc.expires_on && doc.expires_on < today)
    return {
      label: doc.status === 'approved' ? 'Aprobado · vencido' : 'Pendiente · vencido',
      tone: 'error',
      icon: 'calendar',
    } as const;
  if (doc.status === 'approved')
    return { label: 'Aprobado', tone: 'success', icon: 'check' } as const;
  return { label: 'Pendiente de revisión', tone: 'warning', icon: 'clock' } as const;
}

export function hasUsableFile(data: VehicleDocuments, type: DocumentType) {
  return data.items.some(
    (doc) =>
      doc.type === type &&
      (doc.status === 'approved' || doc.status === 'pending') &&
      (!doc.expires_on || doc.expires_on >= data.today),
  );
}

export function vehicleFileCount(data: VehicleDocuments) {
  return (
    Number(!!data.photo_path) +
    Number(hasUsableFile(data, 'vehicle_registration')) +
    Number(hasUsableFile(data, 'circulation_permit')) +
    Number(hasUsableFile(data, 'soap')) +
    Number(
      hasUsableFile(data, 'technical_inspection') ||
        hasUsableFile(data, 'homologation_certificate'),
    )
  );
}
