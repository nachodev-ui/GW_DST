import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import {
  serviceSettingsSchema,
  weekdays,
  type ServiceSettings,
} from '@/shared/orders/delivery-options';
import { Button, Feedback, Input, ui } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { businessError, type Business } from './business-contracts';

const unreported: ServiceSettings = {
  whatsapp: null,
  schedule: null,
  eta_min: null,
  eta_max: null,
  revision: 0,
};

export function ServiceSettingsEditor({ business }: { business: Business }) {
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const settings = useQuery({
    queryKey: ['business-service', session?.user.id, business.id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('distributor_service_settings')
        .select('whatsapp,schedule,eta_min,eta_max,revision')
        .eq('distributor_id', business.id)
        .maybeSingle();
      if (error) throw error;
      return data ? serviceSettingsSchema.parse(data) : unreported;
    },
  });
  return (
    <View style={ui.stack}>
      <Text variant="subtitle">Atención y consultas</Text>
      <Text variant="note" style={ui.muted}>
        Publica tu horario, estimación de reparto y WhatsApp comercial. La cobertura usa las comunas
        guardadas por tus conductores habilitados. WhatsApp sirve para consultas; los pedidos llegan
        a Gasway.
      </Text>
      <Button
        label={settings.isPending ? 'Cargando atención…' : 'Editar atención y contacto'}
        variant="secondary"
        disabled={!settings.data || !business.is_verified}
        onPress={() => setEditing(true)}
      />
      {settings.isError ? (
        <>
          <Feedback error text="No pudimos cargar la atención." />
          <Button label="Reintentar" variant="link" onPress={() => void settings.refetch()} />
        </>
      ) : null}
      {editing && settings.data ? (
        <ServiceForm
          businessId={business.id}
          initial={settings.data}
          close={() => {
            setEditing(false);
            void settings.refetch();
          }}
        />
      ) : null}
    </View>
  );
}

function ServiceForm({
  businessId,
  initial,
  close,
}: {
  businessId: string;
  initial: ServiceSettings;
  close: () => void;
}) {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? '');
  const [etaMin, setEtaMin] = useState(initial.eta_min?.toString() ?? '');
  const [etaMax, setEtaMax] = useState(initial.eta_max?.toString() ?? '');
  const [reported, setReported] = useState(initial.schedule !== null);
  const [schedule, setSchedule] = useState(initial.schedule ?? []);
  const parsed = serviceSettingsSchema.safeParse({
    whatsapp: whatsapp.trim() || null,
    schedule: reported ? schedule : null,
    eta_min: etaMin.trim() === '' ? null : Number(etaMin),
    eta_max: etaMax.trim() === '' ? null : Number(etaMax),
    revision: initial.revision,
  });
  const save = useMutation({
    mutationFn: async (values: ServiceSettings) => {
      const { error } = await getSupabase().rpc('set_business_service', {
        p_distributor_id: businessId,
        p_whatsapp: values.whatsapp,
        p_schedule: values.schedule,
        p_eta_min: values.eta_min,
        p_eta_max: values.eta_max,
        p_revision: values.revision,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-service'] }),
        queryClient.invalidateQueries({ queryKey: ['delivery-options'] }),
      ]);
      close();
    },
  });
  const update = (day: number, key: 'open' | 'close', value: string) =>
    setSchedule((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, [key]: value } : entry)),
    );
  return (
    <BottomSheet
      visible
      title="Atención y contacto"
      onClose={close}
      dismissible={!save.isPending}
      saving={save.isPending}
      saveDisabled={!parsed.success}
      onSave={() => {
        if (parsed.success) save.mutate(parsed.data);
      }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        <Input
          label="WhatsApp comercial (opcional)"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          editable={!save.isPending}
          maxLength={11}
          placeholder="56912345678"
          help="Al guardarlo autorizas mostrar este contacto a clientes. Solo móviles chilenos: 56 + 9 + ocho dígitos. Vacío lo oculta."
        />
        <Text variant="note" style={ui.muted}>
          Los negocios de demostración no abren WhatsApp.
        </Text>
        <View style={ui.equalRow}>
          <View style={ui.flex}>
            <Input
              label="Llegada desde (min)"
              value={etaMin}
              onChangeText={setEtaMin}
              keyboardType="number-pad"
              editable={!save.isPending}
              maxLength={4}
            />
          </View>
          <View style={ui.flex}>
            <Input
              label="Hasta (min)"
              value={etaMax}
              onChangeText={setEtaMax}
              keyboardType="number-pad"
              editable={!save.isPending}
              maxLength={4}
            />
          </View>
        </View>
        <Text variant="note" style={ui.muted}>
          Estimación del negocio, no una promesa. Deja ambos vacíos si no puedes estimarla.
        </Text>
        <View style={ui.equalRow}>
          <View style={ui.flex}>
            <Text variant="label">Informar horario semanal</Text>
            <Text variant="note" style={ui.muted}>
              Hora de Chile · un turno por día · admite cierre después de medianoche.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Informar horario semanal"
            value={reported}
            onValueChange={setReported}
            disabled={save.isPending}
          />
        </View>
        {reported
          ? weekdays.map((day, index) => {
              const entry = schedule.find((item) => item.day === index);
              return (
                <View key={day} style={styles.day}>
                  <View style={ui.equalRow}>
                    <Text variant="label" style={ui.flex}>
                      {day}
                    </Text>
                    <Switch
                      accessibilityLabel={`Atiende ${day}`}
                      value={!!entry}
                      disabled={save.isPending}
                      onValueChange={(enabled) =>
                        setSchedule((current) =>
                          enabled
                            ? [...current, { day: index, open: '09:00', close: '18:00' }]
                            : current.filter((item) => item.day !== index),
                        )
                      }
                    />
                  </View>
                  {entry ? (
                    <View style={ui.equalRow}>
                      <View style={ui.flex}>
                        <Input
                          label={`Abre ${day}`}
                          placeholder="09:00"
                          value={entry.open}
                          editable={!save.isPending}
                          maxLength={5}
                          onChangeText={(value) => update(index, 'open', value)}
                        />
                      </View>
                      <View style={ui.flex}>
                        <Input
                          label={`Cierra ${day}`}
                          placeholder="18:00"
                          value={entry.close}
                          editable={!save.isPending}
                          maxLength={5}
                          onChangeText={(value) => update(index, 'close', value)}
                        />
                      </View>
                    </View>
                  ) : (
                    <Text variant="note" style={ui.muted}>
                      Cerrado
                    </Text>
                  )}
                </View>
              );
            })
          : null}
        {!parsed.success ? (
          <Feedback
            text="Revisa el móvil, ambas estimaciones (1 a 1.440 min) y las horas en formato HH:MM."
            error
          />
        ) : null}
        {save.isError ? <Feedback text={businessError(save.error)} error /> : null}
      </ScrollView>
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  form: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  day: {
    gap: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
});
