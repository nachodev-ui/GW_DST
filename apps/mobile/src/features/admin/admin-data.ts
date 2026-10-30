import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { ownerDocumentsSchema } from '@/shared/documents/contracts';

const count = z.number().int().nonnegative();
const counts = z.object({
  pending: count,
  approved: count,
  rejected: count,
  expiring: count,
  expired: count,
});
const ownerSchema = counts.extend({
  id: z.uuid(),
  type: z.enum(['vehicle', 'driver']),
  oldest_pending_at: z.iso.datetime({ offset: true }).nullable(),
});
const businessSchema = counts.extend({
  id: z.uuid(),
  name: z.string(),
  oldest_pending_at: z.iso.datetime({ offset: true }).nullable(),
  owners: z.array(ownerSchema),
});
const workspaceSchema = z.object({
  version: z.literal(2),
  today: z.iso.date(),
  metrics: z.object({
    pending_businesses: count,
    pending_documents: count,
    expiring_documents: count,
    expired_documents: count,
    total_businesses: count,
  }),
  next_business_ids: z.array(z.uuid()).max(5),
  businesses: z.array(businessSchema),
});
export const reviewFilterSchema = z.enum(['pending', 'all', 'expiring', 'expired']);
export type ReviewFilter = z.infer<typeof reviewFilterSchema>;
export type AdminBusiness = z.infer<typeof businessSchema>;
export type AdminOwner = z.infer<typeof ownerSchema>;

export function matchesFilter(item: z.infer<typeof counts>, filter: ReviewFilter) {
  return filter === 'all' || item[filter] > 0;
}

export function useAdminWorkspace() {
  const { session, zone } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['admin-workspace', session?.user.id],
    enabled: !!session && zone === 'admin' && focused,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('list_pending_documents', {
        p_before_at: null,
        p_before_id: null,
      });
      if (error) throw error;
      const parsed = workspaceSchema.safeParse(data);
      if (!parsed.success) throw new Error('Actualización del panel pendiente en este entorno.');
      return parsed.data;
    },
    refetchInterval: focused ? 30_000 : false,
    staleTime: 0,
  });
}

export function useAdminOwner(owner: AdminOwner, enabled: boolean) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['owner-documents', 'admin', session?.user.id, owner.type, owner.id],
    enabled,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_owner_documents', {
        p_owner_type: owner.type,
        p_owner_id: owner.id,
      });
      if (error) throw error;
      return ownerDocumentsSchema
        .extend({
          vehicle: z
            .object({
              plate: z.string(),
              make: z.string().nullable(),
              model: z.string().nullable(),
              year: z.number().nullable(),
              type: z.string().nullable(),
            })
            .nullable(),
        })
        .parse(data);
    },
    refetchInterval: enabled ? 30_000 : false,
    gcTime: 0,
  });
}
