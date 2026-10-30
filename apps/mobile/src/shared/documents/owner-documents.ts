import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { getSupabase } from '@/shared/supabase/client';
import { ownerDocumentsSchema, type DocumentOwner, type DocumentType } from './contracts';
import type { z } from 'zod';

export type OwnerDocuments = z.infer<typeof ownerDocumentsSchema>;

export function useOwnerDocuments(
  userId: string | undefined,
  owner: DocumentOwner,
  enabled = true,
) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['owner-documents', userId, owner.type, owner.id],
    enabled: enabled && !!userId && focused,
    staleTime: 0,
    refetchInterval: enabled && focused ? 15_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_owner_documents', {
        p_owner_type: owner.type,
        p_owner_id: owner.id,
      });
      if (error) throw error;
      return ownerDocumentsSchema.parse(data);
    },
  });
}

export function currentDocumentVersions(data: OwnerDocuments, type: DocumentType) {
  return data.items
    .filter((item) => item.type === type && !['superseded', 'replaced'].includes(item.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

export function documentVersionStatus(
  data: OwnerDocuments,
  type: DocumentType,
  expectedClass?: string | null,
) {
  const versions = currentDocumentVersions(data, type);
  const matches = (item: (typeof versions)[number]) =>
    (expectedClass === undefined || item.license_class === expectedClass) &&
    (!item.expires_on || item.expires_on >= data.today);
  const approved = versions.find((item) => item.status === 'approved' && matches(item));
  const pending = versions.find((item) => item.status === 'pending' && matches(item));
  const latest = versions[0];
  const label = approved
    ? 'Revisado y vigente'
    : pending
      ? 'En revisión de Gasway'
      : !latest
        ? 'Falta adjuntar'
        : latest.status === 'rejected'
          ? 'Necesita corrección'
          : latest.expires_on && latest.expires_on < data.today
            ? 'Documento vencido'
            : 'Actualiza el documento';
  return { latest, approved, pending, submitted: !!(approved || pending), label };
}
