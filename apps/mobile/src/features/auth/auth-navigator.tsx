import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuth } from '@/features/auth/auth-provider';
import { useRegistration } from '@/features/auth/registration';

export function AuthNavigator() {
  const { session, zone, loading, error } = useAuth();
  const pathname = usePathname();
  useEffect(() => {
    useRegistration.getState().leave(session ? '/' : pathname);
  }, [pathname, session]);
  // Keep the root navigator mounted as session/access state changes. The index
  // route owns loading/errors; confirmation stays public while PKCE completes.
  const accessReady = !loading && !error;
  const authenticated = accessReady && !!session;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/confirm" />
      <Stack.Protected guard={authenticated && zone === 'admin'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && zone !== 'admin'}>
        <Stack.Screen name="(business)" />
        <Stack.Screen name="(driver-onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={accessReady && !session}>
        <Stack.Screen name="access" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/check-email" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && zone !== 'admin'}>
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="pending" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && zone === 'driver'}>
        <Stack.Screen name="(driver)" />
      </Stack.Protected>
    </Stack>
  );
}
