import { useEffect, useRef, useState } from 'react';
import { ArtworkMapMarker, type ArtworkMarkerHandle } from './artwork-map-marker';
import type { Coordinate } from './vehicle-motion/geometry';
import { VehicleAnimator, type VehicleSample } from './vehicle-motion/vehicle-animator';
import { useForegroundScreen } from '@/shared/lifecycle/use-foreground-screen';
export type AnimatedVehicleMarkerProps = {
  sample: VehicleSample;
  route?: readonly Coordinate[];
  provider: 'google' | 'apple';
  mapHeading: number;
  title: string;
  description?: string;
};
export function AnimatedVehicleMarker({
  sample,
  route,
  provider,
  mapHeading,
  title,
  description,
}: AnimatedVehicleMarkerProps) {
  const active = useForegroundScreen(),
    marker = useRef<ArtworkMarkerHandle>(null),
    animator = useRef<VehicleAnimator | null>(null);
  const [origin] = useState(() => ({ ...sample.coordinate }));
  useEffect(() => {
    const instance = new VehicleAnimator({
      onFrame: (pose) => marker.current?.setPose(pose),
      now: () => performance.now(),
      requestFrame: requestAnimationFrame,
      cancelFrame: cancelAnimationFrame,
    });
    animator.current = instance;
    return () => {
      instance.destroy();
      animator.current = null;
    };
  }, []);
  useEffect(() => {
    animator.current?.setActive(active);
  }, [active]);
  useEffect(() => {
    animator.current?.setRoute(route);
  }, [route]);
  useEffect(() => {
    animator.current?.update(sample);
  }, [sample]);
  return (
    <ArtworkMapMarker
      poseRef={marker}
      provider={provider}
      mapHeading={mapHeading}
      coordinate={origin}
      artwork="truck"
      title={title}
      {...(description ? { description } : {})}
    />
  );
}
