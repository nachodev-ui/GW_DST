import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { readPublicEnv } from '@/shared/config/env';
import { secureStorage } from '@/shared/supabase/secure-storage';

let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!client) {
    const env = readPublicEnv();
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: secureStorage } : {}),
        persistSession: Platform.OS !== 'web',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }
  return client;
}
