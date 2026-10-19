import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Feedback, StatusBadge } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import {
  driverBlockingMessages,
  type DriverSettings,
  type DriverWorkspace,
} from '@/features/driver/offer-contracts';

export function DriverBusinessCard({ workspace }: { workspace: DriverWorkspace }) {
  return (
    <Card>
      <Text variant="label">Negocio afiliado</Text>
      <Text variant="subtitle">
        {workspace.business?.name ?? 'Vinculación pendiente de regularizar'}
      </Text>
      {workspace.business ? (
        <Text variant="note">
          Marcas configuradas: {workspace.business.brands.join(', ') || 'Sin configurar'}
        </Text>
      ) : null}
      {workspace.blocking_reason ? (
        <Feedback text={driverBlockingMessages[workspace.blocking_reason]} error />
      ) : null}
      {workspace.business?.is_demo ? (
        <Feedback text="Negocio de prueba con datos ficticios." />
      ) : null}
    </Card>
  );
}

export function DriverAvailability({
  settings,
  workspace,
  hasOrder,
  busy,
  uncertain,
  onChange,
}: {
  settings: DriverSettings | undefined;
  workspace: DriverWorkspace | undefined;
  hasOrder: boolean;
  busy: boolean;
  uncertain: boolean;
  onChange: (available: boolean) => void;
}) {
  const canActivate =
    !!settings && !!workspace?.can_receive_offers && settings.commune_codes.length > 0 && !hasOrder;
  const blocked = !!workspace && !workspace.can_receive_offers;
  return (
    <Card>
      <StatusBadge
        label={
          hasOrder
            ? 'Entrega en curso'
            : blocked
              ? 'Disponibilidad bloqueada'
              : settings?.is_available
                ? 'Disponible'
                : 'No disponible'
        }
        icon={hasOrder ? 'truck' : 'clock'}
        tone={settings?.is_available && !hasOrder && !blocked ? 'success' : 'accent'}
      />
      <Text>
        {hasOrder
          ? 'Termina tu entrega actual antes de recibir otro pedido.'
          : blocked
            ? 'No puedes recibir nuevos pedidos hasta regularizar tu habilitación o la del negocio.'
            : settings?.is_available
              ? 'Puedes recibir ofertas de tu negocio en tus comunas guardadas.'
              : 'Activa tu disponibilidad cuando estés listo para repartir.'}
      </Text>
      {settings?.commune_codes.length === 0 ? (
        <Text variant="note">Guarda al menos una comuna en Cobertura antes de activarte.</Text>
      ) : null}
      <Button
        label={
          busy
            ? 'Guardando…'
            : settings?.is_available
              ? 'Dejar de recibir ofertas'
              : 'Activar disponibilidad'
        }
        variant={settings?.is_available ? 'secondary' : 'primary'}
        disabled={busy || uncertain || !settings || (!settings.is_available && !canActivate)}
        onPress={() => {
          if (settings) onChange(!settings.is_available);
        }}
      />
    </Card>
  );
}

export function CurrentDeliveryCard({ id }: { id: string }) {
  return (
    <Card style={styles.current}>
      <Text variant="subtitle">Tu entrega actual</Text>
      <Text>Continúa con el pedido que ya tienes asignado.</Text>
      <Button
        label="Ver mi entrega"
        onPress={() => router.push({ pathname: '/driver-order/[id]', params: { id } })}
      />
    </Card>
  );
}

export const driverStyles = StyleSheet.create({
  list: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  section: { gap: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  muted: { color: theme.colors.textMuted },
});
const styles = StyleSheet.create({
  current: { borderLeftWidth: theme.borders.accent, borderLeftColor: theme.colors.primary },
});
