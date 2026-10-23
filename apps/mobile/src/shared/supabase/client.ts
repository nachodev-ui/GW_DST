import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { readPublicEnv } from '@/shared/config/env';
import { secureStorage } from '@/shared/supabase/secure-storage';
import { ensurePkceCrypto } from '@/shared/supabase/pkce-crypto';

let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!client) {
    if (Platform.OS !== 'web') ensurePkceCrypto();
    const env = readPublicEnv();
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: secureStorage } : {}),
        persistSession: Platform.OS !== 'web',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    });
  }
  return client;
}
