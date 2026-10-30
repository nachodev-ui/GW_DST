import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type ComponentRef,
} from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Marker, type MapMarker } from 'react-native-maps';
import type { DeliveryPoint } from '@/shared/orders/delivery-point';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import { normalizeHeading, SPRITE_HEADING_OFFSET } from './vehicle-motion/geometry';
import type { VehiclePose } from './vehicle-motion/vehicle-animator';

export type ArtworkMarkerHandle = { setPose: (pose: VehiclePose) => void };

const images = {
  home: require('../../../assets/maps/delivery-home.png'),
  truck: require('../../../assets/maps/delivery-truck.png'),
};

// Fixed RN Image layout avoids native custom-marker loading/capture races.
export function ArtworkMapMarker({
  coordinate,
  artwork,
  title,
  description,
  poseRef,
  provider = 'google',
  mapHeading = 0,
}: {
  coordinate: DeliveryPoint;
  artwork: keyof typeof images;
  title: string;
  description?: string;
  poseRef?: Ref<ArtworkMarkerHandle>;
  provider?: 'google' | 'apple';
  mapHeading?: number;
}) {
  const marker = useRef<MapMarker>(null);
  const lastPose = useRef<VehiclePose | null>(null);
  const image = useRef<ComponentRef<typeof Image>>(null);
  const [loaded, setLoaded] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [failed, setFailed] = useState(false);

  const applyPose = useCallback(
    (pose: VehiclePose) => {
      lastPose.current = pose;
      marker.current?.setNativeProps({
        coordinate: pose.coordinate,
        ...(!failed && provider === 'google'
          ? { rotation: normalizeHeading(pose.bearing + SPRITE_HEADING_OFFSET) }
          : {}),
      });
      if (!failed && provider === 'apple')
        image.current?.setNativeProps({
          style: {
            transform: [
              {
                rotate: `${normalizeHeading(pose.bearing + SPRITE_HEADING_OFFSET - mapHeading)}deg`,
              },
            ],
          },
        });
    },
    [failed, provider, mapHeading],
  );
  useImperativeHandle(poseRef, () => ({ setPose: applyPose }), [applyPose]);
  useEffect(() => {
    // Reapply after image load or fallback remount, even when the vehicle is stopped.
    if (lastPose.current) applyPose(lastPose.current);
  }, [applyPose, loaded]);

  useEffect(() => {
    if (!loaded || !laidOut || failed) return;
    let captureFrame: number | undefined;
    const paintFrame = requestAnimationFrame(() => {
      // Android must capture the painted image before tracksViewChanges is disabled.
      if (Platform.OS === 'android') marker.current?.redraw();
      captureFrame = requestAnimationFrame(() => setFrozen(true));
    });
    return () => {
      cancelAnimationFrame(paintFrame);
      if (captureFrame !== undefined) cancelAnimationFrame(captureFrame);
    };
  }, [loaded, laidOut, failed]);

  if (failed)
    return (
      <Marker
        key={`${artwork}:fallback`}
        ref={marker}
        coordinate={coordinate}
        title={title}
        {...(description ? { description } : {})}
        pinColor={theme.colors.primary}
      />
    );

  return (
    <Marker
      key={`${artwork}:artwork`}
      ref={marker}
      coordinate={coordinate}
      title={title}
      {...(description ? { description } : {})}
      anchor={artwork === 'home' ? theme.maps.homeAnchor : theme.maps.vehicleAnchor}
      tracksViewChanges={!frozen}
      flat={provider === 'google' && artwork === 'truck'}
      {...(provider === 'apple' && artwork === 'home'
        ? { centerOffset: theme.maps.homeCenterOffset }
        : {})}
      zIndex={artwork === 'home' ? 1 : 2}
      style={styles.canvas}
    >
      <View collapsable={false} style={styles.canvas} onLayout={() => setLaidOut(true)}>
        {!loaded ? (
          <View style={styles.placeholder}>
            <Icon name={artwork === 'home' ? 'home' : 'truck'} />
          </View>
        ) : null}
        <Image
          ref={image}
          source={images[artwork]}
          style={styles.canvas}
          resizeMode="contain"
          fadeDuration={0}
          accessible={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  canvas: { width: theme.maps.markerWidth, height: theme.maps.markerHeight },
  placeholder: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.compact,
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
