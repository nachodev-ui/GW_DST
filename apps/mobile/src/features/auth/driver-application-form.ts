import { z } from 'zod';
import { isValidRut, normalizeRut } from '@/shared/validation/rut';

export const applicationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Ingresa tu nombre completo.')
    .max(100, 'Usa hasta 100 caracteres.'),
  rut: z
    .string()
    .transform(normalizeRut)
    .refine(isValidRut, 'Revisa el RUT y su dígito verificador.'),
  phone: z
    .string()
    .transform((value) => {
      const compact = value.replace(/[\s()-]/g, '');
      return /^[2-9][0-9]{8}$/.test(compact) ? `+56${compact}` : compact;
    })
    .pipe(z.string().regex(/^\+56[2-9][0-9]{8}$/, 'Ingresa un teléfono chileno de 9 dígitos.')),
  invitation_id: z.uuid('Acepta una invitación del negocio.'),
});

export type ApplicationForm = z.infer<typeof applicationFormSchema>;
