import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Share, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { confirmBusinessAffiliation } from '@/features/business/business-data';
import { useSelectedBusiness } from './business-shell';
import { businessError, type Business } from '@/features/business/business-contracts';
import {
  activationLabels,
  invitationLabels,
  invitationEntrySchema,
  type TeamRow,
  type InvitationEntry,
  type InvitationResult,
} from '@/features/business/team-contracts';
import { cancelDriverInvitation, createDriverInvitations } from '@/features/business/team-data';
import {
  invitationCsvTemplate,
  invitationImportEntries,
  maxInvitationCsvSize,
  parseInvitationCsv,
  type InvitationImportRow,
} from '@/features/business/team-import';
import { Button, Feedback, Input, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { SegmentedTabs } from '@/shared/ui/segmented-tabs';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { useTeamPages } from './use-team-pages';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Skeleton } from '@/shared/ui/skeleton';
import { workspaceStyles } from './workspace-ui';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { useManualRefresh } from '@/shared/ui/use-manual-refresh';
import { TeamTabs, TeamPersonRow } from './team-ui';
import { DriverReadinessSheet } from './driver-readiness';
import { useBusinessCoverage } from './coverage-data';

export function TeamScreen() {
  const business = useSelectedBusiness();
  if (!business)
    return (
      <Screen compactHeader title="Equipo" onBack={() => router.replace('/business/manage')}>
        <Feedback
          text="No tienes acceso a este negocio. Vuelve a Mi negocio y actualiza tus permisos."
          error
        />
      </Screen>
    );
  return <TeamWorkspace key={business.id} business={business} />;
}

