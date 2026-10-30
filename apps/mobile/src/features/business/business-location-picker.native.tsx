import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { deliveryPointSchema } from '@/shared/orders/delivery-point';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button, Feedback } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { BusinessLocationPickerProps } from './business-location-picker';

export function BusinessLocationPicker({ point, disabled, onChange }: BusinessLocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState(point);
  const [ready, setReady] = useState(false);
  const provider = runtimeMapProvider();
  if (!provider)
    return <Feedback text="Mapa no disponible en esta versión. Puedes ingresar las coordenadas." />;
  return (
    <>
      <Button
        label={point ? 'Ajustar punto en el mapa' : 'Elegir punto en el mapa'}
        variant="secondary"
        disabled={disabled}
        onPress={() => {
          setCandidate(deliveryPointSchema.safeParse(point).success ? point : null);
          setReady(false);
          setOpen(true);
        }}
      />
      <BottomSheet visible={open} title="Ubicación del negocio" onClose={() => setOpen(false)}>
        <Text variant="note">
          Toca la entrada del recinto. Al confirmar, completaremos la dirección aproximada.
        </Text>
        {open ? (
          <View style={styles.map}>
            <MapView
              {...(provider === 'google' ? { provider: PROVIDER_GOOGLE } : {})}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                ...(candidate ?? { latitude: -33.45, longitude: -70.66 }),
                latitudeDelta: theme.maps.cameraDelta,
                longitudeDelta: theme.maps.cameraDelta,
              }}
              onMapReady={() => setReady(true)}
              onPress={(event) => {
                const result = deliveryPointSchema.safeParse(event.nativeEvent.coordinate);
                if (result.success) setCandidate(result.data);
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              accessibilityLabel="Selecciona la ubicación comercial"
            >
              {candidate ? (
                <Marker
                  coordinate={candidate}
                  draggable
                  onDragEnd={(event) => {
                    const result = deliveryPointSchema.safeParse(event.nativeEvent.coordinate);
                    if (result.success) setCandidate(result.data);
                  }}
                  title="Tu distribuidora"
                  pinColor={theme.colors.primary}
                />
              ) : null}
            </MapView>
          </View>
        ) : null}
        <Button
          label="Confirmar ubicación"
          disabled={!ready || !candidate}
          onPress={() => {
            if (candidate && ready) {
              onChange(candidate);
              setOpen(false);
            }
          }}
        />
      </BottomSheet>
    </>
  );
}
const styles = StyleSheet.create({
  map: { height: theme.maps.pickerHeight, borderRadius: theme.business.radius, overflow: 'hidden' },
});
