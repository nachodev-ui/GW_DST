import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import {
  applicationFormSchema,
  type ApplicationForm,
} from '@/features/auth/driver-application-form';

export const driverApplicationSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
    decision_reason: z.string().trim().min(1).max(500).nullable(),
    requested_at: z.iso.datetime({ offset: true }),
    reviewed_at: z.iso.datetime({ offset: true }).nullable(),
    applicant_name: z.string().min(2).max(100).nullable(),
    applicant_rut: z.string().nullable(),
    applicant_phone: z.string().nullable(),
    requested_distributor_id: z.uuid().nullable(),
    requested_distributor_name: z.string().nullable(),
    invitation_id: z.uuid().nullable(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== 'pending' || (value.decision_reason === null && value.reviewed_at === null),
  )
  .refine(
    (value) =>
      value.status !== 'rejected' || (value.decision_reason !== null && value.reviewed_at !== null),
  );

export type DriverApplication = z.infer<typeof driverApplicationSchema>;

export async function fetchDriverApplication(userId: string) {
  const { data, error } = await getSupabase()
    .from('driver_applications')
    .select(
      'status, decision_reason, requested_at, reviewed_at, applicant_name, applicant_rut, applicant_phone, requested_distributor_id, requested_distributor_name, invitation_id',
    )
    .eq('driver_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data === null ? null : driverApplicationSchema.parse(data);
}

const invitationIdentity = {
  id: z.uuid(),
  distributor_id: z.uuid(),
  distributor_name: z.string().min(1).max(120),
  name: z.string().min(2).max(100),
};
export const driverInvitationSchema = z
  .object({ ...invitationIdentity, expires_at: z.iso.datetime({ offset: true }) })
  .strict();
export const acceptedDriverInvitationSchema = z
  .object({
    ...invitationIdentity,
    accepted_at: z.iso.datetime({ offset: true }),
    business_enabled: z.boolean(),
  })
  .strict();
export type AcceptedDriverInvitation = z.infer<typeof acceptedDriverInvitationSchema>;

export async function fetchDriverInvitations() {
  const { data, error } = await getSupabase().rpc('list_my_driver_invitations');
  if (error) throw error;
  return z.array(driverInvitationSchema).parse(data);
}
export async function fetchAcceptedDriverInvitation() {
  const { data, error } = await getSupabase().rpc('get_my_driver_invitation');
  if (error) throw error;
  return data === null ? null : acceptedDriverInvitationSchema.parse(data);
}
export async function acceptDriverInvitation(invitationId: string) {
  const { data, error } = await getSupabase().rpc('accept_driver_invitation', {
    p_invitation_id: z.uuid().parse(invitationId),
  });
  if (error) throw error;
  return z.uuid().parse(data);
}

export async function submitDriverApplication(values: ApplicationForm, reapply: boolean) {
  const input = applicationFormSchema.parse(values);
  const { error } = await getSupabase().rpc('submit_invited_driver_application', {
    p_name: input.name,
    p_rut: input.rut,
    p_phone: input.phone,
    p_invitation_id: input.invitation_id,
    p_reapply: reapply,
  });
  if (error) throw error;
}

export function driverApplicationError(error: unknown) {
  const parsed = z.object({ code: z.string() }).safeParse(error);
  if (parsed.success && parsed.data.code === 'GW005')
    return 'La invitación no está disponible para esta cuenta. Confirma tu correo o pide al negocio que revise el correo y el vencimiento.';
  if (parsed.success && parsed.data.code === '22023')
    return 'Revisa tus antecedentes antes de enviarlos.';
  if (parsed.success && parsed.data.code === '55000')
    return 'La invitación o la revisión cambió. Actualiza los datos; tras un rechazo necesitas una nueva invitación del negocio.';
  if (parsed.success && parsed.data.code === '42501')
    return 'No pudimos validar tu sesión. Vuelve a ingresar para continuar.';
  return 'No pudimos completar la acción. Revisa tu conexión y vuelve a intentarlo.';
}
