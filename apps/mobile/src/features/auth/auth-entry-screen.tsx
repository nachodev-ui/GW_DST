import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton } from '@/features/auth/auth-ui';
import { SignOutButton } from '@/features/auth/zone-screen';
import { LoadingScreen } from '@/shared/ui/loading-screen';

export function AuthEntryScreen() {
  const { session, zone, loading, error, retry } = useAuth();
  if (error)
    return (
      <LoadingScreen
        state="error"
        title="No pudimos verificar tu acceso."
        description="Revisa la configuración y tu conexión para volver a intentarlo."
        status="No pudimos completar la verificación."
        footer={
          <>
            <ActionButton label="Reintentar" onPress={() => void retry()} />
            <SignOutButton />
          </>
        }
      />
    );
  if (loading)
    return (
      <LoadingScreen
        state="waiting"
        title="Estamos preparando tu espacio."
        description="Un momento para volver a estar en casa."
        status={session ? 'Verificando tu acceso…' : 'Revisando tu sesión…'}
        delayedDescription="Revisa tu conexión y vuelve a intentarlo. Continuaremos si la carga termina."
        onRetry={retry}
      />
    );
  return <Redirect href={!session ? '/access' : zone === 'driver' ? '/driver' : '/customer'} />;
}
