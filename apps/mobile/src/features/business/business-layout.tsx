import { useMemo, type PropsWithChildren } from 'react';
import { Redirect, router, useGlobalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { Feedback, RefreshButton } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { useMyBusinesses } from '@/features/business/business-data';
import { WorkspaceAccessContext } from './workspace-access';

export function BusinessMemberGuard({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const businesses = useMyBusinesses();
  const { businessId } = useGlobalSearchParams<{ businessId?: string }>();
  const focused = useIsFocused();
  const access = useMemo(
    () => ({ data: businesses.data ?? [], refetch: businesses.refetch }),
    [businesses.data, businesses.refetch],
  );
  if (!session) return <Redirect href="/" />;
  if (businesses.isPending || businesses.isError)
    return (
      <Screen title="Mi negocio" onBack={() => router.replace('/')}>
        <Feedback
          text={
            businesses.isError
              ? 'No pudimos verificar tus permisos del negocio.'
              : 'Verificando tus negocios…'
          }
          error={businesses.isError}
        />
        {businesses.isError ? (
          <RefreshButton
            label="Reintentar"
            onRefresh={() => businesses.refetch({ cancelRefetch: false })}
          />
        ) : null}
      </Screen>
    );
  if (businesses.data.length === 0) return <Redirect href="/business" />;
  if (focused && businessId && !businesses.data.some((business) => business.id === businessId))
    return <Redirect href="/business/manage" />;
  return (
    <WorkspaceAccessContext.Provider value={access}>{children}</WorkspaceAccessContext.Provider>
  );
}
