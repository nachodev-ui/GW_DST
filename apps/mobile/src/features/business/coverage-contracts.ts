import { z } from 'zod';
import { communeSchema, type Commune } from '@/shared/orders/contracts';

export const coverageDriverSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  status: z.enum(['available', 'offline', 'busy', 'not_enabled']),
});
export const businessCoverageSchema = z.object({
  business_enabled: z.boolean(),
  is_open: z.boolean(),
  revision: z.number().int().min(0),
  communes: z.array(communeSchema),
  drivers: z.array(coverageDriverSchema),
});
export type CoverageDriver = z.infer<typeof coverageDriverSchema>;
export type BusinessCoverage = z.infer<typeof businessCoverageSchema>;
export type CoverageCommune = Commune & { drivers: CoverageDriver[] };

export const coverageDriverLabels: Record<CoverageDriver['status'], string> = {
  available: 'Disponible',
  offline: 'No disponible',
  busy: 'En entrega',
  not_enabled: 'Por habilitar',
};

export function groupCoverage(data: BusinessCoverage): CoverageCommune[] {
  return data.communes
    .map((commune) => ({ ...commune, drivers: data.drivers }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es-CL'));
}

export function communeCoverageState(data: BusinessCoverage, commune: CoverageCommune) {
  const enabled = commune.drivers.filter((driver) => driver.status !== 'not_enabled').length;
  const available = commune.drivers.filter((driver) => driver.status === 'available').length;
  if (!data.business_enabled)
    return { enabled, available: 0, label: 'Negocio no habilitado', tone: 'warning' } as const;
  if (!enabled)
    return {
      enabled,
      available: 0,
      label: 'Sin conductores habilitados',
      tone: 'warning',
    } as const;
  if (!data.is_open)
    return { enabled, available: 0, label: 'Fuera de horario', tone: 'neutral' } as const;
  if (!available) return { enabled, available, label: 'Sin disponibles', tone: 'neutral' } as const;
  return { enabled, available, label: 'Reparto disponible', tone: 'success' } as const;
}
