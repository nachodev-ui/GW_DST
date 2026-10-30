import type { DeliveryPoint } from '@/shared/orders/delivery-point';
import { Feedback } from '@/shared/ui/components';
import type { Coordinate } from '@/shared/maps/vehicle-motion/geometry';
import type { VehicleSample } from '@/shared/maps/vehicle-motion/vehicle-animator';

export type TrackingMapProps = {
  destination: DeliveryPoint | null;
  position: (DeliveryPoint & { captured_at: string }) | null;
  route?: readonly Coordinate[];
  routeProvider?: 'google' | 'osrm';
  vehicleHeading?: Pick<VehicleSample, 'heading' | 'headingReliable'>;
};
export function TrackingMap(_props: TrackingMapProps) {
  return <Feedback text="Abre Gasway en iOS o Android para ver el mapa de tu entrega." />;
}
