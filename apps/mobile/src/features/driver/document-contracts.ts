import { z } from 'zod';
import { licenseClasses } from '@/shared/documents/contracts';
import { documentVersionStatus, type OwnerDocuments } from '@/shared/documents/owner-documents';
import { isValidRut, normalizeRut } from '@/shared/validation/rut';

export const driverDetailsSchema = z.object({
  rut: z
    .string()
    .transform(normalizeRut)
    .refine(isValidRut, 'Revisa el RUT y su dígito verificador.'),
  license: z.enum(licenseClasses, { error: 'Selecciona la clase que usarás para repartir.' }),
});
export const driverDocumentSteps = ['Tus datos', 'Frente', 'Dorso', 'Resumen'] as const;
export const driverLicenseTypes = ['driver_license_front', 'driver_license_back'] as const;

export function licenseFileStatus(data: OwnerDocuments, type: (typeof driverLicenseTypes)[number]) {
  return documentVersionStatus(
    data,
    type,
    type === 'driver_license_back' ? data.license_class : undefined,
  );
}

export function firstDriverDocumentStep(data: OwnerDocuments) {
  if (!driverDetailsSchema.safeParse({ rut: data.rut, license: data.license_class }).success)
    return 0;
  if (!licenseFileStatus(data, 'driver_license_front').submitted) return 1;
  if (!licenseFileStatus(data, 'driver_license_back').submitted) return 2;
  return 3;
}

export type DriverLicenseSubmission =
  'checking' | 'unknown' | 'incomplete' | 'in_review' | 'approved';

export function driverLicenseSubmission(data: OwnerDocuments): DriverLicenseSubmission {
  if (firstDriverDocumentStep(data) !== 3) return 'incomplete';
  return data.status === 'approved' ? 'approved' : 'in_review';
}

export const licenseSubmissionCopy: Record<
  DriverLicenseSubmission,
  { title: string; description: string; action: string }
> = {
  checking: {
    title: 'Revisando tu licencia',
    description: 'Estamos comprobando los datos y archivos que enviaste.',
    action: 'Ver mis archivos',
  },
  unknown: {
    title: 'Estado de licencia sin confirmar',
    description: 'No pudimos comprobar tus archivos. Actualiza o abre tu licencia para revisarlos.',
    action: 'Revisar mis archivos',
  },
  incomplete: {
    title: 'Completa tu licencia',
    description:
      'Completa tus datos y adjunta el frente y el dorso vigentes para la revisión de Gasway.',
    action: 'Completar mi licencia',
  },
  in_review: {
    title: 'Licencia en revisión',
    description: 'Ya recibimos tus datos y ambas caras. Gasway está revisando tu licencia.',
    action: 'Actualizar mis archivos',
  },
  approved: {
    title: 'Licencia revisada',
    description:
      'Tu licencia ya fue revisada. Actualiza tu habilitación para comprobar los demás requisitos.',
    action: 'Ver mis archivos',
  },
};

export function parseLicenseDate(value: string) {
  const [day, month, year] = value.split('/');
  return z.iso.date().safeParse(`${year}-${month}-${day}`);
}

export function formatLicenseDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}
