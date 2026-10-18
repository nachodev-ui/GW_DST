import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/shared/supabase/client';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton, AuthPage, Feedback } from '@/features/auth/auth-ui';
import { authErrorMessage } from '@/features/auth/credentials';
import { Feedback as CustomerFeedback } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { Avatar } from '@/shared/ui/avatar';
import { getDisplayName } from '@/shared/ui/display-name';
import { ListRow } from '@/shared/ui/list-row';
import { Icon } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { theme } from '@/theme';

export function SignOutButton({ discreet = false }: { discreet?: boolean }) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  });
  return (
    <>
      {mutation.isError ? (
        discreet ? (
          <CustomerFeedback text={authErrorMessage(mutation.error)} error />
        ) : (
          <Feedback text={authErrorMessage(mutation.error)} error />
        )
      ) : null}
      {discreet ? (
        <ListRow
          title={mutation.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
          leading={<Icon name="logout" color={theme.colors.textMuted} />}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      ) : (
        <ActionButton
          secondary
          label={mutation.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      )}
    </>
  );
}

export function ZoneScreen() {
  const { zone, retry, session } = useAuth();
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
  if (zone === 'customer')
    return (
      <Screen title="Mi cuenta" onBack={() => router.replace('/customer')} tabbed>
        <View style={accountStyles.identity}>
          <Avatar name={getDisplayName(session?.user.user_metadata, session?.user.email)} large />
          <Text variant="display" accessibilityRole="header">
            {getDisplayName(session?.user.user_metadata, session?.user.email)}
          </Text>
          <Text selectable style={accountStyles.email}>
            {session?.user.email}
          </Text>
        </View>
        <View>
          <ListRow
            title="Mis pedidos"
            subtitle="Revisa tus pedidos y cómo van"
            leading={<Icon name="orders" />}
            onPress={() => router.replace('/customer/orders')}
          />
          <ListRow
            title="Pedir gas"
            subtitle="Elige tu próximo cilindro"
            leading={<Icon name="home" />}
            onPress={() => router.push('/orders/new')}
          />
        </View>
        <View>
          <ListRow
            highlighted
            title={request.isPending ? 'Enviando solicitud…' : 'Quiero ser repartidor'}
            subtitle="Reparte con Gasway. Solicita tu acceso aquí."
            leading={<Icon name="truck" />}
            disabled={request.isPending}
            onPress={() => request.mutate()}
          />
          {request.isPending ? <Skeleton rows={1} /> : null}
          {request.isError ? (
            <CustomerFeedback text={authErrorMessage(request.error)} error />
          ) : null}
        </View>
        <View style={accountStyles.signOut}>
          <SignOutButton discreet />
        </View>
        <Text variant="note" style={accountStyles.email}>
          Lipigas, Gasco y Abastible son marcas de sus respectivos dueños. Gasway es independiente y
          no está afiliada a ellas.
        </Text>
      </Screen>
    );
  return (
    <AuthPage title={title} description={description}>
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

const accountStyles = StyleSheet.create({
  identity: { alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  email: { color: theme.colors.textMuted },
  signOut: { marginTop: theme.spacing.xxl },
});
