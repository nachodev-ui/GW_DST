import { z } from 'zod';
import { brands, clpSchema, productSchema } from '@/shared/orders/contracts';

const summary = {
  order_id: z.uuid(),
  brand: z.enum(brands),
  weight_kg: productSchema.shape.weight_kg,
  quantity: z.number().int().min(1).max(99),
  exchange_empty: z.boolean(),
  commune_code: z.string().regex(/^\d{5}$/),
  commune_name: z.string().min(1),
  total_clp: clpSchema,
};
export const offerSchema = z.strictObject({
  ...summary,
  expires_at: z.iso.datetime({ offset: true }),
});
export const assignedOrderSchema = z.object({
  ...summary,
  status: z.enum(['accepted', 'on_the_way', 'delivered', 'cancelled']),
  delivery_address: z.string().min(1).max(300),
  notes: z.string().max(1000).nullable(),
});
export const settingsSchema = z.object({
  is_available: z.boolean(),
  commune_codes: z.array(z.string().regex(/^\d{5}$/)),
});
export type DriverSettings = z.infer<typeof settingsSchema>;
export type DriverOffer = z.infer<typeof offerSchema>;

export function driverProgressError(error: unknown) {
  const parsed = z.object({ code: z.string() }).safeParse(error);
  if (parsed.success && parsed.data.code === '42501')
    return 'Solo el repartidor aprobado que tiene asignado este pedido puede avanzar la entrega. Revisa tu sesión.';
  if (parsed.success && parsed.data.code === '55000')
    return 'El estado ya cambió o no permite esta acción. Actualiza el pedido y revisa el siguiente paso.';
  return 'No pudimos confirmar el cambio. Comprueba tu conexión y actualiza el pedido antes de reintentar.';
}

export function driverError(error: unknown) {
  const parsed = z.object({ code: z.string() }).safeParse(error);
  switch (parsed.success ? parsed.data.code : null) {
    case 'GW001':
      return 'Este pedido ya fue tomado por otro repartidor.';
    case 'GW002':
      return 'La oferta venció, fue rechazada o ya no está disponible.';
    case '55000':
      return 'No puedes realizar esta acción: revisa tu pedido asignado y tu disponibilidad.';
    case '42501':
      return 'Tu acceso no permite esta acción. Revisa tu sesión y aprobación.';
    case '22023':
      return 'Selecciona al menos una comuna válida para estar disponible.';
    default:
      return 'No pudimos confirmar la operación. Actualiza y revisa tu pedido asignado antes de volver a aceptar.';
  }
}
