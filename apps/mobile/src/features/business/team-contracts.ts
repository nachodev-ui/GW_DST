import { z } from 'zod';

export const invitationEntrySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Ingresa el nombre.')
      .max(100)
      .regex(/^[^\r\n\u0000]+$/, 'Usa un nombre en una sola línea.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingresa un correo válido.'),
  })
  .strict();
export type InvitationEntry = z.infer<typeof invitationEntrySchema>;
export const invitationBatchSchema = z
  .array(invitationEntrySchema)
  .min(1)
  .max(100)
  .refine(
    (rows) => new Set(rows.map((row) => row.email)).size === rows.length,
    'Hay correos repetidos en la planilla.',
  );
export const invitationResultSchema = z
  .object({
    id: z.uuid().nullable(),
    email: z.string(),
    result: z.enum(['new', 'created', 'existing']),
  })
  .strict();
export type InvitationResult = z.infer<typeof invitationResultSchema>;
export const teamRowSchema = z
  .object({
    invitation_id: z.uuid().nullable(),
    driver_id: z.uuid().nullable(),
    name: z.string(),
    email: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
    invitation_status: z.enum(['pending', 'accepted', 'cancelled', 'expired', 'legacy']),
    is_current: z.boolean(),
    expires_at: z.iso.datetime({ offset: true }).nullable(),
    activation_status: z
      .enum(['incomplete', 'in_review', 'enabled', 'rejected', 'suspended'])
      .nullable(),
    legacy_requested_at: z.iso.datetime({ offset: true }).nullable(),
    affiliation_confirmed: z.boolean().nullable(),
  })
  .strict();
export type TeamRow = z.infer<typeof teamRowSchema>;
export const teamPageSchema = z
  .object({ items: z.array(teamRowSchema), has_more: z.boolean() })
  .strict();
export const invitationLabels: Record<TeamRow['invitation_status'], string> = {
  pending: 'Pendiente de aceptación',
  accepted: 'Invitación aceptada',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  legacy: 'Incorporación anterior',
};
export const activationLabels = {
  incomplete: 'Antecedentes incompletos',
  in_review: 'En revisión de administración',
  enabled: 'Acceso aprobado por Gasway',
  rejected: 'Revisión rechazada',
  suspended: 'Habilitación suspendida',
};
