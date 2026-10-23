import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSupabase } from '@/shared/supabase/client';
import { Button, Input } from '@/shared/ui/components';
import {
  AccessPage,
  AccessSubmit,
  AccessFeedback,
  AccessBack,
  RegistrationPhonePrefix,
  styles,
} from '@/features/auth/access-ui';
import { Text } from '@/shared/ui/text';
import { authErrorMessage, registrationPhoneDigitsSchema } from '@/features/auth/credentials';
import { confirmationRedirect } from '@/features/auth/confirmation';
import { useRegistration } from '@/features/auth/registration';

const phoneFormSchema = z.object({ phone: registrationPhoneDigitsSchema });
type PhoneForm = z.input<typeof phoneFormSchema>;

export function RegistrationPhoneScreen() {
  const {
    draft,
    contact,
    error: serverError,
    retryAt,
    submitting,
    setPhone,
    submit: register,
  } = useRegistration();
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (retryAt <= Date.now()) return;
    let active = true;
    // Synchronize the external clock after commit; ignore a discarded effect.
    queueMicrotask(() => {
      if (active) setNow(Date.now());
    });
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAt) clearInterval(timer);
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [retryAt]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: contact?.digits ?? '' },
  });
  const submit = handleSubmit(async ({ phone }) => {
    try {
      const result = await register(
        getSupabase().auth,
        phone,
        Platform.OS === 'web' ? window.location.origin : confirmationRedirect,
      );
      if (result === 'check-email') router.replace('/auth/check-email');
      if (result === 'authenticated') router.replace('/');
    } catch (error) {
      setError('root', { message: authErrorMessage(error) });
    }
  });
  const feedback = serverError ?? errors.root?.message;

  // Successful submission clears the draft before navigation commits.
  if (!draft && !submitting) {
    return <Redirect href={useRegistration.getState().email ? '/auth/check-email' : '/access'} />;
  }

  return (
    <AccessPage
      title="Tu teléfono."
      step
      navigation={
        <AccessBack
          disabled={submitting}
          onPress={() => {
            useRegistration.getState().leave('/access');
            router.replace('/access');
          }}
        />
      }
    >
      <Text style={styles.muted}>Lo usaremos para coordinar tus entregas.</Text>
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Input
            ref={ref}
            label="Teléfono de contacto"
            prefix={<RegistrationPhonePrefix />}
            accessibilityLabel="Teléfono móvil de Chile, prefijo fijo +56 9. Ingresa los ocho dígitos restantes"
            placeholder="12345678"
            help="Escribe solo los 8 dígitos restantes."
            error={errors.phone?.message}
            frameStyle={[styles.phoneFrame, focused && !errors.phone && styles.phoneFrameFocused]}
            style={styles.phoneDigits}
            value={value}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 8);
              onChange(digits);
              setPhone(digits);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              onBlur();
              setFocused(false);
            }}
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="off"
            textContentType="telephoneNumber"
            autoCorrect={false}
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {feedback ? <AccessFeedback text={feedback} error /> : null}
      {remaining > 0 ? (
        <Text variant="note" style={styles.muted}>
          Pausamos los intentos por un momento. Puedes volver y retomar tu registro.
        </Text>
      ) : null}
      <AccessSubmit
        label={
          remaining > 0
            ? `Reintentar en ${remaining} s`
            : serverError
              ? 'Reintentar'
              : 'Crear cuenta'
        }
        loadingLabel="Creando cuenta…"
        loading={submitting}
        disabled={remaining > 0}
        onPress={() => void submit()}
      />
    </AccessPage>
  );
}

export function RegistrationCheckEmailScreen() {
  const email = useRegistration((state) => state.email);
  if (!email) return <Redirect href="/access" />;
  return (
    <AccessPage
      title={'Revisa tu\ncorreo.'}
      navigation={
        <Button
          label="Volver al inicio de sesión"
          variant="link"
          onPress={() => router.replace('/access')}
        />
      }
    >
      <AccessFeedback
        text={`Revisa ${email} y abre el enlace en este teléfono para confirmar tu cuenta. Si no lo encuentras, revisa la carpeta de spam.`}
      />
      <AccessFeedback text="Si ya tienes una cuenta con ese correo, inicia sesión con tu contraseña." />
      <AccessSubmit
        label="Ir a iniciar sesión"
        loadingLabel="Continuando…"
        loading={false}
        onPress={() => router.replace('/access')}
      />
    </AccessPage>
  );
}
