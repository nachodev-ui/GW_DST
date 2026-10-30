import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import {
  serviceSettingsSchema,
  serviceStatus,
  weekdays,
  type ServiceSettings,
} from '@/shared/orders/delivery-options';
import { Button, Feedback, StatusBadge } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import type { Business } from './business-contracts';
import { businessStyles as s } from './business-shell';
import { ServiceSettingsForm, type ServiceSection } from './service-settings-form';

const unreported: ServiceSettings = {
  whatsapp: null,
  schedule: null,
  eta_min: null,
  eta_max: null,
  revision: 0,
};
const week = [1, 2, 3, 4, 5, 6, 0] as const;
const shortDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export function ServiceSettingsEditor({ business }: { business: Business }) {
  const { session } = useAuth();
  const [editing, setEditing] = useState<ServiceSection | null>(null);
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
  const data = settings.data;
  const status = data ? serviceStatus(data.schedule) : null;
  const timeRanges = [
    ...new Set(
      data?.schedule?.map(
        (entry) => `${entry.open}–${entry.close}${entry.close < entry.open ? ' (+1 día)' : ''}`,
      ) ?? [],
    ),
  ];
  return (
    <View style={styles.section}>
      {data && status ? (
        <>
          <ServiceCard
            title="Horario semanal"
            icon="calendar"
            value={status.label}
            disabled={!business.is_verified}
            onPress={() => setEditing('schedule')}
            accessibilityLabel={`Editar horario semanal. ${status.label}. ${data.schedule === null ? 'Sin informar' : data.schedule.map((entry) => `${weekdays[entry.day]}, ${entry.open} a ${entry.close}`).join('. ')}`}
          >
            <StatusBadge
              label={
                status.open === true
                  ? 'Abierto ahora'
                  : status.open === false
                    ? 'Cerrado ahora'
                    : 'Sin informar'
              }
              tone={status.open === true ? 'success' : 'neutral'}
              labelVariant={status.open === true ? 'subtitle' : 'label'}
            />
            {timeRanges.length === 1 ? <Text variant="subtitle">{timeRanges[0]}</Text> : null}
            {data.schedule !== null ? (
              <View style={styles.week}>
                {week.map((day) => {
                  const entry = data.schedule?.find((item) => item.day === day);
                  return (
                    <View key={day} style={[styles.weekDay, entry && styles.activeDay]}>
                      <Text variant="label" compact style={entry ? styles.activeDayLabel : s.muted}>
                        {shortDays[day]}
                      </Text>
                      {entry ? (
                        <Icon name="check" size={theme.layout.tagRemoveIcon} />
                      ) : (
                        <Text variant="note" compact style={s.muted}>
                          –
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}
            {data.schedule === null || status.open === false ? (
              <Text variant="note" style={s.muted}>
                {data.schedule === null ? 'Define días y horas de atención' : status.label}
              </Text>
            ) : null}
          </ServiceCard>
          <View style={styles.details}>
            <ServiceCard
              title="WhatsApp"
              icon="chat"
              disabled={!business.is_verified}
              value={
                data.whatsapp
                  ? `+56 9 ${data.whatsapp.slice(3, 7)} ${data.whatsapp.slice(7)}`
                  : 'Agregar contacto'
              }
              onPress={() => setEditing('contact')}
            />
            <ServiceCard
              title="Reparto estimado"
              icon="truck"
              disabled={!business.is_verified}
              value={
                data.eta_min === null
                  ? 'Añadir tiempo'
                  : data.eta_min === data.eta_max
                    ? `${data.eta_min} min`
                    : `${data.eta_min}–${data.eta_max} min`
              }
              onPress={() => setEditing('eta')}
            />
          </View>
        </>
      ) : settings.isPending ? (
        <Feedback text="Cargando horario y contacto…" />
      ) : null}
      {settings.isError ? (
        <>
          <Feedback error text="No pudimos cargar la atención." />
          <Button label="Reintentar" variant="link" onPress={() => void settings.refetch()} />
        </>
      ) : null}
      {editing && data ? (
        <ServiceSettingsForm
          business={business}
          section={editing}
          initial={data}
          close={() => setEditing(null)}
        />
      ) : null}
    </View>
  );
}

function ServiceCard({
  title,
  icon,
  value,
  onPress,
  disabled,
  accessibilityLabel,
  children,
}: {
  title: string;
  icon: IconName;
  value: string;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Editar ${title}. ${value}`}
      accessibilityHint="Abre su formulario de edición"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconWell}>
          <Icon name={icon} />
        </View>
        <Text variant="note" style={[styles.title, s.muted]}>
          {title}
        </Text>
        <Icon name="edit" size={theme.layout.tagRemoveIcon} color={theme.business.muted} />
      </View>
      <View style={styles.content}>
        {icon !== 'calendar' ? (
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        ) : null}
        {children}
      </View>
    </PulsePressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.lg },
  details: { gap: theme.spacing.compact },
  card: {
    backgroundColor: theme.business.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    borderRadius: theme.radii.card,
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
  },
  title: { flex: 1, minWidth: theme.spacing.none },
  content: { gap: theme.spacing.md },
  iconWell: {
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.compact,
    borderRadius: theme.business.radius,
    backgroundColor: theme.colors.background,
  },
  weekDay: {
    flex: 1,
    minWidth: theme.spacing.none,
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: theme.borders.focus,
    borderBottomColor: theme.business.border,
  },
  activeDay: { borderBottomColor: theme.colors.primary },
  activeDayLabel: { color: theme.colors.primary },
});
