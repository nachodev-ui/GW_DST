import type { PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router/react-navigation';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { driverWorkspaceSchema } from './offer-contracts';
import { Screen } from '@/shared/ui/screen';
import { Button, Feedback } from '@/shared/ui/components';

export function useDriverDocumentAccess() {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['driver', session?.user.id, 'document-access'],
    enabled: !!session && focused,
    staleTime: 0,
    refetchInterval: focused ? 15_000 : false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_my_driver_workspace');
      if (error) throw error;
      return driverWorkspaceSchema.parse(data);
    },
  });
}

// Document onboarding is available before dispatch approval. This guard never grants driver access.
export function DriverDocumentAccessGuard({ children }: PropsWithChildren) {
  const { session, zone } = useAuth();
  const access = useDriverDocumentAccess();
  if (session && !access.isError && access.data?.business && access.data.application_status)
    return children;
  return (
    <Screen
      title="Mi licencia"
      onBack={() => router.replace(zone === 'driver' ? '/driver-account' : '/customer/account')}
    >
      <Feedback
        error={access.isError}
        text={
          access.isPending
            ? 'Revisando tu acceso…'
            : access.isError
              ? 'No pudimos consultar tu vinculación.'
              : 'Primero acepta la invitación de tu distribuidora y completa tus antecedentes.'
        }
      />
      {access.isError ? <Button label="Reintentar" onPress={() => void access.refetch()} /> : null}
    </Screen>
  );
}
