import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { getSupabase } from '@/shared/supabase/client';
import { useAuth } from '@/features/auth/auth-provider';
import { ActionButton, Feedback } from '@/features/auth/auth-ui';
import { DriverApplicationCard } from '@/features/auth/driver-application-card';
import { authErrorMessage } from '@/features/auth/credentials';
import { Feedback as CustomerFeedback } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { Avatar } from '@/shared/ui/avatar';
import { getDisplayName } from '@/shared/ui/display-name';
import { ListRow } from '@/shared/ui/list-row';
import { Icon } from '@/shared/ui/icon';
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
  const { session, zone } = useAuth();
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
      <ListRow
        title="Mi negocio"
        subtitle="Registra tu distribuidora o gestiona sus productos y repartidores"
        leading={<Icon name="home" />}
        onPress={() => router.push('/business')}
      />
      {zone === 'driver' ? (
        <ListRow
          title="Volver a reparto"
          subtitle="Tu habilitación de conductor sigue activa"
          leading={<Icon name="truck" />}
          onPress={() => router.replace('/driver')}
        />
      ) : (
        <DriverApplicationCard />
      )}
      <View style={accountStyles.signOut}>
        <SignOutButton discreet />
      </View>
      <Text variant="note" style={accountStyles.email}>
        Lipigas, Gasco y Abastible son marcas de sus respectivos dueños. Gasway es independiente y
        no está afiliada a ellas.
      </Text>
    </Screen>
  );
}

const accountStyles = StyleSheet.create({
  identity: { alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: theme.spacing.lg },
  email: { color: theme.colors.textMuted },
  signOut: { marginTop: theme.spacing.xxl },
});
