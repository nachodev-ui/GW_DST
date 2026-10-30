import { z } from 'zod';

export const registrationPasswordRequirements = [
  {
    label: 'Al menos 8 caracteres',
    message: 'Usa al menos 8 caracteres.',
    check: (value: string) => Array.from(value).length >= 8,
  },
  {
    label: 'Una mayúscula (A-Z)',
    message: 'Incluye al menos una mayúscula (A-Z).',
    check: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: 'Un número',
    message: 'Incluye al menos un número.',
    check: (value: string) => /[0-9]/.test(value),
  },
] as const;

export const credentialsSchema = z.object({
  email: z.string().trim().pipe(z.email('Ingresa un correo válido.')),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export const registrationSchema = credentialsSchema.extend({
  password: z.string().superRefine((value, context) => {
    for (const requirement of registrationPasswordRequirements) {
      if (!requirement.check(value)) {
        context.addIssue({ code: 'custom', message: requirement.message });
      }
    }
  }),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const registrationPhoneDigitsSchema = z
  .string()
  .regex(/^[0-9]{8}$/, 'Ingresa los 8 dígitos que van después de +56 9.');
export const registrationPhoneSchema = registrationPhoneDigitsSchema.transform(
  (digits) => `+569${digits}`,
);

export function authRetryDelay(error: unknown) {
  if (typeof error !== 'object' || error === null) return 0;
  const code = 'code' in error ? error.code : null;
  const status = 'status' in error ? error.status : null;
  // Local pause only: Auth does not expose Retry-After through its SDK error.
  // Expiry permits another manual attempt; it does not promise server availability.
  return code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    status === 429
    ? 60_000
    : 0;
}

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
  switch (code ?? (status === 429 ? 'over_request_rate_limit' : null)) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no coinciden.';
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de ingresar.';
    case 'user_already_exists':
      return 'No pudimos crear la cuenta. Si ya tienes una, inicia sesión.';
    case 'weak_password':
      return 'Usa al menos 8 caracteres, una mayúscula (A-Z) y un número.';
    case 'over_request_rate_limit':
      return 'Hay demasiados intentos de acceso. Espera unos minutos antes de volver a intentarlo.';
    case 'over_email_send_rate_limit':
      return 'Se alcanzó el límite de envío de correos de confirmación. Inténtalo más tarde; el límite puede durar hasta una hora.';
    default:
      return 'No pudimos completar la acción. Revisa tu conexión e inténtalo nuevamente.';
  }
}
