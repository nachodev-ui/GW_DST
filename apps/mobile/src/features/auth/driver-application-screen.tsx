import { useState } from 'react';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import {
  applicationFormSchema,
  type ApplicationForm,
} from '@/features/auth/driver-application-form';
import {
  acceptDriverInvitation,
  driverApplicationError,
  fetchAcceptedDriverInvitation,
  fetchDriverApplication,
  fetchDriverInvitations,
  submitDriverApplication,
  type AcceptedDriverInvitation,
  type DriverApplication,
} from '@/features/auth/driver-application';
import { Button, Card, Feedback, Input } from '@/shared/ui/components';
import { Screen } from '@/shared/ui/screen';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';

const back = () => router.replace('/customer/account');

export function DriverApplicationScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const application = useQuery({
    queryKey: ['driver-application', session?.user.id],
    queryFn: () => fetchDriverApplication(session!.user.id),
    enabled: !!session,
    staleTime: 0,
  });
  const accepted = useQuery({
    queryKey: ['driver-invitation', session?.user.id],
    queryFn: fetchAcceptedDriverInvitation,
    enabled: !!session,
    staleTime: 0,
  });
  const invitations = useQuery({
    queryKey: ['driver-invitations', session?.user.id],
    queryFn: fetchDriverInvitations,
    enabled: !!session,
    staleTime: 0,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['driver-invitation'] }),
      queryClient.invalidateQueries({ queryKey: ['driver-invitations'] }),
      queryClient.invalidateQueries({ queryKey: ['driver-application'] }),
      queryClient.invalidateQueries({ queryKey: ['auth-access'] }),
    ]);
  const acceptance = useMutation({
    mutationFn: acceptDriverInvitation,
    onSuccess: async () => {
      setSelected(null);
      await refresh();
    },
    onError: refresh,
  });
  if (application.isPending || accepted.isPending || invitations.isPending)
    return (
      <Screen title="Activar acceso de conductor" onBack={back}>
        <Skeleton rows={4} />
      </Screen>
    );
  if (application.isError || accepted.isError || invitations.isError)
    return (
      <Screen title="Activar acceso de conductor" onBack={back}>
        <Feedback
          text={driverApplicationError(application.error ?? accepted.error ?? invitations.error)}
          error
        />
        <Button
          label="Reintentar"
          disabled={application.isFetching || accepted.isFetching || invitations.isFetching}
          onPress={() => void refresh()}
        />
      </Screen>
    );
  const current = application.data;
  if (
    current?.status === 'approved' ||
    (current?.status === 'pending' && current.applicant_name && current.invitation_id)
  )
    return (
      <Screen title="Activar acceso de conductor" onBack={back}>
        <Text>
          Tu solicitud de habilitación ya fue enviada. Revisa su estado en Mi cuenta. La aceptación
          del negocio y la habilitación de Gasway son decisiones distintas.
        </Text>
        <Button label="Volver a Mi cuenta" onPress={back} />
      </Screen>
    );
  const usable =
    accepted.data &&
    !(current?.status === 'rejected' && current.invitation_id === accepted.data.id);
  if (usable && accepted.data)
    return <DriverDetails key={accepted.data.id} invitation={accepted.data} initial={current} />;
  return (
    <Screen title="Activar acceso de conductor" onBack={back}>
      <Text>
        El negocio para el que repartes debe invitarte a su equipo. Usa la cuenta con el correo
        confirmado que le indicaste. No necesitas ser dueño de un vehículo para recibir una
        invitación.
      </Text>
      <Text variant="note">Cuenta actual: {session?.user.email}</Text>
      {current?.status === 'rejected' ? (
        <Card>
          <Text variant="label">Motivo de la revisión anterior</Text>
          <Text selectable>{current.decision_reason}</Text>
          <Text>
            Corrige el motivo y pide una nueva invitación al negocio para iniciar otra revisión.
          </Text>
        </Card>
      ) : null}
      {current?.status === 'pending' && current.applicant_name ? (
        <Text>
          Tu solicitud anterior se conserva. Administración y el negocio pueden revisar ese vínculo;
          no elijas otra distribuidora para reemplazar una solicitud en revisión.
        </Text>
      ) : null}
      {invitations.data.length === 0 ? (
        <Card>
          <Text variant="subtitle">No tienes invitaciones vigentes</Text>
          <Text>
            Pide al dueño o encargado que te incorpore desde Mi negocio → Equipo. Puedes seguir
            comprando mientras tanto.
          </Text>
        </Card>
      ) : (
        invitations.data.map((invitation) => (
          <Card key={invitation.id}>
            <Text variant="subtitle">{invitation.distributor_name}</Text>
            <Text>Invitación para {invitation.name}</Text>
            <Text variant="note">
              Vence: {new Date(invitation.expires_at).toLocaleString('es-CL')}
            </Text>
            {selected === invitation.id ? (
              <>
                <Text>
                  Al aceptar reconoces tu vinculación con este negocio. Después completarás tus
                  antecedentes. Esto no habilita el reparto automáticamente.
                </Text>
                <Button
                  label={acceptance.isPending ? 'Aceptando…' : 'Confirmar aceptación'}
                  disabled={acceptance.isPending}
                  onPress={() => acceptance.mutate(invitation.id)}
                />
                <Button
                  label="Cancelar"
                  variant="secondary"
                  disabled={acceptance.isPending}
                  onPress={() => setSelected(null)}
                />
              </>
            ) : (
              <Button
                label="Revisar invitación"
                disabled={acceptance.isPending}
                onPress={() => {
                  acceptance.reset();
                  setSelected(invitation.id);
                }}
              />
            )}
          </Card>
        ))
      )}
      {acceptance.isError ? (
        <Feedback text={driverApplicationError(acceptance.error)} error />
      ) : null}
      <Button
        label="Actualizar invitaciones"
        variant="secondary"
        disabled={invitations.isFetching || accepted.isFetching}
        onPress={() => void refresh()}
      />
    </Screen>
  );
}

