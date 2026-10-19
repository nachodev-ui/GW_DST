import { useState } from 'react';
import { Share, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useAuth } from '@/features/auth/auth-provider';
import { useMyBusinesses, confirmBusinessAffiliation } from '@/features/business/business-data';
import { businessError, type Business } from '@/features/business/business-contracts';
import {
  activationLabels,
  invitationLabels,
  invitationEntrySchema,
  type InvitationEntry,
  type InvitationResult,
} from '@/features/business/team-contracts';
import {
  cancelDriverInvitation,
  createDriverInvitations,
  fetchDriverTeam,
} from '@/features/business/team-data';
import {
  invitationCsvTemplate,
  invitationImportEntries,
  maxInvitationCsvSize,
  parseInvitationCsv,
  type InvitationImportRow,
} from '@/features/business/team-import';
import { Button, Card, Feedback, Input } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function TeamScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const businesses = useMyBusinesses();
  const business = businesses.data?.find((item) => item.id === businessId);
  if (!business)
    return (
      <Screen title="Equipo" onBack={() => router.replace('/business/manage')}>
        <Feedback
          text="No tienes acceso a este negocio. Vuelve a Mi negocio y actualiza tus permisos."
          error
        />
      </Screen>
    );
  return <TeamWorkspace key={business.id} business={business} />;
}

