import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { communeSchema, orderSchema, productSchema } from '@/shared/orders/contracts';
import type { OrderForm } from '@/features/orders/customer/order-form';

const orderColumns =
  'id,customer_id,product_id,quantity,exchange_empty,status,total_clp,currency,payment_method,delivery_address,commune_code,notes,created_at';
export function useCatalogue() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['order-catalogue', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const [products, communes] = await Promise.all([
        getSupabase()
          .from('products')
          .select('id,brand,weight_kg,variant,unit_price_clp')
          .eq('is_active', true)
          .order('weight_kg')
          .order('variant'),
        getSupabase().from('communes').select('code,name').order('name'),
      ]);
      if (products.error) throw products.error;
      if (communes.error) throw communes.error;
      return {
        products: z.array(productSchema).parse(products.data),
        communes: z.array(communeSchema).parse(communes.data),
      };
    },
  });
}
export function useOrdersList() {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ['customer-orders', session?.user.id, 'list'],
    enabled: !!session,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await getSupabase()
        .from('orders')
        .select(orderColumns)
        .eq('customer_id', session!.user.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(pageParam, pageParam + 19);
      if (error) throw error;
      return z.array(orderSchema).parse(data);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.length === 20 ? pages.length * 20 : undefined),
    staleTime: 0,
  });
}
export function useOrders(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['customer-orders', session?.user.id, id],
    enabled: !!session,
    queryFn: async () => {
      const request = getSupabase()
        .from('orders')
        .select(orderColumns)
        .eq('customer_id', session!.user.id)
        .eq('id', z.uuid().parse(id));
      const { data, error } = await request;
      if (error) throw error;
      return z.array(orderSchema).parse(data);
    },
    staleTime: 0,
  });
}
export function useOrderEvents(id: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['customer-orders', session?.user.id, id, 'events'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('order_events')
        .select('to_status,created_at')
        .eq('order_id', z.uuid().parse(id))
        .order('id');
      if (error) throw error;
      return z
        .array(
          z.object({
            to_status: orderSchema.shape.status,
            created_at: z.iso.datetime({ offset: true }),
          }),
        )
        .parse(data);
    },
    staleTime: 0,
  });
}
export function useOrderActions() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['customer-orders', session?.user.id] });
  const create = useMutation({
    retry: false,
    mutationFn: async (values: OrderForm) => {
      const { data, error } = await getSupabase()
        .rpc('create_order', {
          p_product_id: values.productId,
          p_quantity: Number(values.quantity),
          p_exchange_empty: values.exchangeEmpty,
          p_delivery_address: values.address,
          p_commune_code: values.communeCode,
          p_notes: values.notes || null,
        })
        .select(orderColumns)
        .single();
      if (error) throw error;
      return orderSchema.parse(data);
    },
    onSuccess: refresh,
    onError: refresh,
  });
  const cancel = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      const { data, error } = await getSupabase()
        .rpc('cancel_order', {
          p_order_id: z.uuid().parse(id),
        })
        .select(orderColumns)
        .single();
      if (error) throw error;
      return orderSchema.parse(data);
    },
    onSuccess: refresh,
    onError: refresh,
  });
  return { create, cancel };
}
export function orderError(error: unknown) {
  const code = z.object({ code: z.string() }).safeParse(error);
  if (code.success && code.data.code === '55000')
    return 'El producto o el pedido ya no está disponible para esta acción. Actualiza e intenta otra vez.';
  if (code.success && code.data.code === '22023')
    return 'Revisa los datos del pedido y vuelve a intentarlo.';
  if (code.success && code.data.code === '42501')
    return 'Tu sesión no permite esta acción. Vuelve a ingresar.';
  return 'No pudimos confirmar la operación. Revisa Mis pedidos antes de repetirla y comprueba tu conexión.';
}
