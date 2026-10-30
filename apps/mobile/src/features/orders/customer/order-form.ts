import { z } from 'zod';
import type { Commune } from '@/shared/orders/contracts';
import { deliveryPointSchema } from '@/shared/orders/delivery-point';

export function createOrderFormSchema(communes: Commune[]) {
  const codes = new Set(communes.map((commune) => commune.code));
  return z.object({
    productId: z.uuid('Elige un cilindro disponible.'),
    quantity: z
      .string()
      .regex(/^\d+$/, 'Ingresa una cantidad entera.')
      .refine(
        (value) => Number(value) >= 1 && Number(value) <= 99,
        'Elige entre 1 y 99 cilindros.',
      ),
    exchangeEmpty: z.boolean(),
    address: z
      .string()
      .trim()
      .min(1, 'Ingresa la dirección de entrega.')
      .max(300, 'Usa hasta 300 caracteres.'),
    communeCode: z
      .string()
      .refine((value) => codes.has(value), 'Elige una comuna del listado oficial.'),
    notes: z.string().trim().max(1000, 'Usa hasta 1.000 caracteres.'),
    deliveryPoint: deliveryPointSchema.nullable().optional(),
  });
}
export type OrderForm = z.infer<ReturnType<typeof createOrderFormSchema>>;
