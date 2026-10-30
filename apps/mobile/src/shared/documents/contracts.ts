import { z } from 'zod';

export const ownerTypeSchema = z.enum(['vehicle', 'driver']);
export type DocumentOwner = {
  type: z.infer<typeof ownerTypeSchema>;
  id: string;
  businessId: string;
};
export const documentTypes = [
  'vehicle_registration',
  'circulation_permit',
  'technical_inspection',
  'homologation_certificate',
  'soap',
  'driver_license_front',
  'driver_license_back',
] as const;
export type DocumentType = (typeof documentTypes)[number];
export const documentLabels: Record<DocumentType, string> = {
  vehicle_registration: 'Padrón del vehículo',
  circulation_permit: 'Permiso de circulación',
  technical_inspection: 'Revisión técnica',
  homologation_certificate: 'Certificado de homologación',
  soap: 'SOAP',
  driver_license_front: 'Licencia: frente',
  driver_license_back: 'Licencia: dorso',
};
export const licenseClasses = ['B', 'A2_legacy', 'A4', 'A5'] as const;
export const licenseClassLabels = {
  B: 'B',
  A2_legacy: 'A2 antigua (Ley 18.290)',
  A4: 'A4',
  A5: 'A5',
};
export const requiresExpiry = (type: DocumentType) =>
  !(['vehicle_registration', 'driver_license_front'] as DocumentType[]).includes(type);
export const documentSchema = z.object({
  id: z.uuid(),
  vehicle_id: z.uuid().nullable(),
  driver_id: z.uuid().nullable(),
  type: z.enum(documentTypes),
  status: z.enum(['pending', 'approved', 'rejected', 'superseded', 'replaced']),
  file_path: z.string(),
  mime_type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
  expires_on: z.iso.date().nullable(),
  license_class: z.enum(licenseClasses).nullable(),
  submitted_by: z.uuid(),
  reviewed_by: z.uuid().nullable(),
  reviewed_at: z.iso.datetime({ offset: true }).nullable(),
  rejection_reason: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
export type DocumentVersion = z.infer<typeof documentSchema>;
export const ownerDocumentsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  today: z.iso.date(),
  items: z.array(documentSchema),
  identity_locked: z.boolean(),
  rut: z.string().nullable(),
  license_class: z.enum(licenseClasses).nullable(),
  photo_path: z.string().nullable(),
});
export const documentStatusLabels = {
  pending: 'Pendiente de revisión',
  approved: 'Documentos revisados',
  rejected: 'Requiere corrección',
  superseded: 'Versión anterior',
  replaced: 'Envío reemplazado',
};
export function expiryLabel(expires: string | null, today: string) {
  if (!expires) return null;
  if (expires < today) return `Vencido el ${expires}`;
  const days = (Date.parse(`${expires}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000;
  return `${days <= 30 ? 'Por vencer' : 'Vigente hasta'}: ${expires}`;
}
export function documentError(error: unknown) {
  const result = z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .safeParse(error);
  if (result.success) {
    if (result.data.code === 'GD001')
      return 'El conductor necesita su licencia vigente y revisada por administración.';
    if (result.data.code === 'GD002')
      return 'Vincula un vehículo disponible con foto y documentos vigentes revisados.';
    if (result.data.code === '42501')
      return 'No tienes permiso para esta acción. No puedes revisar tus propias cargas.';
    if (result.data.code === '23505')
      return 'El archivo ya se registró o la patente está en uso. Actualiza los datos.';
    if (result.data.code === '22023' || result.data.code === '23514')
      return 'Revisa los datos, la fecha y la identidad. El RUT y la patente quedan bloqueados tras la primera aprobación.';
    if (result.data.code === '55000' || result.data.code === '40001')
      return 'El registro cambió o tiene una entrega activa. Actualiza antes de continuar.';
  }
  if (error instanceof Error) return error.message;
  return 'No pudimos completar la acción. Actualiza e intenta nuevamente.';
}
