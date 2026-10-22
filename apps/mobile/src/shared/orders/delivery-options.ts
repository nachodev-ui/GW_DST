import { z } from 'zod';
import { brands, clpSchema } from './contracts';

export const serviceDaySchema = z
  .object({
    day: z.number().int().min(0).max(6),
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((day) => day.open !== day.close, 'Usa horas distintas.');
export const serviceSettingsSchema = z
  .object({
    whatsapp: z
      .string()
      .regex(/^569\d{8}$/)
      .nullable(),
    schedule: z
      .array(serviceDaySchema)
      .max(7)
      .refine(
        (days) => new Set(days.map((day) => day.day)).size === days.length,
        'Cada día debe aparecer una sola vez.',
      )
      .nullable(),
    eta_min: z.number().int().min(1).max(1440).nullable(),
    eta_max: z.number().int().min(1).max(1440).nullable(),
    revision: z.number().int().min(0),
  })
  .refine(
    (settings) =>
      (settings.eta_min === null && settings.eta_max === null) ||
      (settings.eta_min !== null &&
        settings.eta_max !== null &&
        settings.eta_max >= settings.eta_min),
  );
export const deliveryOptionSchema = z.object({
  request_id: z.uuid(),
  id: z.uuid(),
  name: z.string().min(1),
  is_demo: z.boolean(),
  brands: z.array(z.enum(brands)),
  unit_price_clp: clpSchema.nullable(),
  price_without_exchange_clp: clpSchema.nullable(),
  total_clp: clpSchema.nullable(),
  stock: z.number().int().min(1).max(1000000),
  has_coverage: z.boolean(),
  has_available_driver: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }),
  service: serviceSettingsSchema,
});
export type ServiceSettings = z.infer<typeof serviceSettingsSchema>;
export type DeliveryOption = z.infer<typeof deliveryOptionSchema>;
export type DeliverySort = 'recommended' | 'price' | 'fastest';
export const recommendationWeights = { availability: 100, open: 50, eta: 20, price: 10 } as const;
export const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/** null means unreported; an empty schedule means closed every day. */
export function serviceStatus(schedule: ServiceSettings['schedule'], now = new Date()) {
  if (schedule === null) return { open: null, label: 'Horario por confirmar' };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday'));
  const minute = Number(part('hour')) * 60 + Number(part('minute'));
  const today = schedule.find((entry) => entry.day === day);
  const yesterday = schedule.find((entry) => entry.day === (day + 6) % 7);
  const open = !!(
    (today &&
      minute >= minutes(today.open) &&
      (minutes(today.close) < minutes(today.open) || minute < minutes(today.close))) ||
    (yesterday &&
      minutes(yesterday.close) < minutes(yesterday.open) &&
      minute < minutes(yesterday.close))
  );
  if (open) return { open: true, label: 'Abierto ahora' };
  for (let offset = 0; offset <= 7; offset++) {
    const next = schedule.find((entry) => entry.day === (day + offset) % 7);
    if (next && (offset > 0 || minutes(next.open) > minute)) {
      return {
        open: false,
        label: `Cerrado · abre ${offset === 0 ? 'hoy' : weekdays[next.day]} a las ${next.open}`,
      };
    }
  }
  return { open: false, label: 'Sin horario de atención esta semana' };
}

export function sortDeliveryOptions(
  options: DeliveryOption[],
  sort: DeliverySort,
  now = new Date(),
) {
  const prices = options.flatMap((option) => (option.total_clp === null ? [] : [option.total_clp]));
  const low = Math.min(...prices),
    high = Math.max(...prices);
  const score = (option: DeliveryOption) => {
    const status = serviceStatus(option.service.schedule, now);
    return (
      (deliveryAvailability(option, now).canOrder ? recommendationWeights.availability : 0) +
      (status.open === true
        ? recommendationWeights.open
        : status.open === null
          ? recommendationWeights.open / 2
          : 0) +
      (option.service.eta_max === null
        ? 0
        : recommendationWeights.eta * (1 - option.service.eta_max / 1440)) +
      (option.total_clp === null
        ? 0
        : recommendationWeights.price *
          (high === low ? 1 : (high - option.total_clp) / (high - low)))
    );
  };
  return [...options].sort((a, b) => {
    const closed =
      Number(serviceStatus(a.service.schedule, now).open === false) -
      Number(serviceStatus(b.service.schedule, now).open === false);
    if (closed) return closed;
    const order =
      sort === 'price'
        ? (a.total_clp ?? Infinity) - (b.total_clp ?? Infinity)
        : sort === 'fastest'
          ? (a.service.eta_max ?? Infinity) - (b.service.eta_max ?? Infinity)
          : score(b) - score(a);
    return (
      (Number.isNaN(order) ? 0 : order) ||
      a.name.localeCompare(b.name, 'es-CL') ||
      a.id.localeCompare(b.id)
    );
  });
}

/** Stock and delivery readiness are independent; only the server can authorize purchase. */
export function deliveryAvailability(option: DeliveryOption, now = new Date()) {
  if (option.total_clp === null) return { canOrder: false, label: 'Precio por confirmar' };
  if (!option.has_coverage) return { canOrder: false, label: 'Sin cobertura de reparto' };
  if (serviceStatus(option.service.schedule, now).open === false)
    return { canOrder: false, label: 'Fuera de horario' };
  if (!option.has_available_driver)
    return { canOrder: false, label: 'Sin reparto disponible ahora' };
  return { canOrder: true, label: 'Pedir en Gasway' };
}

/** Consultation only: never includes an address, coordinates, RUT or order confirmation. */
export function distributorContactUrl(phone: string | null, name: string) {
  if (!phone || !/^569\d{8}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, quisiera hacer una consulta a ${name} sobre sus productos y reparto. Gracias.`)}`;
}
