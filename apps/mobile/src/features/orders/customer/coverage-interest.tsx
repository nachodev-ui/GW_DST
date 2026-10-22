import { useMutation } from '@tanstack/react-query';
import { View } from 'react-native';
import { getSupabase } from '@/shared/supabase/client';
import { Button, Feedback, ui } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';

export function CoverageInterest({
  communeCode,
  productId,
}: {
  communeCode: string;
  productId: string;
}) {
  const interest = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().rpc('register_coverage_interest', {
        p_commune_code: communeCode,
        p_product_id: productId,
      });
      if (error) throw error;
    },
  });
  return (
    <View style={ui.stack}>
      <Text variant="subtitle">¿Te interesa que lleguemos?</Text>
      <Text variant="note">
        Podemos guardar tu interés en esta comuna asociado a tu cuenta, sin tu dirección. Los avisos
        todavía no están activos.
      </Text>
      <Button
        variant="secondary"
        label={
          interest.isSuccess
            ? 'Interés registrado'
            : interest.isPending
              ? 'Guardando…'
              : 'Registrar mi interés'
        }
        disabled={interest.isPending || interest.isSuccess}
        onPress={() => interest.mutate()}
      />
      {interest.isSuccess ? (
        <Feedback text="Guardamos tu interés. Aún no se enviarán mensajes ni notificaciones." />
      ) : null}
      {interest.isError ? (
        <Feedback error text="No pudimos guardarlo. Revisa tu conexión e intenta otra vez." />
      ) : null}
    </View>
  );
}