function DriverDetails({
  invitation,
  initial,
}: {
  invitation: AcceptedDriverInvitation;
  initial: DriverApplication | null;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const reapply = initial?.status === 'rejected';
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: initial?.applicant_name ?? invitation.name,
      rut: initial?.applicant_rut ?? '',
      phone: initial?.applicant_phone ?? '',
      invitation_id: invitation.id,
    },
  });
  const request = useMutation({
    mutationFn: (values: ApplicationForm) => submitDriverApplication(values, reapply),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver-application'] }),
        queryClient.invalidateQueries({ queryKey: ['auth-access'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-team'] }),
      ]);
      back();
    },
  });
  const submit = handleSubmit((values) => {
    if (reapply && !confirming) {
      setConfirming(true);
      return;
    }
    request.mutate(values);
  });
  return (
    <Screen title="Completar antecedentes" onBack={back}>
      <Card>
        <Text variant="subtitle">{invitation.distributor_name}</Text>
        <Text>
          Invitación aceptada. El negocio reconoce el vínculo; administración revisará tu
          habilitación.
        </Text>
      </Card>
      {!invitation.business_enabled ? (
        <Feedback
          text="El negocio ya no está habilitado. Contacta a su responsable antes de continuar."
          error
        />
      ) : null}
      <Text>
        Tu RUT y teléfono quedan privados para la revisión de Gasway. Estos datos no sustituyen los
        antecedentes vigentes de conductor, vehículo y seguridad requeridos antes del piloto.
      </Text>
      {reapply ? (
        <Card>
          <Text variant="label">Motivo de la revisión anterior</Text>
          <Text selectable>{initial.decision_reason}</Text>
        </Card>
      ) : null}
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            ref={field.ref}
            label="Nombre completo"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            maxLength={100}
            editable={!request.isPending}
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => setFocus('rut')}
          />
        )}
      />
      <Controller
        control={control}
        name="rut"
        render={({ field }) => (
          <Input
            ref={field.ref}
            label="RUT"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.rut?.message}
            maxLength={20}
            editable={!request.isPending}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => setFocus('phone')}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Input
            ref={field.ref}
            label="Teléfono de contacto"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.phone?.message}
            maxLength={24}
            editable={!request.isPending}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        )}
      />
      {confirming ? (
        <Text>
          Al confirmar, declaras que corregiste el motivo informado. Se iniciará una nueva revisión,
          sin habilitar el reparto automáticamente.
        </Text>
      ) : null}
      {request.isError ? <Feedback text={driverApplicationError(request.error)} error /> : null}
      <Button
        label={
          request.isPending
            ? 'Enviando…'
            : reapply && !confirming
              ? 'Revisar antecedentes corregidos'
              : 'Enviar a revisión de Gasway'
        }
        disabled={request.isPending || !invitation.business_enabled}
        onPress={() => void submit()}
      />
      {confirming ? (
        <Button
          label="Seguir editando"
          variant="secondary"
          disabled={request.isPending}
          onPress={() => setConfirming(false)}
        />
      ) : null}
    </Screen>
  );
}
