import { z } from 'zod';

const publicEnvSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(1),
});

// Explicit reads are required for Expo's compile-time EXPO_PUBLIC_* substitution.
// Validated when Auth initializes; configuration errors block access safely.
export function readPublicEnv() {
  return publicEnvSchema.parse({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
