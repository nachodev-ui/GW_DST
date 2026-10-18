import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/shared/supabase/client';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton, AuthPage, Feedback } from '@/features/auth/auth-ui';
import { authErrorMessage } from '@/features/auth/credentials';

export function SignOutButton() {
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  });
  return (
    <>
      {mutation.isError ? <Feedback text={authErrorMessage(mutation.error)} error /> : null}
      <ActionButton
        secondary
        label={mutation.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        disabled={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </>
  );
}

export function ZoneScreen() {
  const { zone, retry } = useAuth();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const request = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().rpc('request_driver_access');
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['auth-access'] });
    },
  });
  const title =
    zone === 'pending'
      ? 'Tu solicitud está en revisión.'
      : zone === 'driver'
        ? 'Listo para tu próxima ruta.'
        : 'Tu espacio en Gasway.';
  const description =
    zone === 'pending'
      ? 'Recibimos tu solicitud para repartir. El equipo debe aprobar tu acceso antes de habilitar tu zona.'
      : zone === 'driver'
        ? 'Tu acceso como repartidor está aprobado. Esta zona está en preparación.'
        : 'Administra tu sesión o solicita acceso para repartir.';
  return (
    <AuthPage title={title} description={description}>
      {zone === 'customer' ? (
        <>
          <ActionButton
            secondary
            label="Volver a mis pedidos"
            onPress={() => router.replace('/customer')}
          />
          <Feedback text="¿Quieres repartir con Gasway? Envía tu solicitud para revisión." />
          <ActionButton
            label={request.isPending ? 'Enviando solicitud…' : 'Quiero ser repartidor'}
            disabled={request.isPending}
            onPress={() => request.mutate()}
          />
          {request.isError ? <Feedback text={authErrorMessage(request.error)} error /> : null}
        </>
      ) : null}
      {zone === 'pending' ? (
        <ActionButton
          label={checking ? 'Consultando…' : 'Revisar mi aprobación'}
          disabled={checking}
          onPress={() => {
            setChecking(true);
            void retry().finally(() => setChecking(false));
          }}
        />
      ) : null}
      <SignOutButton />
    </AuthPage>
  );
}
