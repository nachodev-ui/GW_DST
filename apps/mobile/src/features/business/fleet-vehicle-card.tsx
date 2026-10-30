import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import {
  isVehicleReadyToActivate,
  vehicleLabels,
  type BusinessVehicle,
} from './workspace-contracts';
import { useDocumentImage, useVehicleDocuments, vehicleFileCount } from './vehicle-documents-data';

export function FleetVehicleCard({
  vehicle,
  businessId,
  driverName,
  canEdit,
  onEdit,
  activating,
  activationPending,
  onActivate,
}: {
  vehicle: BusinessVehicle;
  businessId: string;
  driverName: string | undefined;
  canEdit: boolean;
  onEdit: () => void;
  activating: boolean;
  activationPending: boolean;
  onActivate: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const documents = useVehicleDocuments(vehicle.id);
  const photo = useDocumentImage(documents.data?.photo_path, true);
  const count = documents.data ? vehicleFileCount(documents.data) : null;
  const readyToActivate = isVehicleReadyToActivate(vehicle);
  const rejected = documents.data?.items.some(
    (item) =>
      item.status === 'rejected' &&
      !documents.data!.items.some(
        (other) => other.type === item.type && other.created_at > item.created_at,
      ),
  );
  const label = vehicle.documents_eligible
    ? 'Documentación al día'
    : rejected
      ? 'Hay archivos que corregir'
      : count === 5
        ? 'Esperando revisión'
        : 'Completa su documentación';
  const openDocuments = () => {
    setShowActions(false);
    router.push({
      pathname: '/business/vehicle-documents',
      params: { businessId, vehicleId: vehicle.id },
    });
  };
  return (
    <View style={s.card}>
      <View style={s.row}>
        {photo.data ? (
          <Image
            source={{ uri: photo.data }}
            style={s.thumbnail}
            resizeMode="cover"
            accessibilityLabel={`Vehículo ${vehicle.plate}`}
          />
        ) : (
          <View style={s.thumbnail}>
            <Icon name="truck" />
          </View>
        )}
        <View style={[s.grow, s.stack]}>
          <Text variant="subtitle">{vehicle.plate}</Text>
          <Text variant="note" numberOfLines={1} style={s.muted}>
            {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.label}
          </Text>
        </View>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Acciones de ${vehicle.plate}`}
          accessibilityHint="Documentación y datos del vehículo"
          accessibilityState={{ expanded: showActions }}
          onPress={() => setShowActions(true)}
          style={s.iconAction}
        >
          <Text variant="subtitle" accessible={false} style={s.muted}>
            ⋯
          </Text>
        </PulsePressable>
      </View>
      <View style={s.row}>
        <StatusBadge
          compact
          label={vehicleLabels[vehicle.is_busy ? 'busy' : vehicle.status]}
          tone={
            vehicle.is_busy ? 'neutral' : vehicle.status === 'available' ? 'success' : 'neutral'
          }
        />
      </View>
      <View style={s.driver}>
        <Icon name="user" size={theme.layout.tagRemoveIcon} color={theme.business.muted} />
        <Text variant="note" numberOfLines={1} style={[s.grow, s.muted]}>
          {driverName ??
            (vehicle.driver_id ? 'Revisa la afiliación del conductor' : 'Sin conductor asignado')}
        </Text>
      </View>
      <View style={s.footer}>
        <View style={[s.progress, s.grow]}>
          <View style={s.progressSummary}>
            <Text
              variant="note"
              accessibilityLabel={`${label}. ${count !== null ? `${count} de 5 requisitos con archivo` : 'Cargando avance'}`}
              style={[s.counter, s.muted]}
            >
              {count !== null ? `${count}/5` : '—/5'}
            </Text>
            <View
              style={s.rail}
              accessibilityRole="progressbar"
              accessibilityLabel="Requisitos con archivo; sujeto a aprobación"
              accessibilityValue={{
                min: 0,
                max: 5,
                ...(count !== null ? { now: count } : {}),
                text: count !== null ? `${count} de 5` : 'Sin datos',
              }}
            >
              {Array.from({ length: 5 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    s.segment,
                    count !== null && index < count && s.segmentDone,
                    vehicle.documents_eligible && s.segmentQuiet,
                  ]}
                />
              ))}
            </View>
          </View>
          {documents.isError || (!vehicle.documents_eligible && (rejected || count === 5)) ? (
            <Text
              variant="note"
              accessibilityRole={documents.isError ? 'alert' : 'text'}
              style={documents.isError || rejected ? s.error : s.muted}
            >
              {documents.isError ? 'No se pudo cargar el avance' : label}
            </Text>
          ) : null}
        </View>
        {!vehicle.documents_eligible && (count !== 5 || rejected) ? (
          <Button
            label="Documentar"
            accessibilityLabel={`${count ? 'Continuar documentación de' : 'Documentar vehículo'} ${vehicle.plate}`}
            style={s.documentAction}
            onPress={openDocuments}
          />
        ) : null}
      </View>
      {showActions ? (
        <BottomSheet visible title={vehicle.plate} onClose={() => setShowActions(false)}>
          <ScrollView contentContainerStyle={s.actions}>
            <ListRow
              title="Ver documentación"
              leading={<Icon name="orders" />}
              onPress={openDocuments}
            />
            <ListRow
              title={vehicle.is_busy ? 'En entrega · edición bloqueada' : 'Editar datos'}
              leading={<Icon name="edit" />}
              disabled={vehicle.is_busy || !canEdit || activationPending}
              onPress={() => {
                setShowActions(false);
                onEdit();
              }}
            />
            {readyToActivate ? (
              <Button
                label="Poner disponible"
                variant="secondary"
                accessibilityLabel={`Poner disponible ${vehicle.plate}`}
                loading={activating}
                disabled={!canEdit || activationPending}
                onPress={() => {
                  setShowActions(false);
                  onActivate();
                }}
              />
            ) : null}
          </ScrollView>
        </BottomSheet>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
    padding: theme.spacing.compact,
    gap: theme.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  grow: { flex: 1, minWidth: theme.spacing.none },
  stack: { gap: theme.spacing.xs },
  thumbnail: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    flexShrink: 0,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driver: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  muted: { color: theme.business.muted },
  error: { color: theme.colors.error },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.business.border,
  },
  progress: { gap: theme.spacing.xs },
  progressSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  counter: { fontVariant: ['tabular-nums'] },
  rail: {
    flexDirection: 'row',
    width: theme.documentation.thumbnailSize,
    height: theme.borders.focus,
    borderRadius: theme.radii.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.warm,
  },
  segment: { flex: 1 },
  segmentDone: { backgroundColor: theme.colors.progress },
  segmentQuiet: { backgroundColor: theme.colors.surfaceBorder },
  documentAction: {
    width: 'auto',
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
  },
  actions: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
});
