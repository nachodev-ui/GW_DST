import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { SignOutButton } from '@/features/auth/zone-screen';
import { Button, Feedback, Input, OptionCard, StatusBadge } from '@/shared/ui/components';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { ListRow } from '@/shared/ui/list-row';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { theme } from '@/theme';
import type { Commune } from '@/shared/orders/contracts';
import { businessError, type Business } from './business-contracts';
import { fetchBusinessCommunes } from './business-data';
import {
  BusinessShell,
  BusinessSection,
  businessStyles as s,
  useSelectedBusiness,
} from './business-shell';
import {
  useBusinessProfile,
  useBusinessMedia,
  saveBusinessProfile,
  pickBusinessImage,
} from './workspace-data';
import {
  profileFormSchema,
  businessPointFromFields,
  type BusinessProfile,
  type BusinessProfileForm,
} from './workspace-contracts';
import { ServiceSettingsEditor } from './service-settings-editor';
import { BusinessLocationPicker } from './business-location-picker';
import { locateBusiness, type BusinessLocationRequest } from './business-location-data';
import { BrandProfilePreview } from './brand-profile-preview';

const COMMUNE_SEARCH_LIMIT = 40;
const normalizeCommuneSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .trim();

export function BusinessProfileScreen() {
  const business = useSelectedBusiness();
  return business ? <Profile key={business.id} business={business} /> : null;
}
function Profile({ business }: { business: Business }) {
  const profile = useBusinessProfile(business.id);
  const [generation, setGeneration] = useState(0);
  if (profile.isPending || profile.isError) {
    return (
      <BusinessShell title="Perfil comercial" subtitle={business.name}>
        {profile.isPending ? (
          <Feedback text="Cargando perfil…" />
        ) : (
          <>
            <Feedback error text="No pudimos cargar el perfil comercial." />
            <Button label="Reintentar" variant="secondary" onPress={() => void profile.refetch()} />
          </>
        )}
      </BusinessShell>
    );
  }
  return (
    <ProfileForm
      key={`${business.id}:${generation}`}
      business={business}
      initial={profile.data}
      discard={async () => {
        const fresh = await profile.refetch();
        if (fresh.data && !fresh.isError) setGeneration((value) => value + 1);
      }}
    />
  );
}
function ProfileForm({
  business,
  initial,
  discard,
}: {
  business: Business;
  initial: BusinessProfile;
  discard: () => Promise<void>;
}) {
  const { session, zone } = useAuth();
  const client = useQueryClient();
  const [baseline, setBaseline] = useState(initial);
  const [logoPath, setLogoPath] = useState(initial.logo_path);
  const [coverPath, setCoverPath] = useState(initial.cover_path);
  const [communeOpen, setCommuneOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [mediaInfoOpen, setMediaInfoOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notice, setNotice] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const locationBusy = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const communes = useQuery({
    queryKey: ['business-communes', session?.user.id],
    queryFn: fetchBusinessCommunes,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const form = useForm<BusinessProfileForm>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: initial.display_name,
      description: initial.description ?? '',
      address: initial.address ?? '',
      commune_code: initial.commune_code ?? '',
      latitude: initial.latitude?.toString() ?? '',
      longitude: initial.longitude?.toString() ?? '',
    },
  });
  const values = form.watch();
  const logo = useBusinessMedia(logoPath);
  const cover = useBusinessMedia(coverPath);
  const [failedLogo, setFailedLogo] = useState<string>();
  const [failedCover, setFailedCover] = useState<string>();
  const setPoint = (point: { latitude: number; longitude: number } | null, validate = true) => {
    form.setValue('latitude', point?.latitude.toFixed(6) ?? '', { shouldDirty: true });
    form.setValue('longitude', point?.longitude.toFixed(6) ?? '', { shouldDirty: true });
    // Cross-field errors must see the completed pair, never an intermediate GPS update.
    if (validate) void form.trigger(['latitude', 'longitude', 'address']);
    else form.clearErrors(['latitude', 'longitude']);
  };
  useEffect(() => {
    if (!communeOpen) return;
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [communeOpen, search]);
  const communeIndex = useMemo(
    () =>
      communes.data?.map((commune) => ({
        commune,
        searchText: normalizeCommuneSearch(`${commune.name} ${commune.code}`),
      })) ?? [],
    [communes.data],
  );
  const hasCommuneSearch = search.trim().length > 0;
  const matchingCommunes = useMemo(() => {
    if (!communeOpen) return [];
    const query = hasCommuneSearch ? normalizeCommuneSearch(debouncedSearch) : '';
    return communeIndex
      .filter(({ searchText }) => searchText.includes(query))
      .map(({ commune }) => commune);
  }, [communeOpen, communeIndex, debouncedSearch, hasCommuneSearch]);
  const visibleCommunes = useMemo(
    () => (hasCommuneSearch ? matchingCommunes.slice(0, COMMUNE_SEARCH_LIMIT) : matchingCommunes),
    [hasCommuneSearch, matchingCommunes],
  );
  const selectCommune = useCallback(
    (code: string) => {
      const current = form.getValues();
      if (current.commune_code !== code) {
        setLocationNotice(
          businessPointFromFields(current.latitude, current.longitude)
            ? 'Comuna actualizada. Revisa que la dirección y el punto correspondan al negocio.'
            : null,
        );
      }
      form.setValue('commune_code', code, { shouldDirty: true });
      void form.trigger(['address', 'commune_code', 'latitude', 'longitude']);
      setCommuneOpen(false);
    },
    [form],
  );
  const renderCommune = useCallback(
    ({ item }: { item: Commune }) => (
      <CommuneRow
        commune={item}
        selected={values.commune_code === item.code}
        onSelect={selectCommune}
      />
    ),
    [selectCommune, values.commune_code],
  );
  const upload = useMutation({
    mutationFn: (kind: 'logo' | 'cover') => pickBusinessImage(business.id, kind),
    onSuccess: (path, kind) => {
      if (path) {
        (kind === 'logo' ? setLogoPath : setCoverPath)(path);
        setNotice(false);
      }
    },
  });
  const location = useMutation({
    mutationFn: (request: BusinessLocationRequest) => locateBusiness(request, communes.data ?? []),
    onSuccess: (result) => {
      if (!active.current) return;
      form.setValue('address', result.address, { shouldDirty: true });
      form.setValue('commune_code', result.communeCode, { shouldDirty: true });
      setPoint(result.point, false);
      form.clearErrors(['address', 'commune_code']);
      void form.trigger(['latitude', 'longitude', 'address', 'commune_code']);
      setLocationNotice(result.notice);
      setNotice(false);
    },
    onSettled: () => {
      locationBusy.current = false;
    },
  });
  const updateLocation = (request: BusinessLocationRequest) => {
    if (locationBusy.current) return;
    locationBusy.current = true;
    setLocationNotice(null);
    location.mutate(request);
  };
  const save = useMutation({
    mutationFn: (input: BusinessProfileForm) =>
      saveBusinessProfile(business.id, baseline, input, {
        logo_path: logoPath,
        cover_path: coverPath,
      }),
    onSuccess: async (_result, input) => {
      const next = {
        ...baseline,
        ...input,
        address: input.address || null,
        description: input.description || null,
        commune_code: input.commune_code || null,
        latitude: input.latitude === '' ? null : Number(input.latitude),
        longitude: input.longitude === '' ? null : Number(input.longitude),
        logo_path: logoPath,
        cover_path: coverPath,
        revision: baseline.revision + 1,
      };
      client.setQueryData(['business-profile', session?.user.id, business.id], next);
      setBaseline(next);
      form.reset(input);
      setNotice(true);
    },
  });
  const locked = save.isPending || upload.isPending || location.isPending || !business.is_verified;
  const dirty =
    form.formState.isDirty || logoPath !== baseline.logo_path || coverPath !== baseline.cover_path;
  const dirtyFields = form.formState.dirtyFields;
  const identityDirty =
    !!dirtyFields.display_name ||
    !!dirtyFields.description ||
    logoPath !== baseline.logo_path ||
    coverPath !== baseline.cover_path;
  const locationDirty =
    !!dirtyFields.address ||
    !!dirtyFields.commune_code ||
    !!dirtyFields.latitude ||
    !!dirtyFields.longitude;
  const selectedCommune = communes.data?.find((commune) => commune.code === values.commune_code);
  const errors = form.formState.errors;
  const mediaError =
    logo.isError ||
    cover.isError ||
    (!!logo.data && failedLogo === logo.data) ||
    (!!cover.data && failedCover === cover.data);
  const showIdentity =
    identityOpen || !!errors.display_name || !!errors.description || upload.isError || mediaError;
  const showCoordinates = coordinatesOpen || !!errors.latitude || !!errors.longitude;
  const showLocation =
    locationOpen ||
    showCoordinates ||
    !!errors.address ||
    !!errors.commune_code ||
    location.isError;
  const fields = [
    { name: 'display_name', label: 'Nombre comercial', max: 120 },
    { name: 'description', label: 'Sobre tu distribuidora', max: 500 },
  ] as const;
  return (
    <BusinessShell
      title="Perfil comercial"
      subtitle={business.name}
      footer={
        dirty ? (
          <View style={styles.saveBar}>
            <View style={styles.pendingLabel} accessibilityLiveRegion="polite">
              <View style={styles.pendingDot} />
              <Text variant="note" compact style={styles.pendingText}>
                Cambios pendientes
              </Text>
            </View>
            <View style={s.row}>
              <View style={s.grow}>
                <Button
                  label={save.isPending ? 'Guardando…' : 'Guardar cambios'}
                  disabled={locked || !dirty}
                  onPress={() =>
                    void form.handleSubmit(
                      (input) => save.mutate(input),
                      (invalid) => {
                        if (invalid.display_name || invalid.description) setIdentityOpen(true);
                        if (
                          invalid.address ||
                          invalid.commune_code ||
                          invalid.latitude ||
                          invalid.longitude
                        )
                          setLocationOpen(true);
                        if (invalid.latitude || invalid.longitude) setCoordinatesOpen(true);
                      },
                    )()
                  }
                />
              </View>
              <Button
                label="Descartar"
                variant="link"
                disabled={locked}
                onPress={() => void discard()}
              />
            </View>
          </View>
        ) : null
      }
    >
      {!business.is_verified ? (
        <Feedback
          error
          text="El negocio no está habilitado para editar su perfil. Contacta a administración."
        />
      ) : null}
      <BusinessSection title="Horario y contacto">
        <ServiceSettingsEditor business={business} />
      </BusinessSection>
      <BusinessSection
        title="Marca"
        action={
          <EditAction
            label="marca y presentación"
            dirty={identityDirty}
            expanded={showIdentity}
            disabled={locked}
            onPress={() => setIdentityOpen(!showIdentity)}
          />
        }
      >
        <BrandProfilePreview
          name={values.display_name || business.name}
          description={values.description}
          logoUri={logo.data && logo.data !== failedLogo ? logo.data : undefined}
          coverUri={cover.data && cover.data !== failedCover ? cover.data : undefined}
          editing={showIdentity}
          disabled={locked}
          uploading={upload.isPending ? upload.variables : undefined}
          onSelect={(kind) => upload.mutate(kind)}
          onLogoError={() => setFailedLogo(logo.data)}
          onCoverError={() => setFailedCover(cover.data)}
        >
          <Text variant="note" style={s.muted}>
            {business.brands.join(' · ')}
          </Text>
          <StatusBadge
            label={business.is_verified ? 'Negocio habilitado' : 'Pendiente de habilitación'}
            tone={business.is_verified ? 'neutral' : 'warning'}
          />
        </BrandProfilePreview>
        {showIdentity ? (
          <View style={s.card}>
            <View style={styles.mediaTools}>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Requisitos de las imágenes"
                onPress={() => setMediaInfoOpen(true)}
                style={[styles.editAction, styles.infoAction]}
              >
                <Icon name="info" size={theme.layout.tagRemove} />
              </PulsePressable>
              {logoPath ? (
                <Button
                  label="Quitar logo"
                  variant="link"
                  disabled={locked}
                  onPress={() => setLogoPath(null)}
                />
              ) : null}
              {coverPath ? (
                <Button
                  label="Quitar portada"
                  variant="link"
                  disabled={locked}
                  onPress={() => setCoverPath(null)}
                />
              ) : null}
            </View>
            {upload.isError ? (
              <Feedback
                error
                text={
                  upload.error instanceof Error &&
                  [
                    'Elige una imagen de hasta 5 MB.',
                    'Elige una imagen PNG, JPG o WebP válida.',
                    'No pudimos leer la imagen seleccionada.',
                  ].includes(upload.error.message)
                    ? upload.error.message
                    : 'No pudimos subir la imagen. Vuelve a intentarlo.'
                }
              />
            ) : null}
            {mediaError ? (
              <>
                <Feedback
                  error
                  text="No pudimos cargar una imagen del perfil. Reintenta o selecciona otra."
                />
                <Button
                  label="Reintentar imágenes"
                  variant="link"
                  onPress={() => {
                    setFailedLogo(undefined);
                    setFailedCover(undefined);
                    if (logoPath) void logo.refetch();
                    if (coverPath) void cover.refetch();
                  }}
                />
              </>
            ) : null}
            {fields.map((item) => (
              <View key={item.name} style={styles.brandField}>
                <Text variant="note" compact style={s.muted}>
                  {item.label}
                </Text>
                <Controller
                  control={form.control}
                  name={item.name}
                  render={({ field, fieldState }) => (
                    <Input
                      label={item.label}
                      hideLabel
                      style={[
                        styles.brandInput,
                        item.name === 'description' && styles.brandDescription,
                      ]}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      maxLength={item.max}
                      error={fieldState.error?.message}
                      editable={!locked}
                      multiline={item.name === 'description'}
                    />
                  )}
                />
              </View>
            ))}
          </View>
        ) : null}
      </BusinessSection>
      <BusinessSection
        title="Ubicación comercial"
        action={
          <EditAction
            label="ubicación comercial"
            dirty={locationDirty}
            expanded={showLocation}
            disabled={locked}
            onPress={() => {
              setLocationOpen(!showLocation);
              setCoordinatesOpen(false);
            }}
          />
        }
      >
        {!showLocation ? (
          <View style={s.card}>
            <View style={s.row}>
              <View style={styles.iconWell}>
                <Icon name="pin" />
              </View>
              <View style={s.grow}>
                <Text variant="label">{values.address || 'Agrega tu dirección comercial'}</Text>
                <Text variant="note" style={s.muted}>
                  {selectedCommune?.name ?? 'Comuna sin seleccionar'}
                </Text>
              </View>
            </View>
            <StatusBadge
              label={
                businessPointFromFields(values.latitude, values.longitude)
                  ? 'Punto en el mapa añadido'
                  : 'Sin punto en el mapa'
              }
              icon="pin"
            />
          </View>
        ) : (
          <View style={s.card}>
            <Controller
              control={form.control}
              name="address"
              render={({ field, fieldState }) => (
                <Input
                  label="Dirección comercial"
                  value={field.value}
                  onChangeText={(value) => {
                    field.onChange(value);
                    // Correcting a suggested street number must not erase the selected entrance.
                    setLocationNotice(null);
                  }}
                  onBlur={field.onBlur}
                  maxLength={240}
                  error={fieldState.error?.message}
                  editable={!locked}
                />
              )}
            />
            <View style={s.stack}>
              <Text variant="label">Comuna del negocio</Text>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel={`Comuna del negocio: ${selectedCommune?.name ?? 'sin seleccionar'}`}
                accessibilityHint="Abre el listado de comunas para seleccionar una"
                accessibilityState={{ disabled: locked || !communes.data, expanded: communeOpen }}
                disabled={locked || !communes.data}
                style={styles.communeField}
                onPress={() => {
                  setSearch('');
                  setCommuneOpen(true);
                }}
              >
                <Text style={[s.grow, !selectedCommune && s.muted]}>
                  {selectedCommune?.name ?? 'Selecciona una comuna'}
                </Text>
                <Icon name="chevronDown" color={theme.colors.textMuted} />
              </PulsePressable>
            </View>
            {communes.isError ? (
              <>
                <Feedback error text="No pudimos cargar el catálogo de comunas." />
                <Button
                  label="Reintentar comunas"
                  variant="link"
                  onPress={() => void communes.refetch()}
                />
              </>
            ) : null}
            <View style={styles.locationActions}>
              <View style={s.row}>
                <Icon name="pin" />
                <Text variant="label" style={s.grow}>
                  Ubica tu negocio
                </Text>
              </View>
              <Text variant="note" style={s.muted}>
                El mapa o el GPS completan una dirección aproximada. Revísala antes de guardar.
              </Text>
              <BusinessLocationPicker
                point={businessPointFromFields(values.latitude, values.longitude)}
                disabled={locked}
                onChange={(point) => updateLocation({ kind: 'map', point })}
              />
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Usar mi ubicación actual"
                accessibilityHint="Úsalo solo si estás en el recinto del negocio"
                accessibilityState={{ disabled: locked, busy: location.isPending }}
                disabled={locked}
                onPress={() => updateLocation({ kind: 'gps' })}
                style={styles.gpsAction}
              >
                <View style={styles.iconWell}>
                  <Icon name="locate" />
                </View>
                <View style={s.grow}>
                  <Text variant="label">
                    {location.isPending && location.variables?.kind === 'gps'
                      ? 'Obteniendo ubicación…'
                      : 'Usar mi ubicación actual'}
                  </Text>
                  <Text variant="note" style={s.muted}>
                    Solo si estás en el negocio
                  </Text>
                </View>
              </PulsePressable>
              {location.isPending && location.variables?.kind === 'map' ? (
                <Feedback text="Buscando la dirección del punto…" />
              ) : null}
              {locationNotice ? <Feedback text={locationNotice} /> : null}
              {location.isError ? (
                <Feedback
                  error
                  text={
                    location.error instanceof Error &&
                    (location.error.message.startsWith('Autoriza') ||
                      location.error.message.startsWith('Activa'))
                      ? location.error.message
                      : 'No pudimos obtener tu ubicación. Elige el punto en el mapa o ingresa sus coordenadas.'
                  }
                />
              ) : null}
            </View>
            <PulsePressable
              accessibilityRole="button"
              accessibilityLabel="Coordenadas manuales"
              accessibilityState={{ expanded: showCoordinates, disabled: locked }}
              disabled={locked}
              onPress={() => setCoordinatesOpen(!showCoordinates)}
              style={styles.disclosure}
            >
              <Text variant="note" style={[s.grow, s.muted]}>
                Coordenadas manuales
              </Text>
              <Icon
                name={showCoordinates ? 'close' : 'chevronDown'}
                size={theme.layout.tagRemove}
              />
            </PulsePressable>
            {showCoordinates ? (
              <View style={s.wrap}>
                {(['latitude', 'longitude'] as const).map((name) => (
                  <View key={name} style={s.flexCell}>
                    <Controller
                      control={form.control}
                      name={name}
                      render={({ field, fieldState }) => (
                        <Input
                          label={name === 'latitude' ? 'Latitud (opcional)' : 'Longitud (opcional)'}
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={() => {
                            field.onBlur();
                            void form.trigger(['latitude', 'longitude']);
                          }}
                          maxLength={20}
                          keyboardType="numbers-and-punctuation"
                          editable={!locked}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            {values.latitude || values.longitude ? (
              <Button
                label="Quitar punto del mapa"
                variant="link"
                disabled={locked}
                onPress={() => {
                  setPoint(null);
                  setLocationNotice(null);
                }}
              />
            ) : null}
          </View>
        )}
      </BusinessSection>
      {!dirty && notice ? <Feedback text="Perfil comercial guardado." /> : null}
      {save.isError ? (
        <>
          <Feedback error text={businessError(save.error)} />
          {!dirty ? (
            <Button
              label="Descartar borrador y cargar versión actual"
              variant="secondary"
              onPress={() => void discard()}
            />
          ) : null}
        </>
      ) : null}
      <BusinessSection title="Tu cuenta">
        <View style={s.card}>
          <View style={s.row}>
            <View style={styles.iconWell}>
              <Icon name="user" />
            </View>
            <View style={s.grow}>
              <Text variant="label">
                {business.member_role === 'owner' ? 'Responsable' : 'Encargado'}
              </Text>
              <Text variant="note" style={s.muted}>
                {session?.user.email}
              </Text>
            </View>
          </View>
          <ListRow
            title="Comprar como cliente"
            leading={<Icon name="home" />}
            onPress={() => router.replace('/customer')}
          />
          {zone === 'driver' ? (
            <ListRow
              title="Ir a reparto"
              leading={<Icon name="truck" />}
              onPress={() => router.replace('/driver')}
            />
          ) : null}
          <SignOutButton discreet />
        </View>
      </BusinessSection>
      {business.is_demo ? <Feedback text="Modo demo · no habilita operaciones reales." /> : null}
      {mediaInfoOpen ? (
        <BottomSheet visible title="Imágenes de marca" onClose={() => setMediaInfoOpen(false)}>
          <Text variant="note">JPG, PNG o WebP · máximo 5 MB por imagen.</Text>
        </BottomSheet>
      ) : null}
      {communeOpen ? (
        <BottomSheet visible title="Comuna del negocio" onClose={() => setCommuneOpen(false)}>
          <Input label="Buscar comuna" value={search} onChangeText={setSearch} />
          <FlatList
            data={visibleCommunes}
            keyExtractor={(commune) => commune.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={5}
            ItemSeparatorComponent={() => <View style={styles.communeGap} />}
            ListEmptyComponent={
              <Text variant="note" style={s.muted}>
                No encontramos esa comuna.
              </Text>
            }
            ListHeaderComponent={
              <View style={styles.communeHeader}>
                <OptionCard
                  label="Sin ubicación comercial"
                  selected={!values.commune_code}
                  onPress={() => {
                    form.setValue('commune_code', '', { shouldDirty: true });
                    form.setValue('address', '', { shouldDirty: true });
                    setLocationNotice(null);
                    setPoint(null);
                    setCommuneOpen(false);
                  }}
                />
              </View>
            }
            ListFooterComponent={
              hasCommuneSearch && matchingCommunes.length > COMMUNE_SEARCH_LIMIT ? (
                <Text variant="note" style={s.muted}>
                  Primeras {COMMUNE_SEARCH_LIMIT} coincidencias. Precisa la búsqueda.
                </Text>
              ) : undefined
            }
            renderItem={renderCommune}
          />
        </BottomSheet>
      ) : null}
    </BusinessShell>
  );
}
const CommuneRow = memo(function CommuneRow({
  commune,
  selected,
  onSelect,
}: {
  commune: Commune;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <OptionCard
      label={`${commune.name} · ${commune.code}`}
      selected={selected}
      onPress={() => onSelect(commune.code)}
    />
  );
});
function EditAction({
  label,
  expanded,
  dirty,
  disabled,
  onPress,
}: {
  label: string;
  expanded: boolean;
  dirty: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`${expanded ? 'Listo, terminar edición de' : 'Editar'} ${label}${dirty ? ', cambios pendientes' : ''}`}
      accessibilityHint={
        expanded ? 'Termina la edición sin guardar ni descartar los cambios' : undefined
      }
      accessibilityState={{ expanded, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.editAction}
    >
      {dirty ? <View style={styles.pendingDot} /> : null}
      <Icon name={expanded ? 'check' : 'edit'} size={theme.layout.tagRemove} />
      <Text variant="note" compact>
        {expanded ? 'Listo' : 'Editar'}
      </Text>
    </PulsePressable>
  );
}
const styles = StyleSheet.create({
  saveBar: { gap: theme.spacing.sm },
  pendingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pendingDot: {
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
  },
  pendingText: { color: theme.colors.primary },
  editAction: {
    minHeight: theme.layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  iconWell: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.business.radius,
    backgroundColor: theme.business.soft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mediaTools: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  infoAction: { minWidth: theme.layout.touchTarget, justifyContent: 'center' },
  brandField: { gap: theme.spacing.xs },
  brandInput: {
    minHeight: theme.layout.touchTarget,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.compact,
    fontSize: theme.typography.sizes.body,
  },
  brandDescription: { minHeight: theme.business.logoSize, textAlignVertical: 'top' },
  gpsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.touchTarget,
    gap: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.business.border,
  },
  communeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    minHeight: theme.layout.inputHeight,
    padding: theme.spacing.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  locationActions: {
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.business.border,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  communeGap: { height: theme.spacing.sm },
  communeHeader: { paddingBottom: theme.spacing.sm },
});
