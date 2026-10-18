import { Stack } from 'expo-router/stack';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton, AuthPage, Feedback } from '@/features/auth/auth-ui';
import { SignOutButton } from '@/features/auth/zone-screen';

export function AuthNavigator() {
  const { session, zone, loading, error, retry } = useAuth();
  if (error)
    return (
      <AuthPage
        title="No pudimos verificar tu acceso."
        description="Revisa la configuración y tu conexión para volver a intentarlo."
      >
        <ActionButton label="Reintentar" onPress={() => void retry()} />
        <SignOutButton />
      </AuthPage>
    );
  if (loading)
    return (
      <AuthPage
        title="Estamos preparando tu espacio."
        description="Verificando tu sesión de forma segura."
      >
        <Feedback text="Un momento…" />
      </AuthPage>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="access" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && zone === 'customer'}>
        <Stack.Screen name="(customer)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && zone === 'driver'}>
        <Stack.Screen name="driver" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && zone === 'pending'}>
        <Stack.Screen name="pending" />
      </Stack.Protected>
    </Stack>
  );
}
