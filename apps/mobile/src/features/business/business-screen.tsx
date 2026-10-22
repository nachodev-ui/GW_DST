import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { useMyBusinesses, fetchBusinessProducts } from './business-data';
import { type Business } from './business-contracts';
import { useTeamPages } from './use-team-pages';
import { useBusinessCoverage } from './coverage-data';
import { communeCoverageState, groupCoverage } from './coverage-contracts';
import { Button, Card, Feedback, OptionCard, StatusBadge } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { theme } from '@/theme';
import { WorkspaceHero, WorkspaceHeading, WorkspaceMetric, workspaceStyles } from './workspace-ui';

export function BusinessScreen() {
  const businesses = useMyBusinesses();
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const [selected, setSelected] = useState<string | null>(businessId ?? null);
  const business = businesses.data?.find((item) => item.id === selected) ?? businesses.data?.[0];
  if (!business) return null; // The layout handles access and loading.
  return (
    <Screen compactHeader title="Mi negocio" onBack={() => router.replace('/')}>
      {businesses.data && businesses.data.length > 1 ? (
        <View
          style={styles.stack}
          accessibilityRole="radiogroup"
          accessibilityLabel="Negocio que gestionas"
        >
          {businesses.data.map((item) => (
            <OptionCard
              key={item.id}
              label={item.name}
              selected={business.id === item.id}
              onPress={() => setSelected(item.id)}
            />
          ))}
        </View>
      ) : null}
      <BusinessSummary key={business.id} business={business} />
    </Screen>
  );
}

