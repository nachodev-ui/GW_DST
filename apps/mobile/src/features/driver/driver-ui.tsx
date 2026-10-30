import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, StatusBadge } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { Icon } from '@/shared/ui/icon';
import { theme } from '@/theme';
import { licenseSubmissionCopy, type DriverLicenseSubmission } from './document-contracts';
import {
  driverBlockingMessages,
  type DriverSettings,
  type DriverWorkspace,
} from '@/features/driver/offer-contracts';

export function DriverAvailability({
  settings,
  workspace,
  hasOrder,
  busy,
  uncertain,
  onChange,
  appearance = 'standard',
  checking = false,
  compact = false,
  licenseSubmission = 'unknown',
}: {
  settings: DriverSettings | undefined;
  workspace: DriverWorkspace | undefined;
  hasOrder: boolean;
  busy: boolean;
  uncertain: boolean;
  onChange: (available: boolean) => void;
  appearance?: 'standard' | 'home' | 'coverage';
  checking?: boolean;
  compact?: boolean;
  licenseSubmission?: DriverLicenseSubmission;
}) {
  const canActivate =
    !!settings && !!workspace?.can_receive_offers && settings.communes.length > 0 && !hasOrder;
  const blocked = !!workspace && !workspace.can_receive_offers;
  const licenseBlocked = blocked && workspace?.blocking_reason === 'driver_documents';
  const licenseNotice = licenseSubmissionCopy[licenseSubmission];
  if (appearance === 'coverage') {
    const disabled = busy || uncertain || !settings || (!settings.is_available && !canActivate);
    const available = !uncertain && !!settings?.is_available && !hasOrder && !blocked;
    return (
      <Card style={styles.coverageAvailability}>
        <View style={styles.coverageControl}>
          <View style={styles.coverageIcon}>
            <Icon name={hasOrder ? 'truck' : available ? 'check' : 'pause'} />
          </View>
          <View style={styles.flexible}>
            <Text variant="note" style={driverStyles.muted}>
              Disponibilidad
            </Text>
            <Text variant="subtitle" accessibilityRole="header">
              {checking
                ? 'Comprobando…'
                : uncertain
                  ? 'Sin confirmar'
                  : hasOrder
                    ? 'Entrega en curso'
                    : blocked
                      ? licenseBlocked
                        ? licenseNotice.title
                        : 'Acceso pendiente'
                      : available
                        ? 'Disponible'
                        : 'En pausa'}
            </Text>
          </View>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel="Recibir nuevas ofertas"
              accessibilityHint="No activa la ubicación del teléfono."
              accessibilityState={{ disabled, busy: busy || checking }}
              value={settings?.is_available === true}
              disabled={disabled}
              onValueChange={(next) => {
                if (
                  !disabled &&
                  settings &&
                  next !== settings.is_available &&
                  (!next || canActivate)
                )
                  onChange(next);
              }}
              trackColor={{ false: theme.colors.surfaceBorder, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
              ios_backgroundColor={theme.colors.surfaceBorder}
            />
          </View>
        </View>
        <View style={styles.coverageControl}>
          {busy ? <ActivityIndicator color={theme.colors.primary} /> : null}
          <Text variant="note" style={[styles.flexible, driverStyles.muted]}>
            {busy
              ? 'Guardando disponibilidad…'
              : checking
                ? 'Revisando tu jornada.'
                : uncertain
                  ? 'Actualiza para comprobar tu estado.'
                  : hasOrder
                    ? 'Termina tu entrega antes de recibir otra.'
                    : blocked && workspace?.blocking_reason
                      ? licenseBlocked
                        ? licenseNotice.description
                        : driverBlockingMessages[workspace.blocking_reason]
                      : settings?.communes.length === 0
                        ? 'Tu distribuidora debe definir las comunas.'
                        : available
                          ? 'Recibes nuevas ofertas de tu zona.'
                          : 'Activa para recibir nuevas ofertas.'}
          </Text>
        </View>
        {blocked && !uncertain && !hasOrder ? (
          <Button
            label={
              workspace?.blocking_reason === 'driver_documents'
                ? licenseNotice.action
                : 'Revisar habilitación'
            }
            variant="link"
            disabled={busy || (licenseBlocked && licenseSubmission === 'checking')}
            onPress={() =>
              router.push(
                workspace?.blocking_reason === 'driver_documents'
                  ? '/driver-documents'
                  : '/driver-account',
              )
            }
          />
        ) : null}
      </Card>
    );
  }
  if (appearance === 'home') {
    if (hasOrder)
      return settings?.is_available ? (
        <Button
          label={busy ? 'Guardando…' : 'Pausar disponibilidad'}
          variant="secondary"
          loading={busy}
          disabled={busy || uncertain}
          onPress={() => onChange(false)}
        />
      ) : null;
    const review = blocked && !settings?.is_available;
    const available = !uncertain && !!settings?.is_available && !blocked;
    if (compact && available)
      return (
        <Card style={styles.compactShift}>
          <View style={styles.flexible}>
            <Text variant="subtitle" style={styles.onDark}>
              Disponible
            </Text>
            <Text variant="note" style={styles.onDark}>
              Nuevas ofertas para ti
            </Text>
          </View>
          <View>
            <Button
              label={busy ? 'Guardando…' : 'Pausar'}
              accessibilityLabel="Pausar disponibilidad"
              loading={busy}
              variant="secondary"
              style={styles.shiftAction}
              disabled={busy || uncertain}
              onPress={() => onChange(false)}
            />
          </View>
        </Card>
      );
    return (
      <Card style={styles.shift}>
        <View style={styles.shiftHeader}>
          <View style={styles.shiftStatus}>
            <View
              style={[
                styles.dot,
                { backgroundColor: available ? theme.colors.lime : theme.colors.background },
              ]}
            />
            <Text variant="label" style={styles.onDark}>
              Tu disponibilidad
            </Text>
          </View>
          <Icon name={available ? 'truck' : 'clock'} color={theme.colors.lime} />
        </View>
        <Text variant="display" accessibilityRole="header" style={styles.onDark}>
          {checking
            ? 'Revisando tu jornada'
            : uncertain
              ? 'Estado sin confirmar'
              : blocked
                ? licenseBlocked
                  ? licenseNotice.title
                  : 'Revisa tu acceso'
                : available
                  ? 'Listo para repartir'
                  : '¿Listo para repartir?'}
        </Text>
        <Text style={styles.onDark}>
          {checking
            ? 'Un momento…'
            : uncertain
              ? 'Actualiza para comprobar tu disponibilidad.'
              : blocked && workspace?.blocking_reason
                ? licenseBlocked
                  ? licenseNotice.description
                  : driverBlockingMessages[workspace.blocking_reason]
                : settings?.communes.length === 0
                  ? 'Tu distribuidora debe definir las comunas.'
                  : available
                    ? 'Recibirás ofertas en tus comunas de reparto.'
                    : 'Activa tu disponibilidad cuando estés listo.'}
        </Text>
        <Button
          label={
            busy
              ? 'Guardando…'
              : checking
                ? 'Comprobando…'
                : review
                  ? workspace?.blocking_reason === 'driver_documents'
                    ? licenseNotice.action
                    : 'Revisar habilitación'
                  : settings?.is_available
                    ? 'Pausar disponibilidad'
                    : 'Comenzar a repartir'
          }
          variant="secondary"
          style={styles.shiftAction}
          loading={busy || checking}
          disabled={
            busy ||
            uncertain ||
            !settings ||
            (review && licenseBlocked && licenseSubmission === 'checking') ||
            (!review && !settings.is_available && !canActivate)
          }
          onPress={() => {
            if (review)
              router.push(
                workspace?.blocking_reason === 'driver_documents'
                  ? '/driver-documents'
                  : '/driver-account',
              );
            else if (settings) onChange(!settings.is_available);
          }}
        />
      </Card>
    );
  }
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
              ? 'Puedes recibir ofertas en las comunas de tu distribuidora.'
              : 'Activa tu disponibilidad cuando estés listo para repartir.'}
      </Text>
      {settings?.communes.length === 0 ? (
        <Text variant="note">Tu distribuidora debe definir las comunas de reparto.</Text>
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
  coverageAvailability: { gap: theme.spacing.compact, padding: theme.spacing.md },
  coverageControl: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  coverageIcon: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTarget: { minHeight: theme.layout.touchTarget, justifyContent: 'center' },
  shift: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.hero,
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    gap: theme.spacing.md,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  shiftStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dot: { width: theme.layout.dot, height: theme.layout.dot, borderRadius: theme.radii.pill },
  onDark: { color: theme.colors.background },
  shiftAction: { marginTop: theme.spacing.sm, backgroundColor: theme.colors.background },
  compactShift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
  },
  flexible: { flex: 1, minWidth: theme.spacing.none },
});
