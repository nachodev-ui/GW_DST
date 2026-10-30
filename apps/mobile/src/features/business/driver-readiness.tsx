import { RefreshControl, ScrollView, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { Avatar } from '@/shared/ui/avatar';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button, Feedback, StatusBadge } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
import { documentError, licenseClassLabels } from '@/shared/documents/contracts';
import { useOwnerDocuments, documentVersionStatus } from '@/shared/documents/owner-documents';
import { theme } from '@/theme';
import { useBusinessCoverage } from './coverage-data';
import { useBusinessVehicles } from './workspace-data';
import {
  LicenseSide,
  Requirement,
  licensePresentation,
  readinessStyles as s,
  type ReadinessState,
} from './driver-readiness-ui';

export function DriverReadinessSheet({
  businessId,
  driver,
  onClose,
}: {
  businessId: string;
  driver: { id: string; name: string };
  onClose: () => void;
}) {
  const { session } = useAuth();
  const documents = useOwnerDocuments(session?.user.id, {
    type: 'driver',
    id: driver.id,
    businessId,
  });
  const coverage = useBusinessCoverage(businessId);
  const vehicles = useBusinessVehicles(businessId);
  const current = !coverage.isError
    ? coverage.data?.drivers.find((person) => person.id === driver.id)
    : undefined;
  const vehicle = !vehicles.isError
    ? vehicles.data?.find((item) => item.driver_id === driver.id)
    : undefined;
  const data = !documents.isError ? documents.data : undefined;
  const { refreshing, refresh } = useManualRefresh(() =>
    Promise.all([documents.refetch(), coverage.refetch(), vehicles.refetch()]),
  );
  const sides = data
    ? (['driver_license_front', 'driver_license_back'] as const).map((type, index) => {
        const state = documentVersionStatus(
          data,
          type,
          index === 1 ? data.license_class : undefined,
        );
        return { type, state, presentation: licensePresentation(state, data.today) };
      })
    : [];
  const licenseState: ReadinessState = documents.isError
    ? { label: 'Sin confirmar', tone: 'error', icon: 'info' }
    : documents.isPending
      ? { label: 'Consultando', tone: 'neutral', icon: 'clock' }
      : (sides.find((side) => side.presentation.tone === 'error')?.presentation ??
        sides.find((side) => side.presentation.label === 'Vencido')?.presentation ??
        sides.find((side) => side.presentation.tone !== 'success')?.presentation ?? {
          label: 'Vigente',
          tone: 'success',
          icon: 'check',
        });
  const summary: ReadinessState = !current
    ? { label: 'Sin confirmar', tone: 'neutral', icon: 'info' }
    : current.status !== 'not_enabled'
      ? { label: 'Habilitado', tone: 'success', icon: 'check' }
      : sides.some(
            (side) => side.presentation.tone === 'error' || side.presentation.label === 'Vencido',
          )
        ? { label: 'Con observaciones', tone: 'error', icon: 'info' }
        : { label: 'Pendiente', tone: 'warning', icon: 'clock' };
  const vehicleState: ReadinessState = vehicles.isError
    ? { label: 'Sin confirmar', tone: 'error', icon: 'info' }
    : vehicles.isPending
      ? { label: 'Consultando', tone: 'neutral', icon: 'clock' }
      : !vehicle || !vehicle.documents_eligible
        ? { label: 'Pendiente', tone: 'warning', icon: 'clock' }
        : vehicle.status !== 'available'
          ? { label: 'No disponible', tone: 'neutral', icon: 'pause' }
          : { label: 'Disponible', tone: 'success', icon: 'check' };
  const dispatchState: ReadinessState = !current
    ? { label: 'Sin confirmar', tone: coverage.isError ? 'error' : 'neutral', icon: 'info' }
    : current.status === 'not_enabled'
      ? { label: 'Pendiente', tone: 'warning', icon: 'clock' }
      : current.status === 'available'
        ? { label: 'Disponible', tone: 'success', icon: 'check' }
        : current.status === 'busy'
          ? { label: 'En entrega', tone: 'neutral', icon: 'truck' }
          : { label: 'No disponible', tone: 'neutral', icon: 'pause' };
  return (
    <BottomSheet
      visible
      title="Habilitación para repartir"
      header={
        <Text variant="note" style={s.eyebrow}>
          Habilitación para repartir
        </Text>
      }
      onClose={onClose}
    >
      <ScrollView
        contentContainerStyle={s.content}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            accessibilityLabel="Actualizar habilitación"
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary, theme.colors.lime]}
            progressBackgroundColor={theme.colors.background}
          />
        }
      >
        <View style={s.identity}>
          <View style={s.identityTop}>
            <Avatar name={driver.name} large />
            <View style={s.summary} accessibilityLiveRegion="polite">
              <StatusBadge compact {...summary} />
            </View>
          </View>
          <Text variant="title" accessibilityRole="header" numberOfLines={1}>
            {driver.name}
          </Text>
        </View>
        <View style={s.requirements}>
          <Text variant="label" accessibilityRole="header" style={s.eyebrow}>
            Requisitos
          </Text>
          <Requirement
            icon="orders"
            title="Licencia"
            value={
              data?.license_class
                ? `Clase ${licenseClassLabels[data.license_class]}`
                : 'Clase pendiente'
            }
            state={licenseState}
          >
            {documents.isPending ? (
              <Feedback text="Consultando documentos…" />
            ) : documents.isError ? (
              <>
                <Feedback error text={documentError(documents.error)} />
                <Button
                  label="Reintentar documentos"
                  variant="link"
                  onPress={() => void documents.refetch()}
                />
              </>
            ) : data ? (
              <>
                <View style={s.sides}>
                  {sides.map(({ type, state, presentation }, index) => (
                    <LicenseSide
                      key={type}
                      title={index === 0 ? 'Frente' : 'Dorso'}
                      state={state}
                      presentation={presentation}
                    />
                  ))}
                </View>
                <Text variant="note" style={s.attribution}>
                  Completa: conductor · Revisa: Gasway
                </Text>
              </>
            ) : null}
          </Requirement>
          <Requirement
            icon="truck"
            title="Vehículo vinculado"
            value={
              vehicles.isPending
                ? 'Consultando…'
                : vehicles.isError
                  ? 'Sin confirmar'
                  : (vehicle?.plate ?? 'Sin vehículo')
            }
            state={vehicleState}
            plate={!!vehicle}
          >
            {vehicles.isError ? (
              <Feedback error text="No pudimos comprobar el vehículo. Desliza para actualizar." />
            ) : vehicle && !vehicle.documents_eligible ? (
              <Text variant="note" style={s.muted}>
                Documentación pendiente
              </Text>
            ) : null}
          </Requirement>
          <Requirement
            icon="navigate"
            title="Estado de reparto"
            value={
              !current
                ? 'Sin confirmar'
                : current.status === 'not_enabled'
                  ? 'Requisitos pendientes'
                  : current.status === 'busy'
                    ? 'Entrega en curso'
                    : current.status === 'available'
                      ? 'Recibe pedidos'
                      : 'Disponibilidad desactivada'
            }
            state={dispatchState}
            detail={
              !current
                ? 'Desliza para comprobar la habilitación.'
                : current.status === 'not_enabled'
                  ? 'Además de la licencia y el vehículo, Gasway debe aprobar su acceso al reparto.'
                  : current.status === 'offline'
                    ? 'El conductor activa su disponibilidad desde Inicio.'
                    : undefined
            }
          >
            {coverage.isError ? (
              <Feedback
                error
                text="No pudimos comprobar la habilitación. Desliza para actualizar."
              />
            ) : null}
          </Requirement>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
