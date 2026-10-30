import type { DeliveryPoint } from '@/shared/orders/delivery-point';
import { Feedback } from '@/shared/ui/components';
export type DriverRouteMapProps = {
  destination: DeliveryPoint;
  position: (DeliveryPoint & { captured_at: string }) | null;
  route?: readonly DeliveryPoint[];
};
export function DriverRouteMap(_props: DriverRouteMapProps) {
  return <Feedback text="Abre Gasway en Android para ver la ruta." />;
}
