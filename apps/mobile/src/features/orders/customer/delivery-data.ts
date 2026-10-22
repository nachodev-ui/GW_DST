import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { deliveryOptionSchema } from '@/shared/orders/delivery-options';

export function useDeliveryOptions(
  productId: string,
  communeCode: string,
  quantity: number,
  exchange: boolean,
  enabled: boolean,
) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['delivery-options', session?.user.id, productId, communeCode, quantity, exchange],
    enabled:
      !!session &&
      enabled &&
      z.uuid().safeParse(productId).success &&
      /^\d{5}$/.test(communeCode) &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= 99,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('list_delivery_options', {
        p_product_id: productId,
        p_commune_code: communeCode,
        p_quantity: quantity,
        p_exchange_empty: exchange,
      });
      if (error) throw error;
      return z.array(deliveryOptionSchema).parse(data);
    },
    staleTime: 0,
    refetchInterval: enabled ? 30_000 : false,
  });
}
