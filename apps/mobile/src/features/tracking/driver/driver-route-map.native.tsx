import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { runtimeMapProvider } from '@/shared/maps/runtime-provider';
import { ArtworkMapMarker } from '@/shared/maps/artwork-map-marker';
import { AnimatedVehicleMarker } from '@/shared/maps/animated-vehicle-marker';
import { useMapHeading } from '@/shared/maps/use-map-heading';
import { RouteAttribution } from '@/shared/maps/route-attribution';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import type { DriverRouteMapProps } from './driver-route-map';
export function DriverMapCanvas({
  destination,
  position,
  route,
  onExpand,
  onClose,
}: DriverRouteMapProps & { onExpand?: () => void; onClose?: () => void }) {
  const map = useRef<MapView>(null),
    [ready, setReady] = useState(false),
    touched = useRef(false),
    framed = useRef(0);
  const provider = runtimeMapProvider(),
    { heading, readHeading } = useMapHeading(map, provider === 'apple');
  const frame = useCallback(() => {
    if (!ready || !map.current) return;
    const points = route?.length
      ? [...route, destination, ...(position ? [position] : [])]
      : [destination, ...(position ? [position] : [])];
    if (points.length > 1)
      map.current.fitToCoordinates(points, {
        edgePadding: {
          top: theme.spacing.xxl,
          bottom: theme.layout.buttonHeight + theme.spacing.xxl,
          left: theme.spacing.xl,
          right: theme.spacing.xl,
        },
        animated: false,
      });
    else
      map.current.animateToRegion(
        {
          ...destination,
          latitudeDelta: theme.maps.cameraDelta,
          longitudeDelta: theme.maps.cameraDelta,
        },
        0,
      );
    framed.current = route?.length ? 3 : position ? 2 : 1;
  }, [ready, destination, position, route]);
  useEffect(() => {
    const level = route?.length ? 3 : position ? 2 : 1;
    if (!touched.current && level > framed.current) frame();
  }, [frame, route, position]);
  if (!provider) return null;
  return (
    <View style={styles.fill}>
      <MapView
        ref={map}
        {...(provider === 'google' ? { provider: PROVIDER_GOOGLE } : {})}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...destination,
          latitudeDelta: theme.maps.cameraDelta,
          longitudeDelta: theme.maps.cameraDelta,
        }}
        onMapReady={() => {
          setReady(true);
          readHeading();
        }}
        onRegionChange={() => readHeading()}
        onRegionChangeComplete={() => readHeading(true)}
        onTouchStart={() => {
          touched.current = true;
        }}
        onPanDrag={() => {
          touched.current = true;
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {route ? (
          <Polyline
            coordinates={[...route]}
            strokeColor={theme.colors.primary}
            strokeWidth={theme.borders.accent}
          />
        ) : null}
        <ArtworkMapMarker
          coordinate={destination}
          artwork="home"
          title="Punto de entrega"
          provider={provider}
        />
        {position ? (
          <AnimatedVehicleMarker
            sample={{ coordinate: position, timestampMs: Date.parse(position.captured_at) }}
            provider={provider}
            mapHeading={heading}
            title="Tu ubicación compartida"
            {...(route ? { route } : {})}
          />
        ) : null}
      </MapView>
      {provider === 'apple' && route ? <RouteAttribution /> : null}
      <View style={styles.recenter}>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Centrar toda la ruta"
          accessibilityState={{ disabled: !ready }}
          style={[styles.control, !ready && styles.disabled]}
          disabled={!ready}
          onPress={() => {
            touched.current = true;
            frame();
          }}
        >
          <Icon name="locate" />
        </PulsePressable>
      </View>
      {onExpand || onClose ? (
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={onClose ? 'Volver a tu entrega' : 'Ampliar mapa'}
          onPress={onClose ?? onExpand}
          style={[styles.control, styles.expand]}
        >
          <Icon name={onClose ? 'close' : 'expand'} />
        </PulsePressable>
      ) : null}
    </View>
  );
}
export function DriverRouteMap(props: DriverRouteMapProps) {
  const [expanded, setExpanded] = useState(false);
  const { height } = useWindowDimensions();
  const previewHeight = Math.max(
    theme.delivery.mapMinHeight,
    Math.min(theme.delivery.mapMaxHeight, height * theme.delivery.mapViewportRatio),
  );
  return (
    <>
      <View style={[styles.preview, { height: previewHeight }]}>
        {!expanded ? <DriverMapCanvas {...props} onExpand={() => setExpanded(true)} /> : null}
      </View>
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setExpanded(false)}
      >
        <SafeAreaView style={styles.fill}>
          {expanded ? <DriverMapCanvas {...props} onClose={() => setExpanded(false)} /> : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  preview: {
    borderRadius: theme.radii.card,
    overflow: 'hidden',
  },
  recenter: {
    position: 'absolute',
    right: theme.delivery.mapControlInset,
    bottom: theme.delivery.mapControlBottom,
  },
  expand: {
    position: 'absolute',
    right: theme.delivery.mapControlInset,
    top: theme.delivery.mapControlInset,
  },
  control: {
    ...theme.elevation.medium,
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: theme.opacity.disabled },
});
