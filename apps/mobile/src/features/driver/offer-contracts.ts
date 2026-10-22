import { z } from 'zod';
import { brands, clpSchema, communeSchema, productSchema } from '@/shared/orders/contracts';

const summary = {
  order_id: z.uuid(),
  brand: z.enum(brands),
  weight_kg: productSchema.shape.weight_kg,
  variant: productSchema.shape.variant,
  quantity: z.number().int().min(1).max(99),
  exchange_empty: z.boolean(),
  returned_brand: z
    .enum([...brands, 'unknown'])
    .nullable()
    .default(null),
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
  communes: z.array(communeSchema),
});
export type DriverSettings = z.infer<typeof settingsSchema>;
export type DriverOffer = z.infer<typeof offerSchema>;

export const driverWorkspaceSchema = z
  .object({
    is_verified: z.boolean(),
    application_status: z.enum(['pending', 'approved', 'rejected']).nullable(),
    business: z
      .object({
        id: z.uuid(),
        name: z.string().min(1).max(120),
        is_verified: z.boolean(),
        is_demo: z.boolean(),
        brands: z.array(z.enum(brands)),
      })
      .strict()
      .nullable(),
    can_manage_business: z.boolean(),
    can_receive_offers: z.boolean(),
    blocking_reason: z
      .enum(['not_approved', 'no_business', 'business_disabled', 'no_brands', 'no_coverage'])
      .nullable(),
  })
  .strict()
  .refine((value) => value.can_receive_offers === (value.blocking_reason === null));
export type DriverWorkspace = z.infer<typeof driverWorkspaceSchema>;
export const driverBlockingMessages: Record<
  NonNullable<DriverWorkspace['blocking_reason']>,
  string
> = {
  not_approved: 'Tu habilitación de reparto no está activa. Contacta a administración de Gasway.',
  no_business:
    'Tu cuenta aún no tiene un negocio afiliado. Solicita a administración que regularice tu vinculación.',
  business_disabled:
    'Tu negocio no está habilitado para nuevos repartos. Contacta a su responsable.',
  no_brands:
    'Tu negocio aún no tiene marcas configuradas. Su responsable debe revisarlo con administración.',
  no_coverage: 'Tu distribuidora aún no definió comunas de reparto. Contacta a su responsable.',
};
export function isDriverOfferCurrent(offer: DriverOffer, now: number) {
  return Date.parse(offer.expires_at) > now;
}

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
      return 'No pudimos guardar la disponibilidad. Actualiza e intenta otra vez.';
    default:
      return 'No pudimos confirmar la operación. Actualiza y revisa tu pedido asignado antes de volver a aceptar.';
  }
}
