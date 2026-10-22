import * as Location from 'expo-location';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import type { Commune } from '@/shared/orders/contracts';

const addressSchema = z.object({
  address: z.string().trim().min(1).max(300),
  communeCode: z.string().regex(/^\d{5}$/),
});
export type DeliveryAddress = z.infer<typeof addressSchema>;
const keyFor = (userId: string) => `gasway.delivery-address.${userId}`;
export async function readSavedAddress(userId: string) {
  if (Platform.OS === 'web') return null;
  const value = await SecureStore.getItemAsync(keyFor(userId));
  if (!value) return null;
  const parsed = addressSchema.safeParse(JSON.parse(value));
  return parsed.success ? parsed.data : null;
}
export async function rememberAddress(userId: string, value: DeliveryAddress | null) {
  if (Platform.OS === 'web') return;
  if (value === null) {
    await SecureStore.deleteItemAsync(keyFor(userId));
    return;
  }
  await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(addressSchema.parse(value)), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export const normalizeCommune = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-CL');
export interface GeocodingProvider {
  locate(communes: Commune[]): Promise<Partial<DeliveryAddress>>;
}
export const nativeGeocoder: GeocodingProvider = {
  async locate(communes) {
    if (Platform.OS === 'web')
      throw new Error(
        'En la web de pruebas, escribe tu dirección y elige la comuna. La ubicación está disponible en la app móvil.',
      );
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted)
      throw new Error('No diste permiso de ubicación. Puedes ingresar tu dirección manualmente.');
    if (!(await Location.hasServicesEnabledAsync()))
      throw new Error('Activa la ubicación del teléfono o ingresa tu dirección manualmente.');
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [place] = await Location.reverseGeocodeAsync(position.coords);
    if (!place || place.isoCountryCode !== 'CL')
      throw new Error('No pudimos identificar una dirección en Chile. Escríbela manualmente.');
    // Never guess the nearest commune: only an unambiguous match against existing CUT data.
    const names = [place.district, place.city, place.subregion].filter(
      (value): value is string => !!value,
    );
    const matches = communes.filter((commune) =>
      names.some((name) => normalizeCommune(name) === normalizeCommune(commune.name)),
    );
    return {
      address: [place.street, place.streetNumber].filter(Boolean).join(' '),
      ...(matches.length === 1 ? { communeCode: matches[0]!.code } : {}),
    };
  },
};
