import {
  AnimatedVehicleMarker,
  type AnimatedVehicleMarkerProps,
} from '@/shared/maps/animated-vehicle-marker';
export function VehicleMapMarker(props: Omit<AnimatedVehicleMarkerProps, 'title' | 'description'>) {
  return (
    <AnimatedVehicleMarker
      {...props}
      title="Tu repartidor"
      description="Vehículo de reparto Gasway"
    />
  );
}
