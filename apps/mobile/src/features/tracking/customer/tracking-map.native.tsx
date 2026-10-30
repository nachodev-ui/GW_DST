import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feedback } from '@/shared/ui/components';
import { theme } from '@/theme';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { useMapHeading } from '@/shared/maps/use-map-heading';
import { RouteAttribution } from '@/shared/maps/route-attribution';
import { ArtworkMapMarker } from '@/shared/maps/artwork-map-marker';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import type { TrackingMapProps } from './tracking-map';
import { useTrackingCamera } from './use-tracking-camera';
import { VehicleMapMarker } from './vehicle-map-marker';

export function TrackingMap({
  destination,
  position,
  route,
  routeProvider = 'google',
  vehicleHeading,
}: TrackingMapProps) {
  const [ready, setReady] = useState(false);
  const { map: mapRef, onInteraction, recenter } = useTrackingCamera(ready, destination, position);
  const provider = runtimeMapProvider();
  const { heading, readHeading } = useMapHeading(mapRef, provider === 'apple');
  const compatibleRoute =
    (provider === 'google' && routeProvider === 'google') ||
    (provider === 'apple' && routeProvider === 'osrm')
      ? route
      : undefined;
  const center = destination ?? position;
  if (!provider)
    return <Feedback text="Google Maps no está disponible en esta versión de la app." />;
  if (!center) return <Feedback text="El mapa aparecerá cuando haya una ubicación disponible." />;
  return (
    <View style={styles.frame}>
      <MapView
        ref={mapRef}
        {...(provider === 'google' ? { provider: PROVIDER_GOOGLE } : {})}
        mapType="standard"
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...center,
          latitudeDelta: theme.maps.cameraDelta,
          longitudeDelta: theme.maps.cameraDelta,
        }}
        onMapReady={() => {
          setReady(true);
          readHeading();
        }}
        onRegionChange={() => readHeading()}
        onRegionChangeComplete={() => readHeading(true)}
        onTouchStart={onInteraction}
        onPanDrag={onInteraction}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsIndoorLevelPicker={false}
        accessibilityLabel="Mapa del repartidor y tu punto de entrega"
      >
        {compatibleRoute ? (
          <Polyline
            coordinates={[...compatibleRoute]}
            strokeColor={theme.colors.primary}
            strokeWidth={theme.borders.accent}
          />
        ) : null}
        {destination ? (
          <ArtworkMapMarker
            key="destination"
            artwork="home"
            provider={provider}
            coordinate={destination}
            title="Tu entrega"
            description="Tu punto de entrega"
          />
        ) : null}
        {position ? (
          <VehicleMapMarker
            key="driver"
            provider={provider}
            mapHeading={heading}
            sample={{
              coordinate: position,
              timestampMs: Date.parse(position.captured_at),
              ...vehicleHeading,
            }}
            {...(compatibleRoute ? { route: compatibleRoute } : {})}
          />
        ) : null}
      </MapView>
      {provider === 'apple' && compatibleRoute ? <RouteAttribution /> : null}
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={
          destination && position ? 'Ver ambos marcadores' : 'Centrar ubicación disponible'
        }
        disabled={!ready}
        onPress={recenter}
        style={styles.recenter}
      >
        <Icon name="pin" size={theme.spacing.screen} />
        <Text variant="label">{destination && position ? 'Ver ambos' : 'Centrar'}</Text>
      </PulsePressable>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    height: theme.maps.trackingHeight,
    overflow: 'hidden',
    backgroundColor: theme.colors.warm,
  },
  recenter: {
    position: 'absolute',
    right: theme.spacing.compact,
    bottom: theme.spacing.lg,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    ...theme.elevation.low,
  },
});
