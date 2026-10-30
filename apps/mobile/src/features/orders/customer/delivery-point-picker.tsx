import type { DeliveryPoint } from '@/shared/orders/delivery-point';
import { Feedback } from '@/shared/ui/components';

export interface DeliveryPointPickerProps {
  point: DeliveryPoint | null;
  suggestion: DeliveryPoint | null;
  onConfirm: (point: DeliveryPoint) => void;
}

// Keep native Maps out of the web bundle. Metro selects .native.tsx on devices.
export function DeliveryPointPicker(_props: DeliveryPointPickerProps) {
  return (
    <Feedback text="El mapa de entrega está disponible en la app Android. En web puedes ingresar tu dirección y comuna." />
  );
}
