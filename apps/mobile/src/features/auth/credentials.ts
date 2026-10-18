import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().trim().pipe(z.email('Ingresa un correo válido.')),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export const registrationSchema = credentialsSchema.extend({
  password: z.string().min(8, 'Usa al menos 8 caracteres.'),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export function authErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no coinciden.';
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de ingresar.';
    case 'user_already_exists':
      return 'No pudimos crear la cuenta. Si ya tienes una, inicia sesión.';
    case 'weak_password':
      return 'Elige una contraseña más segura, de al menos 8 caracteres.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Espera unos minutos antes de volver a intentarlo.';
    default:
      return 'No pudimos completar la acción. Revisa tu conexión e inténtalo nuevamente.';
  }
}
