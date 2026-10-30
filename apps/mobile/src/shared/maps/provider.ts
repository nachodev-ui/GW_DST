import { z } from 'zod';

const googleMapsConfig = z.object({ android: z.boolean().optional(), ios: z.boolean().optional() });

// Expo Go uses its bundled runtime. Standalone builds require their own platform key.
export function nativeMapProvider(
  platform: string,
  config: unknown,
  expoGo = false,
  googleMapsInstalled = platform === 'android',
): 'google' | 'apple' | null {
  if (platform === 'ios' && expoGo) return 'apple';
  // A configured key cannot add a native view missing from the installed binary.
  if (platform === 'ios' && !googleMapsInstalled) return null;
  if (expoGo && (platform === 'ios' || platform === 'android')) return 'google';
  const parsed = googleMapsConfig.safeParse(config);
  if (
    (platform === 'android' || platform === 'ios') &&
    parsed.success &&
    parsed.data[platform] === true
  )
    return 'google';
  return null;
}
