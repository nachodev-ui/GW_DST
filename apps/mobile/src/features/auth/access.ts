import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';

export const profileSchema = z.object({ role: z.enum(['customer', 'driver']) });
export const driverSchema = z.object({ is_verified: z.boolean() });
export type Zone = 'customer' | 'driver' | 'pending';

export function resolveZone(
  profile: z.infer<typeof profileSchema>,
  driver: z.infer<typeof driverSchema> | null,
): Zone {
  if (profile.role === 'driver' && driver?.is_verified) return 'driver';
  if (driver || profile.role === 'driver') return 'pending';
  return 'customer';
}

export async function fetchAccess(userId: string) {
  const client = getSupabase();
  const [profile, driver] = await Promise.all([
    client.from('profiles').select('role').eq('id', userId).single(),
    client.from('drivers').select('is_verified').eq('id', userId).maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  if (driver.error) throw driver.error;
  return resolveZone(
    profileSchema.parse(profile.data),
    driver.data === null ? null : driverSchema.parse(driver.data),
  );
}
