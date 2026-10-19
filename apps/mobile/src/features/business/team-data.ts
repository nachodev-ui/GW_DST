import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import {
  invitationBatchSchema,
  invitationResultSchema,
  teamPageSchema,
  type InvitationEntry,
} from '@/features/business/team-contracts';

export async function createDriverInvitations(
  businessId: string,
  entries: InvitationEntry[],
  preview: boolean,
) {
  const { data, error } = await getSupabase().rpc('create_driver_invitations', {
    p_distributor_id: z.uuid().parse(businessId),
    p_entries: invitationBatchSchema.parse(entries),
    p_preview: z.boolean().parse(preview),
  });
  if (error) throw error;
  return z.array(invitationResultSchema).parse(data);
}
export async function fetchDriverTeam(businessId: string, offset: number, search: string) {
  const { data, error } = await getSupabase().rpc('list_driver_team', {
    p_distributor_id: z.uuid().parse(businessId),
    p_offset: z.number().int().min(0).max(100000).parse(offset),
    p_search: z.string().max(100).parse(search),
  });
  if (error) throw error;
  return teamPageSchema.parse(data);
}
export async function cancelDriverInvitation(invitationId: string) {
  const { error } = await getSupabase().rpc('cancel_driver_invitation', {
    p_invitation_id: z.uuid().parse(invitationId),
  });
  if (error) throw error;
}