function TeamWorkspace({ business }: { business: Business }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [composer, setComposer] = useState<'single' | 'csv' | null>(null);
  const [sharingError, setSharingError] = useState(false);
  const team = useQuery({
    queryKey: ['driver-team', session?.user.id, business.id, offset, filter],
    queryFn: () => fetchDriverTeam(business.id, offset, filter),
    refetchInterval: 30_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['driver-team'] });
  const cancellation = useMutation({ mutationFn: cancelDriverInvitation, onSuccess: refresh });
  const confirmation = useMutation({ mutationFn: confirmBusinessAffiliation, onSuccess: refresh });
  return (
    <Screen title="Equipo" onBack={() => router.replace('/business/manage')}>
      <Text variant="title">{business.name}</Text>
      <Text>
        Tu negocio incorpora a sus conductores. Cada persona acepta su invitación y completa sus
        antecedentes; administración decide su habilitación para repartir.
      </Text>
      <Text variant="note">
        Las invitaciones aparecen en la cuenta con el correo confirmado indicado. No se envían
        correos automáticamente. Vencen a los 7 días.
      </Text>
      {!business.is_verified ? (
        <Feedback text="El negocio no está habilitado para incorporar conductores." error />
      ) : null}
      <Button
        label="Invitar conductor"
        disabled={!business.is_verified || composer !== null}
        onPress={() => setComposer('single')}
      />
      <Button
        label="Importar planilla CSV"
        variant="secondary"
        disabled={!business.is_verified || composer !== null}
        onPress={() => setComposer('csv')}
      />
      {composer ? (
        <InvitationComposer business={business} mode={composer} close={() => setComposer(null)} />
      ) : null}
      <Input
        label="Buscar por nombre o correo"
        value={search}
        onChangeText={setSearch}
        maxLength={100}
        returnKeyType="search"
        onSubmitEditing={() => {
          setOffset(0);
          setFilter(search);
        }}
      />
      <Button
        label="Buscar en el equipo"
        variant="secondary"
        onPress={() => {
          setOffset(0);
          setFilter(search);
        }}
      />
      {team.isPending ? (
        <Feedback text="Cargando equipo…" />
      ) : team.isError ? (
        <Feedback text={businessError(team.error)} error />
      ) : team.data.items.length === 0 ? (
        <Text>
          No hay personas para esta búsqueda. Puedes incorporar conductores individualmente o desde
          un CSV.
        </Text>
      ) : (
        team.data.items.map((person) => (
          <Card key={person.invitation_id ?? person.driver_id}>
            <Text variant="subtitle">{person.name}</Text>
            {person.email ? <Text selectable>{person.email}</Text> : null}
            <Text>
              Invitación: {invitationLabels[person.invitation_status]}
              {person.is_current ? '' : ' (anterior)'}
            </Text>
            {person.activation_status && person.is_current ? (
              <Text>Habilitación: {activationLabels[person.activation_status]}</Text>
            ) : null}
            {person.expires_at && person.invitation_status === 'pending' ? (
              <Text variant="note">
                Vence: {new Date(person.expires_at).toLocaleString('es-CL')}
              </Text>
            ) : null}
            {person.invitation_status === 'pending' && person.is_current && person.invitation_id ? (
              <>
                <Button
                  label={`Compartir instrucciones para ${person.name}`}
                  variant="secondary"
                  onPress={() => {
                    setSharingError(false);
                    void Share.share({
                      message: `${business.name} te invitó a su equipo en Gasway. Ingresa o crea tu cuenta con ${person.email}, confirma ese correo y abre Mi cuenta → Activar mi acceso como conductor. Aceptar la invitación no habilita el reparto hasta la revisión de administración.`,
                    }).catch(() => setSharingError(true));
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
          </Card>
        ))
      )}
      {sharingError ? (
        <Feedback
          text="No pudimos abrir las opciones para compartir. Puedes indicar a la persona que revise su invitación dentro de Gasway."
          error
        />
      ) : null}
      {cancellation.isError ? <Feedback text={businessError(cancellation.error)} error /> : null}
      {confirmation.isError ? <Feedback text={businessError(confirmation.error)} error /> : null}
      <View style={styles.stack}>
        <Text variant="note">Página {Math.floor(offset / 20) + 1}</Text>
        <Button
          label="Página anterior"
          variant="secondary"
          disabled={offset === 0 || team.isFetching}
          onPress={() => setOffset((value) => Math.max(0, value - 20))}
        />
        <Button
          label="Página siguiente"
          variant="secondary"
          disabled={!team.data?.has_more || team.isFetching}
          onPress={() => setOffset((value) => value + 20)}
        />
      </View>
      <Button
        label="Actualizar equipo"
        variant="secondary"
        disabled={team.isFetching}
        onPress={() => void refresh()}
      />
    </Screen>
  );
}

function InvitationComposer({
  business,
  mode,
  close,
}: {
  business: Business;
  mode: 'single' | 'csv';
  close: () => void;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<InvitationImportRow[]>([]);
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState('');
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
      setMessage(
        `${results.filter((result) => result.result === 'created').length} invitaciones creadas. ${results.filter((result) => result.result === 'existing').length} personas ya tenían una invitación o incorporación vigente.`,
      );
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ['driver-team'] });
    },
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
        setMessage('');
      }
    },
  });
  const inspect = () => {
    setMessage('');
    setPreview(null);
    creation.reset();
    try {
      const imported = parseInvitationCsv(source);
      setRows(imported);
      setPage(0);
      if (imported.some((row) => row.errors.length)) return;
      creation.mutate({ entries: invitationImportEntries(imported), preview: true });
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : 'No pudimos leer el CSV.');
    }
  };
  const busy = creation.isPending || picking.isPending;
  return (
    <Card>
      <Text variant="subtitle">{mode === 'single' ? 'Invitar conductor' : 'Importar equipo'}</Text>
      {message ? <Feedback text={message} /> : null}
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
                  setMessage('');
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
            Exporta la planilla como CSV UTF-8, con columnas nombre y correo. Hasta 100 personas por
            lote. Puedes usar coma o punto y coma.
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
              setMessage('');
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
          {rows.slice(page * 20, page * 20 + 20).map((row) => (
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
          {rows.length > 20 ? (
            <View style={styles.stack}>
              <Text variant="note">
                Filas {page * 20 + 1}–{Math.min(rows.length, page * 20 + 20)} de {rows.length}
              </Text>
              <Button
                label="Filas anteriores"
                variant="secondary"
                disabled={page === 0}
                onPress={() => setPage((value) => value - 1)}
              />
              <Button
                label="Filas siguientes"
                variant="secondary"
                disabled={(page + 1) * 20 >= rows.length}
                onPress={() => setPage((value) => value + 1)}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {picking.isError ? (
        <Feedback
          text={
            picking.error instanceof Error ? picking.error.message : 'No pudimos leer el archivo.'
          }
          error
        />
      ) : null}
      {creation.isError ? <Feedback text={businessError(creation.error)} error /> : null}
      {preview ? (
        <>
          <Text>
            {preview.results.filter((result) => result.result === 'new').length} invitaciones
            nuevas; {preview.results.filter((result) => result.result === 'existing').length} ya
            existentes. Confirma el correo de cada persona.
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
      <Button label="Cerrar" variant="secondary" disabled={busy} onPress={close} />
    </Card>
  );
}

const styles = StyleSheet.create({ stack: { gap: theme.spacing.sm } });
