import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';
import { SignOutButton } from '@/features/auth/zone-screen';
import { useDriverWorkspace } from '@/features/driver/offer-data';
import { driverBlockingMessages, driverError } from '@/features/driver/offer-contracts';
import { getDisplayName } from '@/shared/ui/display-name';
import { Button, Card, Feedback, RefreshButton } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { ListRow } from '@/shared/ui/list-row';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Screen } from '@/shared/ui/screen';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { useDriverLicenseSubmission } from './document-data';
import { licenseSubmissionCopy } from './document-contracts';

export function DriverAccountScreen() {
  const { session, retry } = useAuth();
  const workspace = useDriverWorkspace();
  const license = useDriverLicenseSubmission(workspace.isError ? undefined : workspace.data);
  const [accessOpen, setAccessOpen] = useState(false);
  const refreshInFlight = useRef<Promise<unknown> | null>(null);
  const name = getDisplayName(session?.user.user_metadata, session?.user.email);
  const access = !workspace.isError ? workspace.data : undefined;
  const business = access?.business;
  const licenseNotice = licenseSubmissionCopy[license.submission];
  const blockingMessage =
    access?.blocking_reason === 'driver_documents'
      ? licenseNotice.description
      : access?.blocking_reason
        ? driverBlockingMessages[access.blocking_reason]
        : undefined;
  const status = workspace.isPending
    ? 'Revisando acceso…'
    : workspace.isError
      ? 'Acceso sin confirmar'
      : access?.can_receive_offers
        ? 'Requisitos de reparto al día'
        : access?.blocking_reason === 'driver_documents'
          ? licenseNotice.title
          : 'Requisitos de reparto pendientes';
  const refreshAccess = () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const request = Promise.allSettled([
      workspace.refetch({ cancelRefetch: false }),
      retry(),
      license.refresh(),
    ]).finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = request;
    return request;
  };
  return (
    <Screen
      title="Mi cuenta de conductor"
      compactHeader
      onBack={() => router.replace('/driver')}
      onRefresh={refreshAccess}
      tabbed
    >
      <Card style={styles.identity}>
        <View style={styles.person}>
          <View style={styles.avatar}>
            <Icon name="user" size={theme.layout.brandMark} color={theme.colors.text} />
          </View>
          <View style={styles.flex}>
            <Text variant="note" style={styles.onDark}>
              Conductor Gasway
            </Text>
            <Text variant="title" accessibilityRole="header" style={styles.onDark}>
              {name}
            </Text>
          </View>
        </View>
        {session?.user.email ? (
          <Text selectable variant="note" style={styles.onDark}>
            {session.user.email}
          </Text>
        ) : null}
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Ver mi habilitación: ${status}`}
          onPress={() => setAccessOpen(true)}
          style={styles.access}
        >
          {workspace.isPending ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Icon name={access?.can_receive_offers ? 'check' : 'info'} color={theme.colors.lime} />
          )}
          <Text variant="label" style={[styles.flex, styles.onDark]}>
            {status}
          </Text>
          <Icon name="arrowRight" color={theme.colors.background} size={theme.spacing.screen} />
        </PulsePressable>
      </Card>
      {workspace.isPending ? (
        <Skeleton rows={2} />
      ) : workspace.isError ? (
        <View style={styles.section}>
          <Feedback text={driverError(workspace.error)} error />
          <RefreshButton label="Revisar mi acceso" variant="secondary" onRefresh={refreshAccess} />
        </View>
      ) : access ? (
        <View style={styles.section}>
          <Text variant="subtitle" accessibilityRole="header">
            Mi distribuidora
          </Text>
          <Card style={styles.business}>
            <View style={styles.businessHeading}>
              <View style={styles.businessIcon}>
                <Icon name="home" />
              </View>
              <Text variant="subtitle" style={styles.flex}>
                {business?.name ?? 'Sin distribuidora'}
              </Text>
              {business?.is_demo ? (
                <View style={styles.chip}>
                  <Text variant="note" style={styles.muted}>
                    Demo
                  </Text>
                </View>
              ) : null}
            </View>
            {business && business.brands.length > 0 ? (
              <View style={styles.brands}>
                {business.brands.map((brand) => (
                  <View key={brand} style={styles.chip}>
                    <Text variant="note" style={styles.muted}>
                      {brand}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {access.blocking_reason ? (
              <Feedback text={blockingMessage!} error={license.submission !== 'in_review'} />
            ) : null}
          </Card>
          {access.blocking_reason === 'driver_documents' ? (
            <Button
              label={licenseNotice.action}
              variant={license.submission === 'in_review' ? 'secondary' : 'primary'}
              disabled={license.submission === 'checking'}
              onPress={() => router.push('/driver-documents')}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text variant="subtitle" accessibilityRole="header">
          Tu espacio
        </Text>
        <Card style={styles.actions}>
          <ListRow
            title="Mi licencia y documentos"
            subtitle="Tus datos, archivos y revisión de Gasway"
            leading={<Icon name="orders" />}
            onPress={() => router.push('/driver-documents')}
          />
          <ListRow
            title="Disponibilidad y cobertura"
            leading={<Icon name="pin" />}
            onPress={() => router.replace('/driver-coverage')}
          />
          {access?.can_manage_business ? (
            <ListRow
              title="Gestionar mi negocio"
              leading={<Icon name="home" />}
              onPress={() => router.push('/business')}
            />
          ) : null}
          <ListRow
            title="Comprar como cliente"
            leading={<Icon name="orders" />}
            onPress={() => router.replace('/customer')}
          />
        </Card>
      </View>
      <View style={styles.signOut}>
        <SignOutButton discreet />
      </View>
      <BottomSheet
        visible={accessOpen}
        title="Tu habilitación"
        onClose={() => setAccessOpen(false)}
      >
        <ScrollView contentContainerStyle={styles.section}>
          {workspace.isPending ? (
            <Skeleton rows={2} />
          ) : workspace.isError ? (
            <Feedback text={driverError(workspace.error)} error />
          ) : access ? (
            <>
              <ListRow
                title="Acceso de Gasway"
                subtitle={access.is_verified ? 'Aprobado' : 'No aprobado'}
                leading={<Icon name="truck" />}
              />
              <ListRow
                title="Distribuidora"
                subtitle={business?.name ?? 'Sin vinculación'}
                leading={<Icon name="home" />}
              />
              {access.blocking_reason ? (
                <Feedback text={blockingMessage!} error={license.submission !== 'in_review'} />
              ) : null}
              <Button
                label="Mi licencia y documentos"
                variant="secondary"
                onPress={() => {
                  setAccessOpen(false);
                  router.push('/driver-documents');
                }}
              />
              <Text variant="note" style={styles.muted}>
                Para repartir necesitas el acceso aprobado, tu licencia vigente revisada y un
                vehículo habilitado. Después puedes activar tu disponibilidad.
              </Text>
            </>
          ) : null}
          <RefreshButton
            label="Actualizar mi acceso"
            variant="secondary"
            onRefresh={refreshAccess}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: theme.spacing.none },
  section: { gap: theme.spacing.compact },
  onDark: { color: theme.colors.background },
  muted: { color: theme.colors.primary },
  identity: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    borderRadius: theme.radii.hero,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  person: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
  avatar: {
    width: theme.layout.illustrationSelector,
    height: theme.layout.illustrationSelector,
    backgroundColor: theme.colors.lime,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  access: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.primary,
    paddingTop: theme.spacing.md,
    minHeight: theme.layout.touchTarget,
  },
  business: { padding: theme.spacing.md, gap: theme.spacing.compact },
  businessHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  businessIcon: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brands: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background,
  },
  actions: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.none,
    gap: theme.spacing.none,
  },
  signOut: { paddingHorizontal: theme.spacing.md },
});
