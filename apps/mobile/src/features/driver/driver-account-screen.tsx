import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { SignOutButton } from '@/features/auth/zone-screen';
import { useDriverWorkspace } from '@/features/driver/offer-data';
import { driverError } from '@/features/driver/offer-contracts';
import { DriverBusinessCard, driverStyles } from '@/features/driver/driver-ui';
import { Avatar } from '@/shared/ui/avatar';
import { getDisplayName } from '@/shared/ui/display-name';
import { Button, Feedback, StatusBadge } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { Screen } from '@/shared/ui/screen';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';

export function DriverAccountScreen() {
  const { session, retry } = useAuth();
  const workspace = useDriverWorkspace();
  const name = getDisplayName(session?.user.user_metadata, session?.user.email);
  return (
    <Screen title="Mi cuenta de conductor" onBack={() => router.replace('/driver')} tabbed>
      <View style={driverStyles.section}>
        <Avatar name={name} large />
        <Text variant="title">{name}</Text>
        <Text selectable>{session?.user.email}</Text>
      </View>
      {workspace.isPending ? (
        <Skeleton rows={3} />
      ) : workspace.isError ? (
        <Feedback text={driverError(workspace.error)} error />
      ) : (
        <>
          <StatusBadge
            label={
              workspace.data.is_verified
                ? 'Conductor habilitado por Gasway'
                : 'Habilitación no activa'
            }
            icon={workspace.data.is_verified ? 'check' : 'clock'}
            tone={workspace.data.is_verified ? 'success' : 'accent'}
          />
          <DriverBusinessCard workspace={workspace.data} />
          <Text variant="note">
            La invitación del negocio y la revisión de Gasway son pasos distintos. Ser conductor no
            concede permisos para administrar la distribuidora.
          </Text>
          {workspace.data.can_manage_business ? (
            <ListRow
              title="Gestionar mi negocio"
              subtitle="Acceso por tu membresía de responsable o encargado"
              leading={<Icon name="home" />}
              onPress={() => router.push('/business')}
            />
          ) : null}
        </>
      )}
      <ListRow
        title="Disponibilidad y cobertura"
        subtitle="Configura tus comunas de reparto"
        leading={<Icon name="pin" />}
        onPress={() => router.replace('/driver-coverage')}
      />
      <ListRow
        title="Comprar como cliente"
        subtitle="Accede a tus compras sin cambiar tu habilitación de conductor"
        leading={<Icon name="orders" />}
        onPress={() => router.replace('/customer')}
      />
      <Button
        label="Actualizar mi acceso"
        variant="secondary"
        disabled={workspace.isFetching}
        onPress={() => {
          void workspace.refetch();
          void retry();
        }}
      />
      <SignOutButton discreet />
    </Screen>
  );
}
