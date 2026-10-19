import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { brands, type Commune } from '@/shared/orders/contracts';
import { Button, Card, Feedback, Input, OptionCard } from '@/shared/ui/components';
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
  { name: 'name', label: 'Nombre del negocio', limit: 120 },
  { name: 'rut', label: 'RUT del negocio', limit: 20 },
  { name: 'contact_name', label: 'Responsable del negocio', limit: 100 },
  { name: 'phone', label: 'Teléfono de contacto', limit: 24 },
  { name: 'address', label: 'Dirección del recinto', limit: 240 },
  { name: 'commercial_evidence', label: 'Antecedentes comerciales', limit: 1000 },
  { name: 'storage_evidence', label: 'Antecedentes del recinto y seguridad', limit: 1000 },
] as const;

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
        <Button
          label="Reintentar"
          disabled={businesses.isFetching || application.isFetching || communes.isFetching}
          onPress={() =>
            void Promise.all([businesses.refetch(), application.refetch(), communes.refetch()])
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
        <Button
          label="Actualizar estado"
          onPress={() => void Promise.all([businesses.refetch(), application.refetch()])}
          disabled={businesses.isFetching || application.isFetching}
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
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessForm>({
    resolver: zodResolver(
      businessFormSchema.refine((value) => communes.some((c) => c.code === value.commune_code), {
        path: ['commune_code'],
        message: 'Selecciona una comuna del catálogo.',
      }),
    ),
    mode: 'onBlur',
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
  const submit = handleSubmit((values) => {
    if (initial && !confirming) {
      setConfirming(true);
      return;
    }
    request.mutate(values);
  });
  const matching = communes.filter((c) =>
    `${c.name} ${c.code}`.toLocaleLowerCase('es-CL').includes(search.toLocaleLowerCase('es-CL')),
  );
  return (
    <Screen title="Registrar mi negocio" onBack={back}>
      <Text>
        Cuéntanos quién vende y dónde opera. El negocio y sus responsables tienen permisos distintos
        a los del repartidor.
      </Text>
      <Text variant="note">
        Las referencias de antecedentes son privadas. Este formulario no sube documentos ni acredita
        permisos legales; administración debe contrastarlos antes de una operación real.
      </Text>
      {initial ? (
        <Card>
          <Text variant="subtitle">Solicitud rechazada</Text>
          <Text selectable>{initial.decision_reason}</Text>
          <Text>Corrige el motivo antes de volver a enviarla.</Text>
        </Card>
      ) : null}
      {fields.map((item) => (
        <Controller
          key={item.name}
          control={control}
          name={item.name}
          render={({ field }) => (
            <Input
              ref={field.ref}
              label={item.label}
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
      ))}
      <Controller
        control={control}
        name="commune_code"
        render={({ field }) => (
          <View
            style={styles.options}
            accessibilityRole="radiogroup"
            accessibilityLabel="Comuna del negocio"
          >
            <Text variant="subtitle">Comuna del recinto</Text>
            <Text>{communes.find((c) => c.code === field.value)?.name ?? 'Sin seleccionar'}</Text>
            <Input
              label="Buscar comuna o código CUT"
              value={search}
              onChangeText={setSearch}
              editable={!request.isPending}
            />
            {matching.slice(0, 6).map((c) => (
              <OptionCard
                key={c.code}
                label={`${c.name} (${c.code})`}
                selected={field.value === c.code}
                disabled={request.isPending}
                onPress={() => field.onChange(c.code)}
              />
            ))}
            <Text variant="note">
              {matching.length > 6
                ? 'Escribe para acotar los resultados.'
                : `${matching.length} comunas encontradas.`}
            </Text>
            {errors.commune_code ? (
              <Feedback text={errors.commune_code.message ?? 'Selecciona una comuna.'} error />
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="brands"
        render={({ field }) => (
          <View style={styles.options}>
            <Text variant="subtitle">Marcas que comercializa el negocio</Text>
            {brands.map((brand) => (
              <Button
                key={brand}
                label={`${field.value.includes(brand) ? 'Quitar' : 'Agregar'} ${brand}`}
                variant={field.value.includes(brand) ? 'primary' : 'secondary'}
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
            {errors.brands ? (
              <Feedback text={errors.brands.message ?? 'Selecciona las marcas.'} error />
            ) : null}
          </View>
        )}
      />
      {confirming ? (
        <Text>
          Al confirmar, declaras que corregiste el motivo informado. Administración volverá a
          revisar el negocio.
        </Text>
      ) : null}
      {request.isError ? <Feedback text={businessError(request.error)} error /> : null}
      <Button
        label={
          request.isPending
            ? 'Enviando…'
            : confirming
              ? 'Confirmar nueva solicitud'
              : initial
                ? 'Revisar nueva solicitud'
                : 'Enviar solicitud'
        }
        disabled={request.isPending}
        onPress={() => void submit()}
      />
      {confirming ? (
        <Button
          label="Seguir editando"
          variant="secondary"
          onPress={() => setConfirming(false)}
          disabled={request.isPending}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ options: { gap: theme.spacing.sm } });
