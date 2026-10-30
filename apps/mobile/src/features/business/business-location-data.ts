import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { Commune } from '@/shared/orders/contracts';
import { deliveryPointSchema, type DeliveryPoint } from '@/shared/orders/delivery-point';

const geocodedAddressSchema = z.object({
  street: z.string().nullable().optional(),
  streetNumber: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  subregion: z.string().nullable().optional(),
  isoCountryCode: z.string().nullable().optional(),
});
export type BusinessLocationRequest = { kind: 'gps' } | { kind: 'map'; point: DeliveryPoint };
export type BusinessLocationResult = {
  point: DeliveryPoint;
  address: string;
  communeCode: string;
  notice: string;
};

async function bounded<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('La búsqueda de ubicación tardó demasiado. Vuelve a intentarlo.')),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Geocoder names are suggestions. Only a unique exact catalogue match may supply a CUT. */
export function businessAddressSuggestion(value: unknown, communes: Commune[]) {
  const parsed = geocodedAddressSchema.safeParse(value);
  if (!parsed.success || parsed.data.isoCountryCode?.toUpperCase() !== 'CL') return null;
  const place = parsed.data;
  const street = place.street?.trim();
  const address = street ? [street, place.streetNumber?.trim()].filter(Boolean).join(' ') : '';
  const normalize = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-CL')
      .trim();
  const names = [place.district, place.city, place.subregion]
    .filter((name): name is string => !!name)
    .map(normalize);
  const matches = communes.filter((commune) => names.includes(normalize(commune.name)));
  return {
    address: address.length >= 5 && address.length <= 240 ? address : '',
    communeCode: matches.length === 1 ? matches[0]!.code : '',
  };
}

export async function locateBusiness(
  request: BusinessLocationRequest,
  communes: Commune[],
): Promise<BusinessLocationResult> {
  let point: DeliveryPoint;
  if (request.kind === 'gps') {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted)
      throw new Error('Autoriza la ubicación para usar el GPS o elige el punto en el mapa.');
    if (!(await Location.hasServicesEnabledAsync()))
      throw new Error('Activa la ubicación del teléfono para usar el GPS.');
    try {
      const position = await bounded(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        15_000,
      );
      point = deliveryPointSchema.parse(position.coords);
    } catch {
      throw new Error(
        'No pudimos obtener tu ubicación. Elige el punto en el mapa o vuelve a intentarlo.',
      );
    }
  } else point = deliveryPointSchema.parse(request.point);

  const fallback: BusinessLocationResult = {
    point,
    address: '',
    communeCode: '',
    notice:
      'Punto actualizado. No pudimos identificar su dirección: escríbela y selecciona la comuna.',
  };
  if (Platform.OS === 'web')
    return {
      ...fallback,
      notice: 'Punto actualizado. En web debes completar la dirección y la comuna manualmente.',
    };
  try {
    // Android requires foreground permission even when the coordinate came from a map tap.
    if (Platform.OS === 'android') {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        return {
          ...fallback,
          notice:
            'Punto actualizado. Sin permiso de ubicación, completa la dirección y la comuna manualmente.',
        };
    }
    // One lookup per confirmed point, never per gesture, render or polling tick.
    const places = await bounded(Location.reverseGeocodeAsync(point), 8_000);
    const suggestion = businessAddressSuggestion(places[0], communes);
    if (!suggestion) return fallback;
    return {
      point,
      ...suggestion,
      notice: !suggestion.address
        ? fallback.notice
        : !suggestion.communeCode
          ? 'Dirección aproximada actualizada. Revisa el número y selecciona la comuna.'
          : 'Dirección aproximada actualizada. Revisa el número y la comuna antes de guardar.',
    };
  } catch {
    return fallback;
  }
}
