import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import { isAdminWorkspaceEnabled } from './admin-workspace-enabled';

export const profileSchema = z.object({ role: z.enum(['customer', 'driver']) });
export const driverSchema = z.object({ is_verified: z.boolean() });
export type Zone = 'customer' | 'driver' | 'admin';

export function resolveZone(
  profile: z.infer<typeof profileSchema>,
  driver: z.infer<typeof driverSchema> | null,
): Zone {
  if (profile.role === 'driver' && driver?.is_verified) return 'driver';
  return 'customer';
}

export async function fetchAccess(userId: string) {
  const client = getSupabase();
  if (isAdminWorkspaceEnabled()) {
    const admin = await client.rpc('is_document_admin');
    if (admin.error) throw admin.error;
    if (z.boolean().parse(admin.data)) return 'admin' as const;
  }
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