function TeamWorkspace({ business }: { business: Business }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const filter = search;
  const [tab, setTab] = useState<'drivers' | 'invitations'>('drivers');
  const [invitationFilter, setInvitationFilter] = useState<
    'pending' | 'accepted' | 'expired' | 'cancelled'
  >('pending');
  const [composer, setComposer] = useState<'single' | 'csv' | null>(null);
  const [documentDriver, setDocumentDriver] = useState<{ id: string; name: string } | null>(null);
  const [notice, setNotice] = useState<{ title: string; text: string; error?: boolean } | null>(
    null,
  );
  const team = useTeamPages(business.id, filter);
  const coverage = useBusinessCoverage(business.id);
  const people = team.data?.pages.flatMap((page) => page.items) ?? [];
  const drivers = people.filter(
    (person, index) =>
      person.driver_id &&
      person.is_current &&
      (person.invitation_status === 'accepted' || person.invitation_status === 'legacy') &&
      people.findIndex(
        (item) =>
          item.driver_id === person.driver_id &&
          item.is_current &&
          (item.invitation_status === 'accepted' || item.invitation_status === 'legacy'),
      ) === index,
  );
  const invitations = people.filter((person) => person.invitation_status !== 'legacy');
  const visible =
    tab === 'drivers'
      ? drivers
      : invitations.filter((person) => person.invitation_status === invitationFilter);
  const count = (value: number) => `${value}${team.hasNextPage ? '+' : ''}`;
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = team;
  useEffect(() => {
    if (!visible.length && hasNextPage && !isFetching && !isFetchNextPageError)
      void fetchNextPage();
  }, [visible.length, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);
  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['driver-team'] }), coverage.refetch()]);
  const { refreshing, refresh: pullRefresh } = useManualRefresh(refresh);
  const detailPerson = people.find(
    (person) => (person.invitation_id ?? person.driver_id) === detailKey,
  );
  const cancellation = useMutation({
    mutationFn: cancelDriverInvitation,
    onSuccess: refresh,
    onError: (error) =>
      setNotice({
        title: 'No pudimos cancelar la invitación',
        text: businessError(error),
        error: true,
      }),
  });
  const confirmation = useMutation({
    mutationFn: confirmBusinessAffiliation,
    onSuccess: refresh,
    onError: (error) =>
      setNotice({
        title: 'No pudimos confirmar el vínculo',
        text: businessError(error),
        error: true,
      }),
  });
  const renderDetails = (person: TeamRow) => (
    <View style={styles.stack}>
      <View style={styles.personHeading}>
        <Avatar name={person.name} />
        <View style={workspaceStyles.grow}>
          <Text variant="subtitle">{person.name}</Text>
          {person.email ? (
            <Text variant="note" style={workspaceStyles.muted} selectable>
              {person.email}
            </Text>
          ) : null}
        </View>
      </View>
      <StatusBadge
        compact
        label={invitationLabels[person.invitation_status]}
        icon={person.invitation_status === 'accepted' ? 'check' : 'clock'}
        tone={
          person.invitation_status === 'accepted'
            ? 'success'
            : person.invitation_status === 'pending'
              ? 'warning'
              : 'accent'
        }
      />
      {!person.is_current ? <Text variant="note">Invitación anterior</Text> : null}
      {person.activation_status && person.is_current ? (
        <StatusBadge
          compact
          label={activationLabels[person.activation_status]}
          icon={
            person.activation_status === 'enabled'
              ? 'check'
              : person.activation_status === 'rejected'
                ? 'close'
                : 'clock'
          }
          tone={
            person.activation_status === 'enabled'
              ? 'success'
              : person.activation_status === 'rejected'
                ? 'error'
                : 'warning'
          }
        />
      ) : null}
      {person.driver_id && person.is_current && tab === 'drivers' ? (
        <>
          <Text variant="note" style={workspaceStyles.muted}>
            {coverage.isError || !coverage.data
              ? 'Habilitación de reparto sin confirmar'
              : coverage.data.drivers.find((driver) => driver.id === person.driver_id)?.status ===
                  'not_enabled'
                ? 'Requisitos de reparto pendientes'
                : coverage.data.drivers.some((driver) => driver.id === person.driver_id)
                  ? 'Requisitos de reparto al día'
                  : 'Vinculación de reparto por comprobar'}
          </Text>
          <Button
            label="Ver habilitación"
            variant="link"
            style={styles.detailLink}
            onPress={() => {
              setDetailKey(null);
              setDocumentDriver({ id: person.driver_id!, name: person.name });
            }}
          />
        </>
      ) : null}
      {person.expires_at && person.invitation_status === 'pending' ? (
        <Text variant="note">Vence: {new Date(person.expires_at).toLocaleString('es-CL')}</Text>
      ) : null}
      {person.invitation_status === 'pending' && person.is_current && person.invitation_id ? (
        <>
          <Button
            label={`Compartir instrucciones para ${person.name}`}
            variant="secondary"
            onPress={() => {
              setNotice(null);
              void Share.share({
                message: `${business.name} te invitó a su equipo en Gasway. Ingresa o crea tu cuenta con ${person.email}, confirma ese correo y abre Mi cuenta → Activar mi acceso como conductor. Aceptar la invitación no habilita el reparto hasta la revisión de administración.`,
              }).catch(() =>
                setNotice({
                  title: 'No pudimos compartir',
                  text: 'Puedes indicar a la persona que revise su invitación dentro de Gasway.',
                  error: true,
                }),
              );
            }}
          />
          <Button
            label={`Cancelar invitación de ${person.name}`}
            variant="destructive"
            disabled={cancellation.isPending}
            onPress={() => cancellation.mutate(person.invitation_id!)}
          />
        </>
      ) : null}
      {person.invitation_status === 'expired' ||
      person.invitation_status === 'cancelled' ||
      person.activation_status === 'rejected' ? (
        <Text variant="note">
          El negocio puede generar una nueva invitación desde «Invitar conductor».
        </Text>
      ) : null}
      {person.invitation_status === 'legacy' &&
      person.legacy_requested_at &&
      !person.affiliation_confirmed ? (
        <>
          <Text variant="note">
            Solicitud anterior al flujo de invitaciones. Confirma únicamente si reconoces este
            vínculo. No aprueba al conductor.
          </Text>
          <Button
            label={`Confirmar vínculo anterior de ${person.name}`}
            variant="secondary"
            disabled={!business.is_verified || confirmation.isPending}
            onPress={() =>
              confirmation.mutate({
                driver_id: person.driver_id!,
                name: person.name,
                requested_at: person.legacy_requested_at!,
                distributor_id: business.id,
                affiliation_confirmed: false,
              })
            }
          />
        </>
      ) : null}
    </View>
  );
  const header = (
    <View style={styles.header}>
      <View style={styles.toolbar}>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Información del equipo"
          onPress={() => setShowInfo(true)}
          style={styles.iconAction}
        >
          <Icon name="info" color={theme.colors.textMuted} size={theme.layout.tagRemove} />
        </PulsePressable>
        <Button
          label="Invitar conductor"
          style={styles.invite}
          disabled={!business.is_verified}
          onPress={() => setComposer('single')}
        />
      </View>
      {!business.is_verified ? (
        <Feedback text="El negocio no está habilitado para incorporar conductores." error />
      ) : null}
      <TeamTabs
        label="Vistas del equipo"
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'drivers',
            label: 'Conductores',
            count: team.isPending || team.isError ? '—' : count(drivers.length),
          },
          {
            value: 'invitations',
            label: 'Invitaciones',
            count: team.isPending || team.isError ? '—' : count(invitations.length),
          },
        ]}
      />
      <Input
        label="Buscar por nombre o correo"
        hideLabel
        placeholder={tab === 'drivers' ? 'Buscar conductor' : 'Buscar invitación'}
        prefix={<Icon name="search" size={theme.layout.tagRemove} color={theme.colors.textMuted} />}
        frameStyle={styles.searchFrame}
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        maxLength={100}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {tab === 'invitations' ? (
        <TeamTabs
          scrollable
          label="Estado de invitación"
          value={invitationFilter}
          onChange={setInvitationFilter}
          options={(
            [
              { value: 'pending', label: 'Pendientes' },
              { value: 'accepted', label: 'Aceptadas' },
              { value: 'expired', label: 'Vencidas' },
              { value: 'cancelled', label: 'Canceladas' },
            ] as const
          ).map((option) => ({
            ...option,
            count:
              team.isPending || team.isError
                ? '—'
                : count(
                    invitations.filter((person) => person.invitation_status === option.value)
                      .length,
                  ),
          }))}
        />
      ) : null}
    </View>
  );
  return (
    <>
      <Screen
        tabbed
        compactHeader
        title="Equipo"
        onBack={() =>
          router.replace({ pathname: '/business/manage', params: { businessId: business.id } })
        }
        list={
          <View style={styles.listContainer}>
            {header}
            <FlatList
              data={visible}
              keyExtractor={(person) => person.invitation_id ?? person.driver_id!}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              style={styles.listContainer}
              alwaysBounceVertical
              refreshControl={
                <RefreshControl
                  accessibilityLabel="Actualizar equipo"
                  refreshing={refreshing}
                  onRefresh={pullRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary, theme.colors.lime]}
                  progressBackgroundColor={theme.colors.background}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                if (team.hasNextPage && !team.isFetching && !team.isFetchNextPageError)
                  void team.fetchNextPage();
              }}
              ListEmptyComponent={
                team.isPending ||
                (team.hasNextPage && !team.isError && !team.isFetchNextPageError) ? (
                  <Skeleton />
                ) : team.isError ? (
                  <EmptyState
                    title="No pudimos cargar el equipo"
                    description={businessError(team.error)}
                    action={{ label: 'Reintentar', onPress: () => void team.refetch() }}
                  />
                ) : (
                  <EmptyState
                    icon={tab === 'drivers' ? 'user' : 'mail'}
                    title={
                      tab === 'drivers'
                        ? 'Sin conductores para mostrar'
                        : 'Sin invitaciones en este estado'
                    }
                    description={
                      filter
                        ? 'Prueba con otro nombre o correo, o limpia la búsqueda.'
                        : tab === 'drivers'
                          ? 'Aquí aparecerán los vínculos actuales cuando acepten su invitación.'
                          : 'Las invitaciones aparecerán aquí cuando correspondan a este estado.'
                    }
                  />
                )
              }
              ListFooterComponent={
                <View style={styles.stack}>
                  {team.isFetchingNextPage ? <Feedback text="Cargando más registros…" /> : null}
                  {team.isFetchNextPageError ? (
                    <EmptyState
                      title="No pudimos cargar más registros"
                      description="Tus registros cargados siguen disponibles."
                      action={{
                        label: 'Reintentar carga',
                        onPress: () => void team.fetchNextPage(),
                      }}
                    />
                  ) : null}
                  {team.isRefetchError ? (
                    <Feedback
                      text="No pudimos actualizar. Se muestran los últimos datos cargados."
                      error
                    />
                  ) : null}
                  {team.hasNextPage && !team.isFetchingNextPage && !team.isFetchNextPageError ? (
                    <Button
                      label="Cargar más registros"
                      variant="secondary"
                      disabled={team.isFetching}
                      onPress={() => void team.fetchNextPage()}
                    />
                  ) : null}
                </View>
              }
              renderItem={({ item: person }) => (
                <TeamPersonRow
                  person={person}
                  driverView={tab === 'drivers'}
                  coverage={coverage.isError ? undefined : coverage.data}
                  onPress={() => {
                    if (tab === 'drivers' && person.driver_id && person.is_current)
                      setDocumentDriver({ id: person.driver_id, name: person.name });
                    else setDetailKey(person.invitation_id ?? person.driver_id);
                  }}
                  onInfo={() => setDetailKey(person.invitation_id ?? person.driver_id)}
                />
              )}
            />
          </View>
        }
      />
      {showInfo ? (
        <BottomSheet visible title="Sobre el equipo" onClose={() => setShowInfo(false)}>
          <ScrollView contentContainerStyle={styles.stack}>
            <Text variant="note">
              Aceptar una invitación no habilita el reparto. Revisa la habilitación de cada
              conductor.
            </Text>
            <Text variant="note">
              Las invitaciones vencen a los 7 días. No se envían correos automáticamente.
            </Text>
            {team.hasNextPage ? (
              <Text variant="note">
                Los conteos corresponden a los registros cargados. El signo + indica que quedan más.
              </Text>
            ) : null}
          </ScrollView>
        </BottomSheet>
      ) : null}
      {detailPerson && !notice ? (
        <BottomSheet visible title="Detalle del vínculo" onClose={() => setDetailKey(null)}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stack}>
            {renderDetails(detailPerson)}
          </ScrollView>
        </BottomSheet>
      ) : null}
      {composer ? (
        <InvitationComposer
          business={business}
          mode={composer}
          close={() => {
            setComposer(null);
            setTab('invitations');
            setInvitationFilter('pending');
          }}
        />
      ) : null}
      {documentDriver ? (
        <DriverReadinessSheet
          key={documentDriver.id}
          businessId={business.id}
          driver={documentDriver}
          onClose={() => setDocumentDriver(null)}
        />
      ) : null}
      {notice ? (
        <BottomSheet visible title={notice.title} onClose={() => setNotice(null)}>
          <ScrollView contentContainerStyle={styles.stack}>
            <Feedback text={notice.text} error={notice.error ?? false} />
            <Button label="Entendido" onPress={() => setNotice(null)} />
          </ScrollView>
        </BottomSheet>
      ) : null}
    </>
  );
}

