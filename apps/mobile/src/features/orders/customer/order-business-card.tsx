import { useState } from 'react';
import { Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { distributorContactUrl } from '@/shared/orders/delivery-options';
import { Button, Card, Feedback } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';

const businessContactSchema = z
  .object({ name: z.string().min(1), is_demo: z.boolean(), whatsapp: z.string().nullable() })
  .nullable();
export function OrderBusinessCard({ orderId }: { orderId: string }) {
  const { session } = useAuth();
  const [failed, setFailed] = useState(false);
  const contact = useQuery({
    queryKey: ['customer-orders', session?.user.id, orderId, 'business'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_order_business', {
        p_order_id: orderId,
      });
      if (error) throw error;
      return businessContactSchema.parse(data);
    },
  });
  if (contact.isPending) return <Text>Cargando distribuidora…</Text>;
  if (contact.isError)
    return (
      <Button
        label="Reintentar datos de distribuidora"
        variant="secondary"
        onPress={() => void contact.refetch()}
      />
    );
  if (!contact.data) return null;
  const url = contact.data.is_demo
    ? null
    : distributorContactUrl(contact.data.whatsapp, contact.data.name);
  return (
    <Card>
      <Text variant="subtitle">Tu distribuidora</Text>
      <Text>{contact.data.name}</Text>
      {contact.data.is_demo ? (
        <Feedback text="Negocio de demostración con datos ficticios." />
      ) : null}
      {url ? (
        <>
          <Text variant="note">
            Consulta general por WhatsApp. No se incluye tu dirección. El seguimiento de tu pedido
            sigue en Gasway.
          </Text>
          <Button
            label="Consultar por WhatsApp"
            variant="secondary"
            onPress={() => {
              setFailed(false);
              void Linking.openURL(url).catch(() => setFailed(true));
            }}
          />
        </>
      ) : null}
      {failed ? <Feedback error text="No pudimos abrir WhatsApp. Inténtalo nuevamente." /> : null}
    </Card>
  );
}
