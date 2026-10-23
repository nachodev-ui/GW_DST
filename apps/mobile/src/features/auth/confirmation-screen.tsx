import { useEffect, useRef, useState } from 'react';
import { useLinkingURL } from 'expo-linking';
import { router } from 'expo-router';
import { getSupabase } from '@/shared/supabase/client';
import { Button } from '@/shared/ui/components';
import { LoadingScreen } from '@/shared/ui/loading-screen';
import { confirmEmail, type ConfirmationResult } from '@/features/auth/confirmation';

const messages: Record<ConfirmationResult, string> = {
  confirmed: 'Tu correo quedó confirmado. Ya puedes continuar en Gasway.',
  invalid: 'Este enlace no es válido. Abre el correo de confirmación más reciente.',
  expired: 'Este enlace venció o ya fue utilizado. Si confirmaste tu correo, inicia sesión.',
  'sign-in':
    'Vuelve a iniciar sesión con tu correo y contraseña. Si abriste el enlace en otro equipo, regresa al teléfono donde creaste la cuenta.',
  unavailable:
    'No pudimos completar el acceso desde este enlace. Intenta iniciar sesión; si tu correo sigue sin confirmar, revisa el mensaje más reciente.',
};

export function ConfirmationScreen() {
  const url = useLinkingURL();
  const [completion, setCompletion] = useState<{
    url: string;
    result: ConfirmationResult;
  } | null>(null);
  const result = completion?.url === url ? completion.result : null;
  const confirmed = result === 'confirmed';
  const expired = result === 'expired';
  const request = useRef<{ url: string; promise: Promise<ConfirmationResult> } | null>(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    // Reuse the request when Strict Mode repeats the effect: PKCE codes are single use.
    if (request.current?.url !== url) {
      request.current = {
        url,
        promise: Promise.resolve()
          .then(() => confirmEmail(url, getSupabase().auth))
          .catch(() => 'unavailable' as const),
      };
    }
    void request.current.promise.then((next) => {
      if (active) setCompletion({ url, result: next });
    });
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <LoadingScreen
      state={
        confirmed
          ? 'success'
          : expired || result === 'sign-in'
            ? 'notice'
            : result
              ? 'error'
              : url
                ? 'waiting'
                : 'idle'
      }
      title={
        confirmed ? '¡Correo confirmado!' : expired ? 'Revisa tu enlace' : 'Confirma tu correo'
      }
      description={
        confirmed
          ? 'Gracias por confirmar tu dirección de correo.'
          : expired
            ? 'Si ya confirmaste tu correo, puedes iniciar sesión.'
            : 'Un paso más para empezar a usar Gasway.'
      }
      status={
        result
          ? messages[result]
          : url
            ? 'Estamos verificando tu confirmación…'
            : 'Abre el enlace que recibiste por correo en este teléfono.'
      }
      delayedDescription="La verificación sigue pendiente. Revisa tu conexión. Si no termina, vuelve a abrir la app e intenta iniciar sesión."
      footer={
        <Button
          label={
            confirmed ? 'Continuar en Gasway' : expired ? 'Continuar con mi cuenta' : 'Ir al inicio'
          }
          disabled={!!url && !result}
          onPress={() => router.replace('/')}
        />
      }
    />
  );
}
