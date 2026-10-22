import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import {
  useAssignedOrder,
  useDriverActions,
  useDriverSettings,
  useDriverWorkspace,
} from '@/features/driver/offer-data';
import { driverError } from '@/features/driver/offer-contracts';
import { DriverAvailability, DriverBusinessCard, driverStyles } from '@/features/driver/driver-ui';
import { Button, Feedback } from '@/shared/ui/components';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { Skeleton } from '@/shared/ui/skeleton';
import { Screen, screenStyles } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';

export function CoverageScreen() {
  const { settings } = useDriverSettings();
  const workspace = useDriverWorkspace();
  const assigned = useAssignedOrder();
  const { settings: save } = useDriverActions();
  const uncertain =
    settings.isPending ||
    settings.isError ||
    workspace.isPending ||
    workspace.isError ||
    assigned.isPending ||
    assigned.isError;
  const error = settings.error || workspace.error || assigned.error || save.error;
  return (
    <Screen
      title="Disponibilidad y cobertura"
      onBack={() => router.replace('/driver')}
      tabbed
      list={
        <FlatList
          data={settings.data?.communes ?? []}
          keyExtractor={(commune) => commune.code}
          contentContainerStyle={screenStyles.content}
          ListHeaderComponent={
            <View style={driverStyles.section}>
              {workspace.data && !workspace.isError ? (
                <DriverBusinessCard workspace={workspace.data} />
              ) : null}
              <DriverAvailability
                settings={settings.data}
                workspace={workspace.data}
                hasOrder={!!assigned.data}
                busy={save.isPending}
                uncertain={uncertain}
                onChange={(is_available) => save.mutate({ is_available })}
              />
              <Text variant="subtitle">Comunas de tu distribuidora</Text>
              <Text variant="note">Tu distribuidora administra esta cobertura.</Text>
              {error ? <Feedback text={driverError(error)} error /> : null}
              <Button
                label="Actualizar"
                variant="secondary"
                disabled={save.isPending || settings.isFetching}
                onPress={() => {
                  void settings.refetch();
                  void workspace.refetch();
                  void assigned.refetch();
                }}
              />
            </View>
          }
          ListEmptyComponent={
            settings.isPending ? (
              <Skeleton rows={3} />
            ) : settings.isError ? null : (
              <EmptyState
                icon="pin"
                title="Sin comunas de reparto"
                description="El responsable de tu distribuidora debe definir la cobertura."
              />
            )
          }
          renderItem={({ item }) => <ListRow title={item.name} leading={<Icon name="pin" />} />}
        />
      }
    />
  );
}
