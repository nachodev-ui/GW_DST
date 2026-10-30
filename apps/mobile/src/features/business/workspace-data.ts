import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import {
  businessProfileSchema,
  dashboardSchema,
  profileFormSchema,
  salesPageSchema,
  vehicleFormSchema,
  vehicleSchema,
  costFormSchema,
  type BusinessProfile,
  type BusinessProfileForm,
  type BusinessSale,
  type BusinessVehicle,
  type SalesPeriod,
  type VehicleForm,
} from './workspace-contracts';

export function useBusinessDashboard(businessId: string, period: SalesPeriod) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    enabled: !!session && focused,
    queryKey: ['business-dashboard', session?.user.id, businessId, period],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_business_dashboard', {
        p_distributor_id: businessId,
        p_period: period,
      });
      if (error) throw error;
      return dashboardSchema.parse(data);
    },
    refetchInterval: 30_000,
  });
}
export function useBusinessSales(businessId: string, period: SalesPeriod) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useInfiniteQuery({
    enabled: !!session && focused,
    queryKey: ['business-sales', session?.user.id, businessId, period],
    initialPageParam: null as { at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await getSupabase().rpc('list_business_sales', {
        p_distributor_id: businessId,
        p_period: period,
        p_before_at: pageParam?.at ?? null,
        p_before_id: pageParam?.id ?? null,
      });
      if (error) throw error;
      return salesPageSchema.parse(data);
    },
    getNextPageParam: (page) => {
      const last = page.items.at(-1);
      return page.has_more && last ? { at: last.delivered_at, id: last.id } : undefined;
    },
  });
}
export async function saveSaleCost(businessId: string, sale: BusinessSale, cost: string) {
  const parsed = costFormSchema.parse({ cost });
  const { error } = await getSupabase().rpc('set_business_sale_cost', {
    p_distributor_id: businessId,
    p_order_id: sale.id,
    p_cost_clp: Number(parsed.cost),
    p_revision: sale.cost_revision,
  });
  if (error) throw error;
}
export function useBusinessProfile(businessId: string) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    enabled: !!session && focused,
    queryKey: ['business-profile', session?.user.id, businessId],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_business_profile', {
        p_distributor_id: businessId,
      });
      if (error) throw error;
      return businessProfileSchema.parse(data);
    },
  });
}
export async function saveBusinessProfile(
  businessId: string,
  initial: BusinessProfile,
  values: BusinessProfileForm,
  media: { logo_path: string | null; cover_path: string | null },
) {
  const input = profileFormSchema.parse(values);
  const { error } = await getSupabase().rpc('set_business_profile', {
    p_distributor_id: businessId,
    p_revision: initial.revision,
    p_profile: {
      ...input,
      address: input.address || null,
      description: input.description || null,
      commune_code: input.commune_code || null,
      latitude: input.latitude === '' ? null : Number(input.latitude),
      longitude: input.longitude === '' ? null : Number(input.longitude),
      ...media,
    },
  });
  if (error) throw error;
}
export function useBusinessVehicles(businessId: string) {
  const { session } = useAuth();
  const focused = useIsFocused();
  return useQuery({
    enabled: !!session && focused,
    queryKey: ['business-vehicles', session?.user.id, businessId],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('list_business_vehicles', {
        p_distributor_id: businessId,
      });
      if (error) throw error;
      return z.array(vehicleSchema).parse(data);
    },
    refetchInterval: 30_000,
  });
}
export async function saveBusinessVehicle(
  businessId: string,
  vehicle: BusinessVehicle | null,
  values: VehicleForm,
) {
  const input = vehicleFormSchema.parse(values);
  const { error } = await getSupabase().rpc('save_document_vehicle', {
    p_distributor_id: businessId,
    p_id: vehicle?.id ?? randomUUID(),
    p_revision: vehicle?.revision ?? 0,
    p_vehicle: {
      ...input,
      year: Number(input.year),
      driver_id: input.driver_id || null,
      photo_path: vehicle?.photo_path ?? null,
    },
  });
  if (error) throw error;
}
export async function activateBusinessVehicle(businessId: string, vehicle: BusinessVehicle) {
  const input = vehicleSchema.parse(vehicle);
  const { error } = await getSupabase().rpc('set_business_vehicle', {
    p_distributor_id: z.uuid().parse(businessId),
    p_id: input.id,
    p_revision: input.revision,
    p_plate: input.plate,
    p_label: input.label,
    p_status: 'available',
    p_driver_id: input.driver_id,
  });
  if (error) throw error;
}
export function useBusinessMedia(path: string | null | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['business-media', session?.user.id, path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .storage.from('business-media')
        .createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}
export async function pickBusinessImage(businessId: string, kind: 'logo' | 'cover') {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0]!;
  if (asset.size !== undefined && asset.size > 5 * 1024 * 1024)
    throw new Error('Elige una imagen de hasta 5 MB.');
  let bytes: ArrayBuffer;
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('No pudimos leer la imagen seleccionada.');
    bytes = await asset.file.arrayBuffer();
  } else bytes = await new File(asset.uri).arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024)
    throw new Error('Elige una imagen de hasta 5 MB.');
  // Check the file signature as well as the picker MIME hint. SVG/HTML never enter this bucket.
  const header = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => header[i] === byte);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const webp =
    String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...header.slice(8, 12)) === 'WEBP';
  const extension = png ? 'png' : jpeg ? 'jpg' : webp ? 'webp' : null;
  if (!extension) throw new Error('Elige una imagen PNG, JPG o WebP válida.');
  const path = `${businessId}/${kind}/${randomUUID()}.${extension}`;
  const { error } = await getSupabase()
    .storage.from('business-media')
    .upload(path, bytes, {
      contentType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
      upsert: false,
    });
  if (error) throw error;
  return path;
}
