import { ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Feedback } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { businessError } from './business-contracts';
import { type CoverageDriver } from './coverage-contracts';
import { saveBusinessVehicle } from './workspace-data';
import {
  vehicleFormSchema,
  vehicleStates,
  vehicleLabels,
  type VehicleForm,
  type BusinessVehicle,
} from './workspace-contracts';
import {
  VehicleChoices,
  VehicleChoice,
  VehicleDriverChoice,
  VehicleInput,
  VehicleSection,
  vehicleEditorStyles as styles,
} from './vehicle-editor-ui';

export function VehicleEditor({
  businessId,
  vehicle,
  drivers,
  close,
  saved,
}: {
  businessId: string;
  vehicle: BusinessVehicle | null;
  drivers: CoverageDriver[];
  close: () => void;
  saved: () => void;
}) {
  const client = useQueryClient();
  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      plate: vehicle?.plate ?? '',
      label: vehicle?.label ?? '',
      status: vehicle?.status ?? 'inactive',
      driver_id: vehicle?.driver_id ?? '',
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
      year: vehicle?.year?.toString() ?? '',
      type: vehicle?.type ?? 'truck',
    },
  });
  const mutation = useMutation({
    mutationFn: (values: VehicleForm) => saveBusinessVehicle(businessId, vehicle, values),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['business-vehicles'] });
      saved();
    },
  });
  return (
    <BottomSheet
      visible
      title={vehicle ? 'Editar vehículo' : 'Nuevo vehículo'}
      onClose={close}
      dismissible={!mutation.isPending}
      saving={mutation.isPending}
      saveLabel={vehicle ? 'Guardar cambios' : 'Agregar vehículo'}
      compactFooter
      onSave={() => void form.handleSubmit((values) => mutation.mutate(values))()}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <VehicleSection
          title="Datos"
          info={
            vehicle?.identity_locked
              ? 'La patente está bloqueada tras su revisión. Para otra identidad registra un vehículo nuevo.'
              : undefined
          }
        >
          <View style={styles.fields}>
            <View style={styles.row}>
              <View style={styles.column}>
                <Controller
                  control={form.control}
                  name="plate"
                  render={({ field, fieldState }) => (
                    <VehicleInput
                      label="Patente"
                      placeholder="Ej.: BCDF12"
                      maxLength={12}
                      autoCapitalize="characters"
                      value={field.value}
                      onChangeText={(value) => field.onChange(value.toUpperCase())}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      editable={!mutation.isPending && !vehicle?.identity_locked}
                      accessibilityHint={
                        vehicle?.identity_locked ? 'Patente bloqueada tras su revisión' : undefined
                      }
                    />
                  )}
                />
              </View>
              <View style={styles.column}>
                <Controller
                  control={form.control}
                  name="year"
                  render={({ field, fieldState }) => (
                    <VehicleInput
                      label="Año"
                      placeholder="Ej.: 2022"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      maxLength={4}
                      keyboardType="number-pad"
                      editable={!mutation.isPending}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
            </View>
            <View style={styles.row}>
              {(['make', 'model'] as const).map((name) => (
                <View key={name} style={styles.column}>
                  <Controller
                    control={form.control}
                    name={name}
                    render={({ field, fieldState }) => (
                      <VehicleInput
                        label={name === 'make' ? 'Marca' : 'Modelo'}
                        placeholder={name === 'make' ? 'Ej.: Chevrolet' : 'Ej.: NKR'}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        maxLength={name === 'make' ? 60 : 80}
                        keyboardType="default"
                        editable={!mutation.isPending}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              ))}
            </View>
            <Controller
              control={form.control}
              name="label"
              render={({ field, fieldState }) => (
                <VehicleInput
                  label="Nombre del vehículo"
                  placeholder="Ej.: Reparto 01"
                  maxLength={80}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  editable={!mutation.isPending}
                />
              )}
            />
          </View>
        </VehicleSection>
        <VehicleSection title="Tipo">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <VehicleChoices label="Tipo de vehículo">
                {(['truck', 'pickup', 'van'] as const).map((type) => (
                  <VehicleChoice
                    key={type}
                    label={{ truck: 'Camión', pickup: 'Camioneta', van: 'Furgón' }[type]}
                    icon={type}
                    selected={field.value === type}
                    disabled={mutation.isPending}
                    onPress={() => {
                      if (!mutation.isPending) field.onChange(type);
                    }}
                  />
                ))}
              </VehicleChoices>
            )}
          />
        </VehicleSection>
        <VehicleSection
          title="Estado"
          info={
            !vehicle
              ? 'Guarda fuera de servicio y luego agrega la foto y sus documentos.'
              : undefined
          }
        >
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <VehicleChoices label="Estado de la flota">
                {vehicleStates.map((state) => (
                  <VehicleChoice
                    key={state}
                    label={vehicleLabels[state]}
                    statusTone={state === 'available' ? 'success' : 'neutral'}
                    selected={field.value === state}
                    disabled={mutation.isPending}
                    onPress={() => {
                      if (!mutation.isPending) field.onChange(state);
                    }}
                  />
                ))}
              </VehicleChoices>
            )}
          />
        </VehicleSection>
        <VehicleSection
          title="Conductor"
          info="Un conductor solo puede estar vinculado a un vehículo. No puedes modificar el vínculo durante una entrega activa."
        >
          <Controller
            control={form.control}
            name="driver_id"
            render={({ field }) => (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Conductor vinculado"
                style={styles.drivers}
              >
                <VehicleDriverChoice
                  selected={!field.value}
                  disabled={mutation.isPending}
                  onPress={() => {
                    if (!mutation.isPending) field.onChange('');
                  }}
                />
                {drivers.map((driver) => (
                  <VehicleDriverChoice
                    key={driver.id}
                    driver={driver}
                    selected={field.value === driver.id}
                    disabled={mutation.isPending}
                    onPress={() => {
                      if (!mutation.isPending) field.onChange(driver.id);
                    }}
                  />
                ))}
              </View>
            )}
          />
        </VehicleSection>
        {mutation.isError ? (
          <View style={styles.recovery}>
            <Feedback error text={businessError(mutation.error)} />
            <Button
              label="Descartar y cargar versión actual"
              variant="secondary"
              onPress={() => {
                close();
                void client.invalidateQueries({ queryKey: ['business-vehicles'] });
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
