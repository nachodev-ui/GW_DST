import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { businessCoverageSchema } from './coverage-contracts';

export function useBusinessCoverage(businessId: string) {
  const { session } = useAuth();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  const enabled = !!session && focused && active;
  return useQuery({
    queryKey: ['business-coverage', session?.user.id, businessId],
    enabled,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_business_coverage', {
        p_distributor_id: z.uuid().parse(businessId),
      });
      if (error) throw error;
      return businessCoverageSchema.parse(data);
    },
    staleTime: 0,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}
