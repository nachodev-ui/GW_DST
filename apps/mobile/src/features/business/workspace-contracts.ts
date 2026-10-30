import { z } from 'zod';
import { deliveryPointSchema } from '@/shared/orders/delivery-point';

const coordinateText = z
  .string()
  .trim()
  .transform((value) => value.replace(',', '.'));
export function businessPointFromFields(latitude: string, longitude: string) {
  const lat = coordinateText.parse(latitude),
    lng = coordinateText.parse(longitude);
  if (!lat || !lng) return null;
  const parsed = deliveryPointSchema.safeParse({ latitude: Number(lat), longitude: Number(lng) });
  return parsed.success ? parsed.data : null;
}

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const salesPeriods = ['today', 'week', 'month'] as const;
export type SalesPeriod = (typeof salesPeriods)[number];
export const salesPeriodLabels: Record<SalesPeriod, string> = {
  today: 'Hoy',
  week: '7 días',
  month: 'Este mes',
};
export const saleSchema = z.object({
  id: z.uuid(),
  delivered_at: z.iso.datetime({ offset: true }),
  total_clp: amount,
  quantity: z.number().int().positive(),
  brand: z.string(),
  weight_kg: z.number().int(),
  cost_clp: amount.nullable(),
  cost_revision: z.number().int().nonnegative(),
});
export type BusinessSale = z.infer<typeof saleSchema>;
export const dashboardSchema = z.object({
  server_now: z.iso.datetime({ offset: true }),
  period_start: z.iso.datetime({ offset: true }),
  revenue_clp: amount,
  cost_clp: amount,
  margin_clp: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  delivered_count: amount,
  costed_count: amount,
  cylinder_count: amount,
  active_count: amount,
  waiting_count: amount,
  days: z.array(z.object({ day: z.iso.date(), revenue_clp: amount, delivered_count: amount })),
});
export const salesPageSchema = z.object({ items: z.array(saleSchema), has_more: z.boolean() });

const optionalText = (max: number) => z.string().trim().max(max);
export const profileFormSchema = z
  .object({
    display_name: z.string().trim().min(2, 'Ingresa el nombre comercial.').max(120),
    description: optionalText(500),
    address: optionalText(240),
    commune_code: z.union([z.literal(''), z.string().regex(/^\d{5}$/)]),
    latitude: coordinateText,
    longitude: coordinateText,
  })
  .superRefine((value, ctx) => {
    if (value.address && value.address.length < 5)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Ingresa una dirección de al menos 5 caracteres.',
      });
    if (!!value.address !== !!value.commune_code)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Completa la dirección y selecciona su comuna.',
      });
    const lat = Number(value.latitude),
      lng = Number(value.longitude);
    if (
      (value.latitude === '') !== (value.longitude === '') ||
      (value.latitude !== '' &&
        (!Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Ingresa ambas coordenadas válidas o deja ambas vacías.',
      });
    if (value.latitude !== '' && !value.address)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Agrega la dirección y comuna de esta ubicación.',
      });
  });
export type BusinessProfileForm = z.infer<typeof profileFormSchema>;
export const businessProfileSchema = z.object({
  display_name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  commune_code: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  logo_path: z.string().nullable(),
  cover_path: z.string().nullable(),
  revision: z.number().int().nonnegative(),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export const vehicleStates = ['available', 'maintenance', 'inactive'] as const;
export const vehicleLabels = {
  available: 'Disponible',
  maintenance: 'En mantención',
  inactive: 'Fuera de servicio',
  busy: 'En reparto',
};
export const vehicleFormSchema = z.object({
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .regex(
          /^([A-Z]{2}[0-9]{4}|[BCDFGHJKLPRSTVWXYZ]{4}[0-9]{2})$/,
          'Usa una patente como BCDF12 o AB1234.',
        ),
    ),
  label: z.string().trim().min(2, 'Ingresa el nombre del vehículo.').max(80),
  status: z.enum(vehicleStates),
  driver_id: z.union([z.literal(''), z.uuid()]),
  make: z.string().trim().min(1, 'Ingresa la marca.').max(60),
  model: z.string().trim().min(1, 'Ingresa el modelo.').max(80),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Ingresa un año de cuatro dígitos.')
    .refine(
      (v) => Number(v) >= 1900 && Number(v) <= new Date().getFullYear() + 1,
      'Revisa el año del vehículo.',
    ),
  type: z.enum(['truck', 'pickup', 'van']),
});
export type VehicleForm = z.infer<typeof vehicleFormSchema>;
export const vehicleSchema = z.object({
  id: z.uuid(),
  plate: z.string(),
  label: z.string(),
  status: z.enum(vehicleStates),
  driver_id: z.uuid().nullable(),
  revision: z.number().int().positive(),
  is_busy: z.boolean(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().int().nullable(),
  type: z.enum(['truck', 'pickup', 'van']).nullable(),
  photo_path: z.string().nullable(),
  documents_eligible: z.boolean(),
  identity_locked: z.boolean(),
});
export type BusinessVehicle = z.infer<typeof vehicleSchema>;

export function isVehicleReadyToActivate(vehicle: BusinessVehicle) {
  return vehicle.documents_eligible && vehicle.status === 'inactive' && !vehicle.is_busy;
}
export const costFormSchema = z.object({
  cost: z
    .string()
    .regex(/^\d+$/, 'Ingresa el costo total en pesos enteros.')
    .refine((value) => Number(value) <= 2147483647, 'El máximo es $2.147.483.647.'),
});
