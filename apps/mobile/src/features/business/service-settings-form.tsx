import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/shared/supabase/client';
import {
  serviceSettingsSchema,
  weekdays,
  type ServiceSettings,
} from '@/shared/orders/delivery-options';
import { Feedback, Input } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { businessError, type Business } from './business-contracts';
import { businessStyles as s } from './business-shell';

export type ServiceSection = 'schedule' | 'contact' | 'eta';
const sections: Record<ServiceSection, { title: string; icon: IconName; hint: string }> = {
  schedule: {
    title: 'Horario semanal',
    icon: 'calendar',
    hint: 'Hora de Chile · un turno por día',
  },
  contact: {
    title: 'WhatsApp comercial',
    icon: 'chat',
    hint: 'Un canal de consulta para tus clientes',
  },
  eta: {
    title: 'Tiempo de reparto',
    icon: 'truck',
    hint: 'Una referencia para planificar la entrega',
  },
};
const week = [1, 2, 3, 4, 5, 6, 0] as const;
const defaultServiceDay = (day: number) => ({
  day,
  open: day === 0 ? '10:00' : '09:00',
  close: day === 0 ? '15:00' : '20:00',
});

export function ServiceSettingsForm({
  business,
  section,
  initial,
  close,
}: {
  business: Business;
  section: ServiceSection;
  initial: ServiceSettings;
  close: () => void;
}) {
  const queryClient = useQueryClient();
  // A background refresh must not rebase an already open draft onto a newer revision.
  const [revision] = useState(initial.revision);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? '');
  const [etaMin, setEtaMin] = useState(initial.eta_min?.toString() ?? '');
  const [etaMax, setEtaMax] = useState(initial.eta_max?.toString() ?? '');
  // Suggestions become public only after explicitly saving the schedule sheet.
  const [reported, setReported] = useState(initial.schedule !== null || section === 'schedule');
  const [schedule, setSchedule] = useState(() => initial.schedule ?? week.map(defaultServiceDay));
  const parsed = serviceSettingsSchema.safeParse({
    whatsapp: whatsapp.trim() || null,
    schedule: reported ? schedule : null,
    eta_min: etaMin.trim() === '' ? null : Number(etaMin),
    eta_max: etaMax.trim() === '' ? null : Number(etaMax),
    revision,
  });
  const save = useMutation({
    mutationFn: async (values: ServiceSettings) => {
      const { error } = await getSupabase().rpc('set_business_service', {
        p_distributor_id: business.id,
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
  const content = sections[section];
  const validationMessage =
    section === 'contact'
      ? 'Usa 569 seguido de ocho dígitos, o deja el contacto vacío.'
      : section === 'eta'
        ? 'Completa ambos tiempos, entre 1 y 1.440 min. El máximo debe ser igual o mayor al mínimo.'
        : 'Revisa las horas: HH:MM, con apertura y cierre diferentes.';
  return (
    <BottomSheet
      visible
      title={content.title}
      onClose={close}
      dismissible={!save.isPending}
      saving={save.isPending}
      saveDisabled={!parsed.success}
      onSave={() => {
        if (parsed.success) save.mutate(parsed.data);
      }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
        <View style={styles.intro}>
          <Icon name={content.icon} size={theme.layout.brandMark} />
          <Text variant="note" style={[s.grow, s.muted]}>
            {content.hint}
          </Text>
        </View>
        {section === 'contact' ? (
          <>
            <Input
              label="Número de WhatsApp"
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
              editable={!save.isPending}
              maxLength={11}
              placeholder="56912345678"
              help="Al guardar, autorizas mostrarlo a clientes. Déjalo vacío para ocultarlo."
            />
            {business.is_demo ? (
              <Feedback text="En modo demo el contacto no abre WhatsApp." />
            ) : null}
          </>
        ) : null}
        {section === 'eta' ? (
          <>
            <View style={s.wrap}>
              <View style={s.flexCell}>
                <Input
                  label="Desde (min)"
                  value={etaMin}
                  onChangeText={setEtaMin}
                  keyboardType="number-pad"
                  editable={!save.isPending}
                  maxLength={4}
                  placeholder="20"
                />
              </View>
              <View style={s.flexCell}>
                <Input
                  label="Hasta (min)"
                  value={etaMax}
                  onChangeText={setEtaMax}
                  keyboardType="number-pad"
                  editable={!save.isPending}
                  maxLength={4}
                  placeholder="40"
                />
              </View>
            </View>
            <Text variant="note" style={s.muted}>
              Tiempo orientativo, sin garantía de llegada. Ambos vacíos lo ocultan.
            </Text>
          </>
        ) : null}
        {section === 'schedule' ? (
          <>
            <View style={styles.intro}>
              <View style={s.grow}>
                <Text variant="label">Publicar horario</Text>
                <Text variant="note" style={s.muted}>
                  {reported ? 'Desmarca los días que no atiendes' : 'Horario por confirmar'}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Publicar horario semanal"
                value={reported}
                onValueChange={setReported}
                disabled={save.isPending}
                trackColor={{ true: theme.colors.primary }}
              />
            </View>
            {reported
              ? week.map((day) => {
                  const entry = schedule.find((item) => item.day === day);
                  const name = weekdays[day];
                  return (
                    <View key={day} style={[styles.day, entry && styles.openDay]}>
                      <View style={s.row}>
                        <View style={s.grow}>
                          <Text variant="label">{name}</Text>
                          {!entry ? (
                            <Text variant="note" style={s.muted}>
                              Cerrado
                            </Text>
                          ) : null}
                        </View>
                        <Switch
                          accessibilityLabel={`Atiende ${name}`}
                          value={!!entry}
                          disabled={save.isPending}
                          trackColor={{ true: theme.colors.primary }}
                          onValueChange={(enabled) =>
                            setSchedule((current) =>
                              enabled
                                ? [...current, defaultServiceDay(day)]
                                : current.filter((item) => item.day !== day),
                            )
                          }
                        />
                      </View>
                      {entry ? (
                        <>
                          <View style={s.wrap}>
                            <View style={s.flexCell}>
                              <Input
                                label="Apertura"
                                accessibilityLabel={`Apertura del ${name}`}
                                placeholder={defaultServiceDay(day).open}
                                value={entry.open}
                                editable={!save.isPending}
                                maxLength={5}
                                onChangeText={(value) => update(day, 'open', value)}
                              />
                            </View>
                            <View style={s.flexCell}>
                              <Input
                                label="Cierre"
                                accessibilityLabel={`Cierre del ${name}`}
                                placeholder={defaultServiceDay(day).close}
                                value={entry.close}
                                editable={!save.isPending}
                                maxLength={5}
                                onChangeText={(value) => update(day, 'close', value)}
                              />
                            </View>
                          </View>
                          {entry.close < entry.open ? (
                            <Text variant="note" style={s.muted}>
                              Cierra al día siguiente
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  );
                })
              : null}
            <Text variant="note" style={s.muted}>
              Horas editables · sin excepciones automáticas por festivos.
            </Text>
            {reported && schedule.length === 0 ? (
              <Feedback text="Todos los días cerrados. Desactiva Publicar horario si aún no lo defines." />
            ) : null}
          </>
        ) : null}
        {!parsed.success ? <Feedback text={validationMessage} error /> : null}
        {save.isError ? <Feedback text={businessError(save.error)} error /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.business.soft,
    borderRadius: theme.business.radius,
  },
  day: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.business.radius,
  },
  openDay: { backgroundColor: theme.business.canvas },
});