function InvitationComposer({
  business,
  mode: initialMode,
  close,
}: {
  business: Business;
  mode: 'single' | 'csv';
  close: () => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<InvitationImportRow[]>([]);
  const [mode, setMode] = useState(initialMode);
  const [notice, setNotice] = useState<{
    title: string;
    text: string;
    error?: boolean;
    done?: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{
    entries: InvitationEntry[];
    results: InvitationResult[];
  } | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvitationEntry>({
    resolver: zodResolver(invitationEntrySchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '' },
  });
  const creation = useMutation({
    mutationFn: ({ entries, preview: dryRun }: { entries: InvitationEntry[]; preview: boolean }) =>
      createDriverInvitations(business.id, entries, dryRun),
    onSuccess: async (results, variables) => {
      if (variables.preview) {
        setPreview({ entries: variables.entries, results });
        return;
      }
      setNotice({
        title: mode === 'csv' ? 'Resultado de la carga CSV' : 'Invitación procesada',
        done: true,
        text: `Creadas en Gasway: ${results.filter((result) => result.result === 'created').length}.\nYa existentes: ${results.filter((result) => result.result === 'existing').length}.\nFallidas: 0.\nLas invitaciones están disponibles en la app. No se enviaron correos.`,
      });
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ['driver-team'] });
    },
    onError: (error) =>
      setNotice({
        title: 'No pudimos completar la solicitud',
        error: true,
        text: `${businessError(error)} Revisa Invitaciones antes de repetir el envío: no pudimos confirmar el resultado.`,
      }),
  });
  const picking = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset || !asset.name.toLowerCase().endsWith('.csv'))
        throw new Error('Selecciona un archivo CSV exportado desde tu planilla.');
      if ((asset.size ?? 0) > maxInvitationCsvSize)
        throw new Error('Usa un archivo de hasta 100 KB.');
      if (asset.file) {
        if (asset.file.size > maxInvitationCsvSize)
          throw new Error('Usa un archivo de hasta 100 KB.');
        return asset.file.text();
      }
      const file = new File(asset.uri);
      try {
        if (file.size > maxInvitationCsvSize) throw new Error('Usa un archivo de hasta 100 KB.');
        return await file.text();
      } finally {
        if (file.uri.startsWith(Paths.cache.uri)) file.delete();
      }
    },
    onSuccess: (text) => {
      if (text !== null) {
        setSource(text);
        setRows([]);
        setPreview(null);
        setNotice(null);
      }
    },
    onError: (error) =>
      setNotice({
        title: 'No pudimos abrir el archivo',
        error: true,
        text: error instanceof Error ? error.message : 'Vuelve a seleccionar un CSV.',
      }),
  });
  const inspect = () => {
    setNotice(null);
    setPreview(null);
    creation.reset();
    try {
      const imported = parseInvitationCsv(source);
      setRows(imported);
      const invalid = imported.filter((row) => row.errors.length).length;
      if (invalid) {
        setNotice({
          title: 'Revisa la planilla',
          error: true,
          text: `Filas con errores: ${invalid} de ${imported.length}. No se creó ninguna invitación en esta revisión. Corrige las filas indicadas para continuar.`,
        });
        return;
      }
      creation.mutate({ entries: invitationImportEntries(imported), preview: true });
    } catch (error) {
      setRows([]);
      setNotice({
        title: 'No pudimos leer el CSV',
        error: true,
        text: error instanceof Error ? error.message : 'Revisa el formato del archivo.',
      });
    }
  };
  const busy = creation.isPending || picking.isPending;
  return (
    <BottomSheet
      visible
      title={notice?.title ?? 'Invitar conductor'}
      onClose={close}
      dismissible={!busy}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stack}>
        {notice ? (
          <View style={styles.stack} accessibilityLiveRegion="polite">
            <Icon
              name={notice.error ? 'close' : 'check'}
              color={notice.error ? theme.colors.error : theme.colors.success}
            />
            <Feedback text={notice.text} error={notice.error ?? false} />
            <Button
              label={notice.done ? 'Volver a Invitaciones' : 'Volver al formulario'}
              disabled={busy}
              onPress={() => {
                if (notice.done) close();
                else setNotice(null);
              }}
            />
          </View>
        ) : (
          <>
            <SegmentedTabs
              label="Forma de invitar"
              value={mode}
              disabled={busy}
              onChange={(value) => {
                setMode(value);
                setPreview(null);
                creation.reset();
              }}
              options={[
                { value: 'single', label: 'Individual' },
                { value: 'csv', label: 'Carga CSV' },
              ]}
            />
            <Text variant="note">
              La invitación aparecerá en la cuenta con el correo confirmado indicado. No se envían
              correos automáticamente.
            </Text>
            {creation.isPending ? (
              <Feedback
                text={
                  creation.variables?.preview ? 'Revisando los datos…' : 'Creando invitaciones…'
                }
              />
            ) : null}
            {mode === 'single' ? (
              <>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      ref={field.ref}
                      label="Nombre del conductor"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      maxLength={100}
                      error={errors.name?.message}
                      editable={!busy && !preview}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      ref={field.ref}
                      label="Correo del conductor"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      maxLength={254}
                      error={errors.email?.message}
                      editable={!busy && !preview}
                    />
                  )}
                />
                {!preview ? (
                  <Button
                    label="Revisar invitación"
                    disabled={busy || !business.is_verified}
                    onPress={() =>
                      void handleSubmit((entry) => {
                        setNotice(null);
                        creation.mutate({ entries: [entry], preview: true });
                      })()
                    }
                  />
                ) : null}
              </>
            ) : null}
            {mode === 'csv' ? (
              <>
                <Text>
                  Exporta la planilla como CSV UTF-8, con columnas nombre y correo. Hasta 100
                  personas por lote. Puedes usar coma o punto y coma.
                </Text>
                <Text selectable variant="note">
                  {invitationCsvTemplate}
                </Text>
                <Button
                  label={picking.isPending ? 'Leyendo archivo…' : 'Seleccionar archivo CSV'}
                  variant="secondary"
                  disabled={busy || !!preview}
                  onPress={() => picking.mutate()}
                />
                <Input
                  label="Contenido CSV"
                  value={source}
                  onChangeText={(value) => {
                    setSource(value);
                    setRows([]);
                    setNotice(null);
                  }}
                  multiline
                  maxLength={maxInvitationCsvSize}
                  editable={!busy && !preview}
                  help="También puedes pegar aquí el CSV. Revisa las filas antes de crear las invitaciones."
                />
                {!preview ? (
                  <Button
                    label="Revisar planilla"
                    disabled={busy || !business.is_verified}
                    onPress={inspect}
                  />
                ) : null}
                {rows.map((row) => (
                  <View key={row.line} style={styles.stack}>
                    <Text variant="label">
                      Fila {row.line}: {row.name || 'Nombre pendiente'}
                    </Text>
                    <Text>{row.email}</Text>
                    {row.errors.map((error) => (
                      <Feedback key={error} text={error} error />
                    ))}
                    {preview ? (
                      <Text variant="note">
                        {preview.results.find((result) => result.email === row.email)?.result ===
                        'existing'
                          ? 'Ya tiene una invitación o incorporación vigente'
                          : 'Nueva invitación'}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}
            {preview ? (
              <>
                <Text>
                  {preview.results.filter((result) => result.result === 'new').length} invitaciones
                  nuevas; {preview.results.filter((result) => result.result === 'existing').length}{' '}
                  ya existentes. Confirma el correo de cada persona.
                </Text>
                <Button
                  label={creation.isPending ? 'Creando…' : 'Crear invitaciones'}
                  disabled={busy || !business.is_verified}
                  onPress={() => creation.mutate({ entries: preview.entries, preview: false })}
                />
                <Button
                  label="Corregir datos"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    setPreview(null);
                    creation.reset();
                  }}
                />
              </>
            ) : null}
            <Button label="Cancelar" variant="secondary" disabled={busy} onPress={close} />
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
  personHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  header: {
    gap: theme.spacing.compact,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.md,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { width: 'auto', minHeight: theme.layout.touchTarget, paddingVertical: theme.spacing.sm },
  iconAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFrame: {
    minHeight: theme.layout.touchTarget,
    paddingLeft: theme.spacing.compact,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  searchInput: { minHeight: theme.layout.touchTarget, paddingVertical: theme.spacing.sm },
  listContainer: { flex: 1 },
  detailLink: { alignSelf: 'flex-start', width: 'auto' },
  list: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.lg,
    maxWidth: theme.layout.formWidth,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  separator: { height: theme.spacing.sm },
});
