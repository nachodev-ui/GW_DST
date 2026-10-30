import { z } from 'zod';
import { brands, clpSchema, productVariants } from '@/shared/orders/contracts';
import { isValidRut, normalizeRut } from '@/shared/validation/rut';

export const businessFormSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del negocio.').max(120),
  rut: z.string().transform(normalizeRut).refine(isValidRut, 'Revisa el RUT del negocio.'),
  contact_name: z.string().trim().min(2, 'Ingresa el nombre del responsable.').max(100),
  phone: z
    .string()
    .transform((value) => {
      const compact = value.replace(/[\s()-]/g, '');
      return /^[2-9][0-9]{8}$/.test(compact) ? `+56${compact}` : compact;
    })
    .pipe(z.string().regex(/^\+56[2-9][0-9]{8}$/, 'Ingresa un teléfono chileno de 9 dígitos.')),
  address: z.string().trim().min(5, 'Ingresa la dirección del recinto.').max(240),
  commune_code: z.string().regex(/^\d{5}$/, 'Selecciona una comuna del catálogo.'),
  brands: z
    .array(z.enum(brands))
    .min(1, 'Selecciona al menos una marca.')
    .max(3)
    .refine((values) => new Set(values).size === values.length, 'No repitas marcas.'),
  commercial_evidence: z.string().trim().min(5, 'Indica las referencias comerciales.').max(1000),
  storage_evidence: z
    .string()
    .trim()
    .min(5, 'Indica las referencias del recinto y seguridad.')
    .max(1000),
});
export type BusinessForm = z.infer<typeof businessFormSchema>;

export const businessApplicationSchema = businessFormSchema
  .extend({
    applicant_id: z.uuid(),
    status: z.enum(['pending', 'approved', 'rejected']),
    requested_at: z.iso.datetime({ offset: true }),
    reviewed_at: z.iso.datetime({ offset: true }).nullable(),
    decision_reason: z.string().min(1).max(500).nullable(),
    distributor_id: z.uuid().nullable(),
  })
  .strict()
  .refine((value) =>
    value.status === 'pending'
      ? value.reviewed_at === null &&
        value.decision_reason === null &&
        value.distributor_id === null
      : value.reviewed_at !== null &&
        value.decision_reason !== null &&
        (value.status === 'approved'
          ? value.distributor_id !== null
          : value.distributor_id === null),
  );
export type BusinessApplication = z.infer<typeof businessApplicationSchema>;

export const businessSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    is_verified: z.boolean(),
    is_demo: z.boolean(),
    accepts_driver_applications: z.boolean(),
    member_role: z.enum(['owner', 'manager']),
    brands: z.array(z.enum(brands)),
  })
  .strict();
export type Business = z.infer<typeof businessSchema>;

export const businessProductSchema = z
  .object({
    product_id: z.uuid(),
    brand: z.enum(brands),
    weight_kg: z.union([z.literal(5), z.literal(11), z.literal(15), z.literal(45)]),
    variant: z.enum(productVariants),
    unit_price_clp: clpSchema.nullable(),
    price_without_exchange_clp: clpSchema.nullable(),
    stock: z.number().int().min(0).max(1000000),
    is_listed: z.boolean(),
    revision: z.number().int().min(0),
  })
  .strict();
export type BusinessProduct = z.infer<typeof businessProductSchema>;

export const businessProductFormSchema = z
  .object({
    priceWithoutExchange: z
      .string()
      .refine(
        (value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 2147483647),
        'Ingresa pesos enteros entre 0 y 2.147.483.647.',
      ),
    price: z
      .string()
      .refine(
        (value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 2147483647),
        'Ingresa pesos enteros entre 0 y 2.147.483.647.',
      ),
    stock: z
      .string()
      .regex(/^\d+$/, 'Ingresa cilindros enteros, sin decimales.')
      .refine((value) => Number(value) <= 1000000, 'Usa un stock entre 0 y 1.000.000.'),
    is_listed: z.boolean(),
  })
  .refine((value) => !value.is_listed || value.price !== '', {
    path: ['price'],
    message: 'Define un precio para incluir el producto.',
  });
export type BusinessProductForm = z.infer<typeof businessProductFormSchema>;

export const affiliationSchema = z
  .object({
    driver_id: z.uuid(),
    name: z.string().min(2),
    requested_at: z.iso.datetime({ offset: true }),
    distributor_id: z.uuid(),
    affiliation_confirmed: z.boolean(),
  })
  .strict();
export type Affiliation = z.infer<typeof affiliationSchema>;

export function businessError(error: unknown) {
  const parsed = z.object({ code: z.string() }).safeParse(error);
  switch (parsed.success ? parsed.data.code : '') {
    case 'GD001':
      return 'El conductor necesita licencia vigente revisada por administración.';
    case 'GD002':
      return 'Completa la foto y los documentos vigentes del vehículo antes de marcarlo disponible.';
    case '40001':
      return 'Otra persona actualizó estos datos. Carga la versión actual antes de guardar de nuevo.';
    case '42501':
      return 'Tu sesión o tus permisos cambiaron. Actualiza el acceso para continuar.';
    case '55000':
      return 'La operación está en curso o su estado cambió. Actualiza los datos; los vehículos no se editan durante una entrega.';
    case '23505':
      return 'La patente o el conductor ya están vinculados a un vehículo. Revisa la flota.';
    case '23514':
    case '23503':
      return 'Revisa los campos y selecciona una comuna o un conductor vigente del catálogo.';
    case '22023':
      return 'Revisa los datos ingresados y las marcas autorizadas del negocio.';
    default:
      return 'No pudimos completar la acción. Revisa tu conexión y vuelve a intentarlo.';
  }
}
