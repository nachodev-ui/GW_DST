import { Feedback } from '@/shared/ui/components';
export type BusinessLocationPickerProps = {
  point: { latitude: number; longitude: number } | null;
  disabled: boolean;
  onChange: (point: { latitude: number; longitude: number }) => void;
};
export function BusinessLocationPicker(_props: BusinessLocationPickerProps) {
  return (
    <Feedback text="En web puedes ingresar las coordenadas. El selector de mapa está disponible en la app móvil." />
  );
}
