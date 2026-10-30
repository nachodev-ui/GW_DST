import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton } from '@/features/auth/auth-ui';
import { SignOutButton } from '@/features/auth/zone-screen';
import { LoadingScreen } from '@/shared/ui/loading-screen';
import { useMyBusinesses } from '@/features/business/business-data';

export function AuthEntryScreen() {
  const { session, zone, loading, error, retry } = useAuth();
  const businesses = useMyBusinesses();
  const businessError = !!session && zone !== 'admin' && businesses.isError;
  const retryEntry = async () => {
    await Promise.all([retry(), session ? businesses.refetch() : Promise.resolve()]);
  };
  if (error || businessError)
    return (
      <LoadingScreen
        state="error"
        title="No pudimos verificar tu acceso."
        description="Revisa la configuración y tu conexión para volver a intentarlo."
        status="No pudimos completar la verificación."
        footer={
          <>
            <ActionButton label="Reintentar" onPress={() => void retryEntry()} />
            <SignOutButton />
          </>
        }
      />
    );
  if (loading || (!!session && zone !== 'admin' && businesses.isPending))
    return (
      <LoadingScreen
        state="waiting"
        title="Estamos preparando tu espacio."
        description="Un momento para preparar tu inicio."
        status={session ? 'Verificando tu acceso…' : 'Revisando tu sesión…'}
        delayedDescription="Revisa tu conexión y vuelve a intentarlo. Continuaremos si la carga termina."
        onRetry={retryEntry}
      />
    );
  return (
    <Redirect
      href={
        !session
          ? '/access'
          : zone === 'admin'
            ? '/admin'
            : businesses.data?.length
              ? '/business/manage'
              : zone === 'driver'
                ? '/driver'
                : '/customer'
      }
    />
  );
}