function BusinessSummary({ business }: { business: Business }) {
  const { session } = useAuth();
  const team = useTeamPages(business.id);
  const coverage = useBusinessCoverage(business.id);
  const coverageData = coverage.data;
  const communes = coverageData ? groupCoverage(coverageData) : [];
  const coveredCount = communes.length;
  const availableCount = coverageData
    ? communes.filter((commune) => communeCoverageState(coverageData, commune).available > 0).length
    : 0;
  const products = useQuery({
    queryKey: ['business-products', session?.user.id, business.id],
    queryFn: () => fetchBusinessProducts(business.id),
    refetchInterval: 30_000,
  });
  const people = team.data?.pages.flatMap((page) => page.items) ?? [];
  const driverCount = new Set(
    people
      .filter(
        (person) =>
          person.driver_id &&
          person.is_current &&
          (person.invitation_status === 'accepted' || person.invitation_status === 'legacy'),
      )
      .map((person) => person.driver_id),
  ).size;
  const pendingCount = people.filter(
    (person) => person.invitation_status === 'pending' && person.is_current,
  ).length;
  const count = (value: number) => `${value}${team.hasNextPage ? '+' : ''}`;
  const open = (
    pathname: '/business/details' | '/business/team' | '/business/catalog' | '/business/coverage',
  ) => router.push({ pathname, params: { businessId: business.id } });
  return (
    <>
      <WorkspaceHero
        eyebrow="ESPACIO DE NEGOCIO"
        title={business.name}
        description="Equipo, cobertura y catálogo."
      >
        <StatusBadge
          label={business.is_verified ? 'Negocio habilitado' : 'Negocio no habilitado'}
          icon={business.is_verified ? 'check' : 'clock'}
          tone={business.is_verified ? 'success' : 'warning'}
        />
        <Text variant="note" style={workspaceStyles.heroDescription}>
          {business.member_role === 'owner' ? 'Responsable del negocio' : 'Encargado del negocio'}
          {' · '}
          {business.brands.join(' / ') || 'Sin marcas configuradas'}
        </Text>
      </WorkspaceHero>
      <WorkspaceHeading title="Tu negocio de un vistazo" />
      <View style={workspaceStyles.metrics}>
        <WorkspaceMetric
          value={team.isPending || team.isError ? '—' : count(driverCount)}
          label={driverCount === 1 ? 'Conductor vinculado' : 'Conductores vinculados'}
          icon="truck"
          onPress={() => open('/business/team')}
        />
        <WorkspaceMetric
          value={
            products.isPending || products.isError
              ? '—'
              : String(products.data.filter((p) => p.is_listed).length)
          }
          label="Productos en catálogo"
          icon="orders"
          onPress={() => open('/business/catalog')}
        />
      </View>
      {team.isError ? (
        <Feedback text="No pudimos cargar el equipo. Abre Equipo para reintentar." error />
      ) : null}
      {products.isError ? (
        <Feedback text="No pudimos cargar el catálogo. Abre Catálogo para reintentar." error />
      ) : null}
      {team.hasNextPage ? (
        <Text variant="note" style={workspaceStyles.muted}>
          El + indica que quedan registros del equipo por cargar.
        </Text>
      ) : null}
      <WorkspaceHeading title="Gestiona tu negocio" />
      <View style={styles.navigation}>
        <SummaryCard
          title="Datos del negocio"
          icon="home"
          onPress={() => open('/business/details')}
        >
          <Text variant="note" style={workspaceStyles.muted}>
            Información, marcas y tu acceso
          </Text>
        </SummaryCard>
        <SummaryCard title="Equipo" icon="user" onPress={() => open('/business/team')}>
          {team.isPending ? (
            <Feedback text="Cargando equipo…" />
          ) : team.isError ? (
            <Feedback text="No pudimos cargar el resumen. Abre Equipo para reintentar." error />
          ) : (
            <>
              <StatusBadge
                label={
                  pendingCount === 0
                    ? team.hasNextPage
                      ? 'Sin pendientes en los registros cargados'
                      : 'Sin invitaciones pendientes'
                    : `${count(pendingCount)} ${pendingCount === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}`
                }
                icon={pendingCount === 0 ? 'check' : 'mail'}
                tone={pendingCount === 0 ? 'neutral' : 'warning'}
              />
            </>
          )}
        </SummaryCard>
        <SummaryCard title="Cobertura" icon="pin" onPress={() => open('/business/coverage')}>
          <Text variant="note" style={workspaceStyles.muted}>
            {coverage.data && !coverage.isError
              ? `${coveredCount} ${coveredCount === 1 ? 'comuna' : 'comunas'} · ${availableCount} con reparto ahora`
              : coverage.isError
                ? 'No pudimos actualizar. Toca para reintentar.'
                : 'Cargando comunas…'}
          </Text>
        </SummaryCard>
        <SummaryCard title="Catálogo" icon="orders" onPress={() => open('/business/catalog')}>
          <Text variant="note" style={workspaceStyles.muted}>
            Edita precios y cilindros disponibles
          </Text>
        </SummaryCard>
      </View>
      {business.is_demo ? (
        <View style={workspaceStyles.note}>
          <Icon name="clock" color={theme.colors.textMuted} />
          <View style={workspaceStyles.grow}>
            <Text variant="label">Estás en un negocio de prueba</Text>
            <Text variant="note" style={workspaceStyles.muted}>
              Datos y revisión ficticios. No habilita un piloto real.
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

function SummaryCard({
  title,
  icon,
  onPress,
  children,
}: PropsWithChildren<{
  title: string;
  icon: IconName;
  onPress: () => void;
}>) {
  return (
    <Card style={styles.navigationRow} onPress={onPress}>
      <View style={styles.icon}>
        <Icon name={icon} />
      </View>
      <View style={[styles.grow, styles.stack]}>
        <Text variant="label">{title}</Text>
        {children}
      </View>
      <Icon name="arrowRight" color={theme.colors.textMuted} />
    </Card>
  );
}

export function BusinessDetailsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const businesses = useMyBusinesses();
  const business = businesses.data?.find((item) => item.id === businessId);
  return (
    <Screen
      compactHeader
      title="Datos del negocio"
      onBack={() => router.replace({ pathname: '/business/manage', params: { businessId } })}
    >
      {business ? (
        <>
          <WorkspaceHero
            eyebrow="IDENTIDAD DEL NEGOCIO"
            title={business.name}
            description="La información que identifica a tu negocio en Gasway."
          >
            <StatusBadge
              label={business.is_verified ? 'Negocio habilitado' : 'Negocio no habilitado'}
              tone={business.is_verified ? 'success' : 'warning'}
            />
          </WorkspaceHero>
          <WorkspaceHeading title="Información general" />
          <Card style={styles.card}>
            <Text variant="note">Nombre del negocio</Text>
            <Text variant="subtitle">{business.name}</Text>
            <Text variant="note">Responsable</Text>
            <Text>Nombre no disponible en esta vista</Text>
            <Text variant="note">Tu acceso</Text>
            <Text>
              {business.member_role === 'owner'
                ? 'Responsable del negocio'
                : 'Encargado del negocio'}
            </Text>
          </Card>
          <Card style={styles.card}>
            <Text variant="subtitle">Marcas configuradas</Text>
            <View style={styles.brands}>
              {business.brands.map((brand) => (
                <StatusBadge key={brand} label={brand} icon="check" />
              ))}
            </View>
            {!business.brands.length ? <Text variant="note">Sin marcas configuradas.</Text> : null}
          </Card>
          {!business.is_verified ? (
            <Feedback
              text="El negocio no está habilitado. Contacta a administración para revisar su estado."
              error
            />
          ) : null}
          {business.is_demo ? (
            <Feedback text="Negocio de prueba. Datos y revisión ficticios; no acredita antecedentes ni habilita un piloto real." />
          ) : null}
          <Button
            label="Actualizar datos"
            variant="secondary"
            disabled={businesses.isFetching}
            onPress={() => void businesses.refetch()}
          />
        </>
      ) : (
        <Feedback text="No tienes acceso a este negocio. Vuelve a Mi negocio." error />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.compact },
  card: { backgroundColor: theme.colors.surface, gap: theme.spacing.md },
  grow: { flex: 1 },
  navigation: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    overflow: 'hidden',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.spacing.none,
    borderWidth: theme.spacing.none,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
    padding: theme.spacing.md,
    ...theme.elevation.flat,
  },
  icon: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.compact,
    borderRadius: theme.radii.control,
  },
  brands: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
