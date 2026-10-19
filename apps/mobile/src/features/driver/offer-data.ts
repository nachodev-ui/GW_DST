import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { communeSchema } from '@/shared/orders/contracts';
import {
  assignedOrderSchema,
  driverWorkspaceSchema,
  offerSchema,
  settingsSchema,
  type DriverSettings,
} from '@/features/driver/offer-contracts';

const pollMs = 5_000;
function useForegroundScreen() {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  return focused && active;
}

export function useDriverWorkspace() {
  const { session, zone } = useAuth();
  const foreground = useForegroundScreen();
  const enabled = !!session && zone === 'driver' && foreground;
  return useQuery({
    queryKey: ['driver', session?.user.id, 'workspace'],
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? pollMs : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_my_driver_workspace');
      if (error) throw error;
      return driverWorkspaceSchema.parse(data);
    },
  });
}

export function useDriverClock() {
  const foreground = useForegroundScreen();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!foreground) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [foreground]);
  return now;
}

export function useDriverSettings() {
  const { session, zone } = useAuth();
  const foreground = useForegroundScreen();
  const enabled = !!session && zone === 'driver' && foreground;
  const settings = useQuery({
    queryKey: ['driver', session?.user.id, 'settings'],
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? pollMs : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_driver_settings');
      if (error) throw error;
      return settingsSchema.parse(data);
    },
  });
  const communes = useQuery({
    queryKey: ['driver', session?.user.id, 'communes'],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('communes')
        .select('code,name')
        .order('name');
      if (error) throw error;
      return z.array(communeSchema).parse(data);
    },
  });
  return { settings, communes };
}

export function useDriverOffers() {
  const { session, zone } = useAuth();
  const foreground = useForegroundScreen();
  const enabled = !!session && zone === 'driver' && foreground;
  const { settings, communes } = useDriverSettings();
  const offers = useQuery({
    queryKey: ['driver', session?.user.id, 'offers'],
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? pollMs : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('list_driver_offers');
      if (error) throw error;
      return z.array(offerSchema).parse(data);
    },
  });
  return { settings, communes, offers };
}

export function useAssignedOrder(id: string | null = null) {
  const { session, zone } = useAuth();
  const foreground = useForegroundScreen();
  return useQuery({
    queryKey: ['driver', session?.user.id, 'assigned', id],
    enabled:
      !!session &&
      zone === 'driver' &&
      foreground &&
      (id === null || z.uuid().safeParse(id).success),
    staleTime: 0,
    refetchInterval: foreground ? pollMs : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_driver_order', {
        p_order_id: id === null ? null : z.uuid().parse(id),
      });
      if (error) throw error;
      return assignedOrderSchema.nullable().parse(data);
    },
  });
}

export function useDriverActions() {
  const { session } = useAuth();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['driver', session?.user.id] });
  const settings = useMutation({
    retry: false,
    mutationFn: async (values: DriverSettings) => {
      const checked = settingsSchema.parse(values);
      const { data, error } = await getSupabase().rpc('set_driver_settings', {
        p_is_available: checked.is_available,
        p_commune_codes: checked.commune_codes,
      });
      if (error) throw error;
      return settingsSchema.parse(data);
    },
    onSettled: refresh,
  });
  const accept = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      const { data, error } = await getSupabase().rpc('accept_driver_offer', {
        p_order_id: z.uuid().parse(id),
      });
      if (error) throw error;
      return assignedOrderSchema.parse(data);
    },
    onSuccess: (order) => {
      client.setQueryData(['driver', session?.user.id, 'assigned', order.order_id], order);
    },
    onSettled: refresh,
  });
  const reject = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      const { data, error } = await getSupabase().rpc('reject_driver_offer', {
        p_order_id: z.uuid().parse(id),
      });
      if (error) throw error;
      return z.literal(true).parse(data);
    },
    onSettled: refresh,
  });
  const advance = useMutation({
    retry: false,
    mutationFn: async (values: { id: string; status: 'on_the_way' | 'delivered' }) => {
      const { data, error } = await getSupabase().rpc('advance_driver_order', {
        p_order_id: z.uuid().parse(values.id),
        p_status: z.enum(['on_the_way', 'delivered']).parse(values.status),
      });
      if (error) throw error;
      return assignedOrderSchema.parse(data);
    },
    onSuccess: (order) => {
      client.setQueryData(['driver', session?.user.id, 'assigned', order.order_id], order);
      client.setQueryData(
        ['driver', session?.user.id, 'assigned', null],
        order.status === 'delivered' ? null : order,
      );
    },
    onSettled: refresh,
  });
  return { settings, accept, reject, advance };
}
