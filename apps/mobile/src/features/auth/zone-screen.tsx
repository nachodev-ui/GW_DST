import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Card, ui } from '@/shared/ui/components';
import { Enter } from '@/shared/ui/enter';

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
  const [applicationOpen, setApplicationOpen] = useState(false);
  const name = getDisplayName(session?.user.user_metadata, session?.user.email);
  return (
    <Screen title="Tu cuenta" compactHeader onBack={() => router.replace('/customer')} tabbed>
      <Enter>
        <LinearGradient
          colors={[theme.colors.heroStart, theme.colors.heroEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={accountStyles.identity}
        >
          <Text variant="note" style={accountStyles.eyebrow}>
            TU ESPACIO EN GASWAY
          </Text>
          <View style={accountStyles.person}>
            <Avatar name={name} />
            <View style={ui.flex}>
              <Text variant="title" accessibilityRole="header" style={accountStyles.name}>
                {name}
              </Text>
              {session?.user.email ? (
                <Text selectable variant="note" style={accountStyles.email}>
                  {session.user.email}
                </Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </Enter>
      <Enter index={1}>
        <View style={ui.stack}>
          <Text variant="subtitle" accessibilityRole="header">
            Todo para tu hogar
          </Text>
          <Card>
            <ListRow
              title="Mis pedidos"
              subtitle="Historial y pedidos en curso"
              leading={<Icon name="orders" />}
              onPress={() => router.replace('/customer/orders')}
            />
            <ListRow
              title="Pedir gas"
              subtitle="Tu próximo cilindro, paso a paso"
              leading={<Icon name="home" />}
              onPress={() => router.push('/orders/new')}
            />
          </Card>
        </View>
      </Enter>
      <Enter index={2}>
        <View style={ui.stack}>
          <Text variant="subtitle" accessibilityRole="header">
            Más con Gasway
          </Text>
          <Card>
            <ListRow
              title="Mi negocio"
              subtitle="Productos, equipo y datos de tu distribuidora"
              leading={<Icon name="home" />}
              onPress={() => router.push('/business')}
            />
            {zone === 'driver' ? (
              <ListRow
                title="Volver a reparto"
                subtitle="Tu espacio de conductor habilitado"
                leading={<Icon name="truck" />}
                onPress={() => router.replace('/driver')}
              />
            ) : (
              <ListRow
                title="Repartir con Gasway"
                subtitle="Tu invitación y estado de habilitación"
                leading={<Icon name="truck" />}
                onPress={() => setApplicationOpen(true)}
              />
            )}
          </Card>
        </View>
      </Enter>
      <Enter index={3}>
        <View style={accountStyles.signOut}>
          <SignOutButton discreet />
        </View>
      </Enter>
      <Text variant="note" style={ui.muted}>
        Lipigas, Gasco y Abastible son marcas de sus respectivos dueños. Gasway es independiente y
        no está afiliada a ellas.
      </Text>
      <BottomSheet
        visible={applicationOpen}
        title="Tu acceso a reparto"
        onClose={() => setApplicationOpen(false)}
      >
        <ScrollView contentContainerStyle={ui.stack}>
          {applicationOpen ? <DriverApplicationCard /> : null}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
const accountStyles = StyleSheet.create({
  identity: {
    ...theme.elevation.medium,
    borderRadius: theme.radii.hero,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  person: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
  name: { color: theme.colors.onPrimary },
  email: { color: theme.colors.heroMuted, marginTop: theme.spacing.sm },
  eyebrow: { color: theme.colors.heroMuted, letterSpacing: theme.typography.tracking.eyebrow },
  signOut: {
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
  },
});
