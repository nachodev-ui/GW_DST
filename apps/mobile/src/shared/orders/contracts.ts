import { z } from 'zod';

export const brands = ['Lipigas', 'Gasco', 'Abastible'] as const;
export const weights = [5, 11, 15, 45] as const;
export const productVariants = ['standard', 'vma', 'vm'] as const;
export const clpSchema = z.number().int().min(0).max(2147483647);
export const productSchema = z.object({
  id: z.uuid(),
  brand: z.enum(brands),
  weight_kg: z.union([z.literal(5), z.literal(11), z.literal(15), z.literal(45)]),
  variant: z.enum(productVariants).default('standard'),
});
export const communeSchema = z.object({
  code: z.string().regex(/^\d{5}$/),
  name: z.string().min(1),
});
export const orderSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid(),
  product_id: z.uuid(),
  distributor_id: z.uuid().nullable().default(null),
  returned_brand: z
    .enum([...brands, 'unknown'])
    .nullable()
    .default(null),
  quantity: z.number().int().min(1).max(99),
  exchange_empty: z.boolean(),
  status: z.enum(['requested', 'offered', 'accepted', 'on_the_way', 'delivered', 'cancelled']),
  total_clp: clpSchema,
  currency: z.literal('CLP'),
  payment_method: z.literal('cash_on_delivery'),
  delivery_address: z.string(),
  commune_code: z.string().regex(/^\d{5}$/),
  notes: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
export type Product = z.infer<typeof productSchema>;
export function productLabel(product: Pick<Product, 'weight_kg' | 'variant'>) {
  return `${product.variant === 'standard' ? '' : `${product.variant.toUpperCase()} `}${product.weight_kg} kg`;
}
export type Commune = z.infer<typeof communeSchema>;
export type Order = z.infer<typeof orderSchema>;
export const statusLabels: Record<Order['status'], string> = {
  requested: 'Solicitado',
  offered: 'Buscando repartidor',
  accepted: 'Confirmado',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
export function canCancel(status: Order['status']) {
  return status === 'requested' || status === 'offered' || status === 'accepted';
}
export const formatClp = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
