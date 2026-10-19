import { type PropsWithChildren } from 'react';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { Button, Feedback } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { useMyBusinesses } from '@/features/business/business-data';

export function BusinessMemberGuard({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const businesses = useMyBusinesses();
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
          <Button
            label="Reintentar"
            onPress={() => void businesses.refetch()}
            disabled={businesses.isFetching}
          />
        ) : null}
      </Screen>
    );
  if (businesses.data.length === 0) return <Redirect href="/business" />;
  return children;
}
