import { useRef, useState } from 'react';
import { StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { brands, type Commune } from '@/shared/orders/contracts';
import { Button, Card, Feedback, RefreshButton, StatusBadge } from '@/shared/ui/components';
import {
  CompactFormInput,
  FormCard,
  FormChoiceTile,
  FormInfo,
  FormNotice,
  FormStepHeading,
  FormSummarySection,
} from '@/shared/ui/compact-form';
import { CompactSelect } from '@/shared/ui/compact-select';
import { FormStepper, type FormStep } from '@/shared/ui/form-stepper';
import { useFormSteps } from '@/shared/ui/use-form-steps';
import { Enter } from '@/shared/ui/enter';
import { Text } from '@/shared/ui/text';
import { Screen } from '@/shared/ui/screen';
import { theme } from '@/theme';
import {
  businessError,
  businessFormSchema,
  type BusinessApplication,
  type BusinessForm,
} from '@/features/business/business-contracts';
import {
  fetchBusinessApplication,
  fetchBusinessCommunes,
  submitBusinessApplication,
  useMyBusinesses,
} from '@/features/business/business-data';

const back = () => router.replace('/');
const fields = [
  {
    name: 'name',
    label: 'Nombre del negocio',
    limit: 120,
    icon: 'store',
    placeholder: 'Nombre comercial',
  },
  { name: 'rut', label: 'RUT del negocio', limit: 20, icon: 'orders', placeholder: '76.123.456-0' },
  {
    name: 'contact_name',
    label: 'Responsable del negocio',
    limit: 100,
    icon: 'user',
    placeholder: 'Nombre y apellido',
  },
  {
    name: 'phone',
    label: 'Teléfono de contacto',
    limit: 24,
    icon: 'phone',
    placeholder: '+56 9 1234 5678',
  },
  {
    name: 'address',
    label: 'Dirección del recinto',
    limit: 240,
    icon: 'pin',
    placeholder: 'Calle, número y local',
  },
  {
    name: 'commercial_evidence',
    label: 'Antecedentes comerciales',
    limit: 1000,
    icon: 'orders',
    placeholder: 'Inicio de actividades, patente, acuerdos…',
  },
  {
    name: 'storage_evidence',
    label: 'Antecedentes del recinto y seguridad',
    limit: 1000,
    icon: 'shield',
    placeholder: 'Recinto, registro y seguridad…',
  },
] as const;
const steps = [
  { label: 'Negocio', icon: 'store' },
  { label: 'Recinto', icon: 'pin' },
  { label: 'Antecedentes', icon: 'shield' },
  { label: 'Marcas y envío', icon: 'flame' },
] as const satisfies readonly FormStep[];
const stepFields: FieldPath<BusinessForm>[][] = [
  ['name', 'rut', 'contact_name', 'phone'],
  ['address', 'commune_code'],
  ['commercial_evidence', 'storage_evidence'],
  ['brands'],
];
const evidenceNotice =
  'Las referencias son privadas. Este formulario no sube documentos ni acredita permisos legales; administración debe contrastarlos antes de una operación real.';

export function BusinessApplicationScreen() {
  const { session } = useAuth();
  const businesses = useMyBusinesses();
  const application = useQuery({
    queryKey: ['business-application', session?.user.id],
    queryFn: () => fetchBusinessApplication(session!.user.id),
    enabled: !!session,
    refetchInterval: 30_000,
  });
  const communes = useQuery({
    queryKey: ['business-communes', session?.user.id],
    queryFn: fetchBusinessCommunes,
    enabled: !!session,
    staleTime: Infinity,
  });
  if (businesses.data?.length && !businesses.isError) return <Redirect href="/business/manage" />;
  if (businesses.isPending || application.isPending || communes.isPending)
    return (
      <Screen title="Mi negocio" onBack={back}>
        <Feedback text="Cargando tu negocio…" />
      </Screen>
    );
  if (businesses.isError || application.isError || communes.isError)
    return (
      <Screen title="Mi negocio" onBack={back}>
        <Feedback text="No pudimos cargar tu solicitud. Reintenta para continuar." error />
        <RefreshButton
          label="Reintentar"
          onRefresh={() =>
            Promise.all([
              businesses.refetch({ cancelRefetch: false }),
              application.refetch({ cancelRefetch: false }),
              communes.refetch({ cancelRefetch: false }),
            ])
          }
        />
      </Screen>
    );
  if (application.data && application.data.status !== 'rejected')
    return (
      <Screen title="Mi negocio" onBack={back}>
        <Text variant="title">{application.data.name}</Text>
        <Card>
          <Text variant="subtitle">
            {application.data.status === 'pending' ? 'Solicitud pendiente' : 'Solicitud aprobada'}
          </Text>
          <Text>
            {application.data.status === 'pending'
              ? 'Administración revisará el negocio y sus antecedentes. Enviar la solicitud no habilita ventas ni reparto.'
              : 'La solicitud fue aprobada. Si no aparece tu acceso, solicita a administración que revise tu vinculación.'}
          </Text>
          {application.data.decision_reason ? (
            <Text selectable>{application.data.decision_reason}</Text>
          ) : null}
          <Text variant="note">
            Enviada: {new Date(application.data.requested_at).toLocaleString('es-CL')}
          </Text>
        </Card>
        <RefreshButton
          label="Actualizar estado"
          onRefresh={() =>
            Promise.all([
              businesses.refetch({ cancelRefetch: false }),
              application.refetch({ cancelRefetch: false }),
            ])
          }
        />
      </Screen>
    );
  return <BusinessApplicationFields initial={application.data} communes={communes.data} />;
}

function BusinessApplicationFields({
  initial,
  communes,
}: {
  initial: BusinessApplication | null;
  communes: Commune[];
}) {
  const queryClient = useQueryClient();
  const scroll = useRef<ScrollViewInstance>(null);
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isValidating },
  } = useForm<BusinessForm>({
    resolver: zodResolver(
      businessFormSchema.refine((value) => communes.some((c) => c.code === value.commune_code), {
        path: ['commune_code'],
        message: 'Selecciona una comuna del catálogo.',
      }),
    ),
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: initial ?? {
      name: '',
      rut: '',
      contact_name: '',
      phone: '',
      address: '',
      commune_code: '',
      brands: [],
      commercial_evidence: '',
      storage_evidence: '',
    },
  });
  const request = useMutation({
    mutationFn: (values: BusinessForm) =>
      submitBusinessApplication(values, initial?.status === 'rejected'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-application'] });
      await queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: () => setConfirming(false),
  });
  const { step, go, back: previous } = useFormSteps({ onExit: back, busy: request.isPending });
  const values = useWatch({ control });
  const submit = handleSubmit(
    (values) => {
      if (initial && !confirming) {
        setConfirming(true);
        return;
      }
      request.mutate(values);
    },
    (invalid) => {
      const invalidStep = stepFields.findIndex((names) => names.some((name) => name in invalid));
      if (invalidStep >= 0) go(invalidStep);
    },
  );
  const matching = communes.filter((c) =>
    `${c.name} ${c.code}`.toLocaleLowerCase('es-CL').includes(search.toLocaleLowerCase('es-CL')),
  );
  const next = async () => {
    if (await trigger(stepFields[step], { shouldFocus: true })) go(step + 1);
  };
  const selectedCommune = communes.find((c) => c.code === values.commune_code);
  const renderField = (item: (typeof fields)[number]) => (
    <Controller
      key={item.name}
      control={control}
      name={item.name}
      render={({ field }) => (
        <CompactFormInput
          ref={field.ref}
          label={item.label}
          icon={item.icon}
          placeholder={item.placeholder}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[item.name]?.message}
          maxLength={item.limit}
          editable={!request.isPending}
          keyboardType={item.name === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize={item.name === 'rut' ? 'characters' : 'sentences'}
          multiline={item.name === 'commercial_evidence' || item.name === 'storage_evidence'}
          help={
            item.name === 'commercial_evidence'
              ? 'Referencias de inicio de actividades, patente y acuerdos comerciales para revisión.'
              : item.name === 'storage_evidence'
                ? 'Referencias del recinto, registro y antecedentes de seguridad aplicables para revisión.'
                : ''
          }
        />
      )}
    />
  );
  return (
    <Screen
      title="Registrar negocio"
      compactHeader
      onBack={previous}
      contentKey={step}
      scrollRef={scroll}
      headerAccessory={<FormStepper steps={steps} current={step} />}
      footer={
        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Atrás" variant="link" onPress={previous} disabled={request.isPending} />
          ) : null}
          <View style={styles.primary}>
            <Button
              label={
                step < 3
                  ? 'Continuar'
                  : request.isPending
                    ? 'Enviando…'
                    : confirming
                      ? 'Confirmar nueva solicitud'
                      : initial
                        ? 'Revisar nueva solicitud'
                        : 'Enviar solicitud'
              }
              disabled={request.isPending || isValidating}
              onPress={() => {
                if (step < 3) void next();
                else void submit();
              }}
            />
          </View>
        </View>
      }
    >
      <Enter key={step}>
        <View style={styles.content}>
          {initial ? (
            <FormCard>
              <StatusBadge label="Solicitud rechazada" tone="error" compact />
              <Text selectable>{initial.decision_reason}</Text>
            </FormCard>
          ) : null}
          <FormStepHeading
            title={step === 3 ? 'Marcas y envío' : steps[step]!.label}
            icon={steps[step]!.icon}
          />
          {step === 0 ? (
            <>
              <FormCard>{fields.slice(0, 2).map(renderField)}</FormCard>
              <FormCard>{fields.slice(2, 4).map(renderField)}</FormCard>
            </>
          ) : null}
          {step === 1 ? (
            <FormCard>
              {renderField(fields[4])}
              <Controller
                control={control}
                name="commune_code"
                render={({ field }) => (
                  <CompactSelect
                    label="Comuna del recinto"
                    selected={
                      selectedCommune
                        ? {
                            value: selectedCommune.code,
                            label: selectedCommune.name,
                            detail: selectedCommune.code,
                          }
                        : undefined
                    }
                    options={matching
                      .slice(0, 6)
                      .map((c) => ({ value: c.code, label: c.name, detail: c.code }))}
                    search={search}
                    onSearch={setSearch}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.commune_code?.message}
                    disabled={request.isPending}
                    hint={
                      matching.length > 6
                        ? 'Busca para acotar resultados.'
                        : String(matching.length) + ' comunas encontradas.'
                    }
                  />
                )}
              />
            </FormCard>
          ) : null}
          {step === 2 ? (
            <>
              <FormCard>{fields.slice(5).map(renderField)}</FormCard>
              <FormNotice
                label="Sin archivos ni acreditación; revisión admin."
                detail={evidenceNotice}
              />
            </>
          ) : null}
          {step === 3 ? (
            <>
              <FormCard>
                <View style={styles.row}>
                  <Text variant="label" style={styles.primary}>
                    Marcas que comercializa
                  </Text>
                  <FormInfo
                    label="Marcas del negocio"
                    detail="Selecciona las marcas que comercializa el negocio. Toca una marca para agregarla o quitarla."
                  />
                </View>
                <Controller
                  control={control}
                  name="brands"
                  render={({ field }) => (
                    <View style={styles.stack}>
                      <View style={styles.brandRow}>
                        {brands.map((brand) => (
                          <FormChoiceTile
                            key={brand}
                            label={brand}
                            selected={field.value.includes(brand)}
                            disabled={request.isPending}
                            onPress={() =>
                              field.onChange(
                                field.value.includes(brand)
                                  ? field.value.filter((b) => b !== brand)
                                  : [...field.value, brand],
                              )
                            }
                          />
                        ))}
                      </View>
                      {errors.brands ? (
                        <Text variant="note" accessibilityRole="alert" style={styles.error}>
                          {errors.brands.message ?? 'Selecciona las marcas.'}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />
              </FormCard>
              <FormCard>
                <Text variant="subtitle" accessibilityRole="header">
                  Resumen
                </Text>
                <FormSummarySection
                  title="Negocio"
                  icon="store"
                  onEdit={() => go(0)}
                  disabled={request.isPending}
                >
                  <Text variant="label" selectable>
                    {values.name}
                  </Text>
                  <Text variant="note" selectable>
                    {values.rut}
                  </Text>
                  <Text variant="note" selectable>
                    {values.contact_name} · {values.phone}
                  </Text>
                </FormSummarySection>
                <FormSummarySection
                  title="Recinto"
                  icon="pin"
                  onEdit={() => go(1)}
                  disabled={request.isPending}
                >
                  <Text variant="note" selectable>
                    {values.address}
                  </Text>
                  <Text variant="note">
                    {selectedCommune?.name} · CUT {selectedCommune?.code}
                  </Text>
                </FormSummarySection>
                <FormSummarySection
                  title="Antecedentes"
                  icon="shield"
                  onEdit={() => go(2)}
                  disabled={request.isPending}
                >
                  <View style={styles.summaryLine}>
                    <Text variant="note" numberOfLines={1} style={styles.primary}>
                      Comerciales: {values.commercial_evidence}
                    </Text>
                    <FormInfo
                      label="Antecedentes comerciales"
                      detail={values.commercial_evidence ?? ''}
                    />
                  </View>
                  <View style={styles.summaryLine}>
                    <Text variant="note" numberOfLines={1} style={styles.primary}>
                      Recinto y seguridad: {values.storage_evidence}
                    </Text>
                    <FormInfo label="Recinto y seguridad" detail={values.storage_evidence ?? ''} />
                  </View>
                </FormSummarySection>
                <FormSummarySection
                  title="Marcas"
                  icon="flame"
                  onEdit={() => {
                    go(3);
                    scroll.current?.scrollTo({ y: 0, animated: true });
                  }}
                  disabled={request.isPending}
                >
                  <Text variant="note">{values.brands?.join(' · ') || 'Sin seleccionar'}</Text>
                </FormSummarySection>
                <FormNotice
                  label="Sin archivos ni acreditación; revisión admin."
                  detail={evidenceNotice}
                />
              </FormCard>
            </>
          ) : null}
          {step === 3 && confirming ? (
            <View style={styles.stack}>
              <Text variant="note">
                Al confirmar, declaras que corregiste el motivo informado. Administración volverá a
                revisar el negocio.
              </Text>
              <Button
                label="Seguir editando"
                variant="link"
                onPress={() => setConfirming(false)}
                disabled={request.isPending}
              />
            </View>
          ) : null}
          {request.isError ? <Feedback text={businessError(request.error)} error /> : null}
        </View>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  stack: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  brandRow: { flexDirection: 'row', gap: theme.spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  primary: { flex: 1, minWidth: theme.spacing.none },
  error: { color: theme.colors.error },
});
