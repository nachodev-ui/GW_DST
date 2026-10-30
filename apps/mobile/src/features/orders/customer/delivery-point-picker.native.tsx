import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { deliveryPointSchema, type DeliveryPoint } from '@/shared/orders/delivery-point';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { ArtworkMapMarker } from '@/shared/maps/artwork-map-marker';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button, Feedback, ui } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { DeliveryPointPickerProps } from './delivery-point-picker';

// Initial camera only: never submitted as a delivery point without a user choice.
const initialCamera = { latitude: -33.45, longitude: -70.66 };

export function DeliveryPointPicker({ point, suggestion, onConfirm }: DeliveryPointPickerProps) {
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<DeliveryPoint | null>(null);
  const [ready, setReady] = useState(false);
  const provider = runtimeMapProvider();

  if (!provider)
    return <Feedback text="Google Maps no está disponible en esta versión de la app." />;

  return (
    <View style={ui.stack}>
      <Text variant="label">Punto de entrega</Text>
      <Text variant="note" style={ui.muted}>
        {point
          ? 'Punto confirmado. Si cambias la dirección o comuna, vuelve a ubicarlo.'
          : 'Ubica la entrada de tu casa o edificio. La comuna se elige en el listado oficial.'}
      </Text>
      <Button
        label={point ? 'Revisar punto en el mapa' : 'Elegir punto en el mapa'}
        variant="secondary"
        onPress={() => {
          setCandidate(point ?? suggestion);
          setReady(false);
          setOpen(true);
        }}
      />
      <BottomSheet visible={open} title="Ubica tu entrega" onClose={() => setOpen(false)}>
        <Text variant="note">
          Toca el mapa para ubicar la casa. Revisa que coincida con tu dirección.
        </Text>
        {open ? (
          <View style={styles.frame}>
            <MapView
              {...(provider === 'google' ? { provider: PROVIDER_GOOGLE } : {})}
              mapType="standard"
              style={StyleSheet.absoluteFill}
              initialRegion={{
                ...(point ?? suggestion ?? initialCamera),
                latitudeDelta: theme.maps.cameraDelta,
                longitudeDelta: theme.maps.cameraDelta,
              }}
              onMapReady={() => setReady(true)}
              onPress={(event) => {
                const parsed = deliveryPointSchema.safeParse(event.nativeEvent.coordinate);
                if (parsed.success) setCandidate(parsed.data);
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              showsIndoorLevelPicker={false}
              accessibilityLabel="Mapa para elegir el punto de entrega"
            >
              {candidate ? (
                <ArtworkMapMarker
                  key="home"
                  artwork="home"
                  provider={provider}
                  coordinate={candidate}
                  title="Tu punto de entrega"
                />
              ) : null}
            </MapView>
          </View>
        ) : null}
        <Button
          label="Confirmar este punto"
          disabled={!ready || !candidate}
          onPress={() => {
            if (!candidate || !ready) return;
            onConfirm(deliveryPointSchema.parse(candidate));
            setOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: theme.maps.pickerHeight,
    borderRadius: theme.radii.control,
    overflow: 'hidden',
    backgroundColor: theme.colors.warm,
  },
});
