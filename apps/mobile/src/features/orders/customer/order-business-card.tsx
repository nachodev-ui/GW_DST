import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { distributorContactUrl } from '@/shared/orders/delivery-options';
import { Button, Feedback, ui } from '@/shared/ui/components';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

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
  if (contact.isPending)
    return (
      <Text variant="note" style={ui.muted}>
        Cargando distribuidora…
      </Text>
    );
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
    <View style={styles.contact}>
      <View style={styles.row}>
        <Icon name="truck" size={theme.spacing.screen} />
        <View style={ui.flex}>
          <Text variant="note" style={ui.muted}>
            Tu distribuidora
          </Text>
          <Text variant="label">{contact.data.name}</Text>
        </View>
        {contact.data.is_demo ? (
          <View style={styles.demo}>
            <Text variant="note">Demo</Text>
          </View>
        ) : null}
      </View>
      {url ? (
        <>
          <Button
            label="Consultar por WhatsApp"
            accessibilityLabel="Consultar a la distribuidora por WhatsApp, sin compartir tu dirección"
            variant="link"
            onPress={() => {
              setFailed(false);
              void Linking.openURL(url).catch(() => setFailed(true));
            }}
          />
        </>
      ) : null}
      {failed ? <Feedback error text="No pudimos abrir WhatsApp. Inténtalo nuevamente." /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contact: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  demo: {
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.warm,
  },
});
