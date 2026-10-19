import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { communeSchema } from '@/shared/orders/contracts';
import {
  affiliationSchema,
  businessApplicationSchema,
  businessFormSchema,
  businessProductFormSchema,
  businessProductSchema,
  businessSchema,
  type Affiliation,
  type BusinessForm,
  type BusinessProduct,
  type BusinessProductForm,
} from '@/features/business/business-contracts';

export async function fetchMyBusinesses() {
  const { data, error } = await getSupabase().rpc('list_my_businesses');
  if (error) throw error;
  return z.array(businessSchema).parse(data);
}
export function useMyBusinesses() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['businesses', session?.user.id],
    queryFn: fetchMyBusinesses,
    enabled: !!session,
    refetchInterval: 30_000,
    staleTime: 0,
  });
}
export async function fetchBusinessApplication(userId: string) {
  const { data, error } = await getSupabase()
    .from('distributor_applications')
    .select(
      'applicant_id,name,rut,contact_name,phone,address,commune_code,brands,commercial_evidence,storage_evidence,status,requested_at,reviewed_at,decision_reason,distributor_id',
    )
    .eq('applicant_id', z.uuid().parse(userId))
    .maybeSingle();
  if (error) throw error;
  return data === null ? null : businessApplicationSchema.parse(data);
}
export async function fetchBusinessCommunes() {
  const { data, error } = await getSupabase().from('communes').select('code,name').order('name');
  if (error) throw error;
  return z.array(communeSchema).parse(data);
}
export async function submitBusinessApplication(values: BusinessForm, reapply: boolean) {
  const input = businessFormSchema.parse(values);
  const { error } = await getSupabase().rpc('submit_distributor_application', {
    p_name: input.name,
    p_rut: input.rut,
    p_contact_name: input.contact_name,
    p_phone: input.phone,
    p_address: input.address,
    p_commune_code: input.commune_code,
    p_brands: input.brands,
    p_commercial_evidence: input.commercial_evidence,
    p_storage_evidence: input.storage_evidence,
    p_reapply: reapply,
  });
  if (error) throw error;
}
export async function fetchBusinessProducts(businessId: string) {
  const { data, error } = await getSupabase().rpc('list_business_products', {
    p_distributor_id: z.uuid().parse(businessId),
  });
  if (error) throw error;
  return z.array(businessProductSchema).parse(data);
}
export async function saveBusinessProduct(
  businessId: string,
  product: BusinessProduct,
  values: BusinessProductForm,
) {
  const input = businessProductFormSchema.parse(values);
  const current = businessProductSchema.parse(product);
  const { error } = await getSupabase().rpc('set_business_product', {
    p_distributor_id: z.uuid().parse(businessId),
    p_product_id: current.product_id,
    p_unit_price_clp: input.price === '' ? null : Number(input.price),
    p_stock: Number(input.stock),
    p_is_listed: input.is_listed,
    p_revision: current.revision,
  });
  if (error) throw error;
}
export async function confirmBusinessAffiliation(value: Affiliation) {
  const input = affiliationSchema.parse(value);
  const { error } = await getSupabase().rpc('confirm_driver_affiliation', {
    p_driver_id: input.driver_id,
    // Keep the server timestamp string: JS Date would truncate its microseconds.
    p_requested_at: input.requested_at,
  });
  if (error) throw error;
}
