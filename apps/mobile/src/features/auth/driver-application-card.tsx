import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchDriverApplication } from '@/features/auth/driver-application';
import { Button, Card, Feedback } from '@/shared/ui/components';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function DriverApplicationCard() {
  const { session, zone } = useAuth();
  const queryClient = useQueryClient();
  const application = useQuery({
    queryKey: ['driver-application', session?.user.id],
    queryFn: () => fetchDriverApplication(session!.user.id),
    enabled: !!session,
    staleTime: 0,
    refetchInterval: 30_000,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['driver-application'] }),
      queryClient.invalidateQueries({ queryKey: ['auth-access'] }),
    ]);
  const data = application.data;

  return (
    <Card style={styles.card}>
      <Text variant="subtitle" accessibilityRole="header">
        Repartir con Gasway
      </Text>
      {application.isPending ? (
        <Skeleton rows={2} />
      ) : application.isError ? (
        <>
          <Feedback text="No pudimos consultar tu postulación. Puedes seguir comprando." error />
          <Button label="Reintentar consulta" variant="secondary" onPress={() => void refresh()} />
        </>
      ) : data ? (
        <>
          <Text variant="label" accessibilityLiveRegion="polite">
            {data.status === 'pending'
              ? data.applicant_name
                ? 'Habilitación en revisión'
                : 'Antecedentes incompletos'
              : data.status === 'rejected'
                ? 'Solicitud rechazada'
                : zone === 'driver'
                  ? 'Conductor habilitado'
                  : 'Acceso a reparto no habilitado'}
          </Text>
          {data.decision_reason ? (
            <View style={styles.reason}>
              <Text variant="label">Motivo de la decisión</Text>
              <Text selectable>{data.decision_reason}</Text>
            </View>
          ) : null}
          {data.reviewed_at ? (
            <Text variant="note" style={styles.muted}>
              Revisada el{' '}
              {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(
                new Date(data.reviewed_at),
              )}
            </Text>
          ) : null}
          <Text style={styles.muted}>
            {data.status === 'pending'
              ? data.applicant_name
                ? 'El equipo está revisando tus antecedentes. Mientras tanto, puedes seguir comprando.'
                : 'Todavía debes aceptar una invitación del negocio y completar tus antecedentes. Puedes seguir comprando.'
              : data.status === 'rejected'
                ? 'Puedes seguir comprando. Corrige el motivo y pide una nueva invitación al negocio antes de solicitar otra revisión.'
                : zone === 'driver'
                  ? 'Tu acceso de reparto está habilitado.'
                  : 'La solicitud fue aprobada anteriormente, pero tu habilitación actual no está activa. Actualiza tu acceso o contacta a administración de Gasway.'}
          </Text>
          {data.requested_distributor_name ? (
            <Text variant="label">Negocio: {data.requested_distributor_name}</Text>
          ) : null}
          {data.status !== 'approved' ? (
            <Button
              label="Activar mi acceso como conductor"
              disabled={application.isFetching}
              onPress={() => router.push('/customer/driver-application')}
            />
          ) : null}
          <Button
            label={application.isFetching ? 'Actualizando…' : 'Actualizar estado'}
            variant="secondary"
            disabled={application.isFetching}
            onPress={() => void refresh()}
          />
        </>
      ) : (
        <>
          <Text style={styles.muted}>
            Tu negocio debe invitarte a su equipo. Acepta la invitación y completa tus antecedentes;
            puedes seguir comprando.
          </Text>
          <Button
            label="Activar mi acceso como conductor"
            disabled={application.isFetching}
            onPress={() => router.push('/customer/driver-application')}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: theme.borders.accent,
    borderLeftColor: theme.colors.primary,
    gap: theme.spacing.md,
  },
  reason: { gap: theme.spacing.xs },
  muted: { color: theme.colors.textMuted },
});
