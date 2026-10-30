import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabase } from '@/shared/supabase/client';
import { Input } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import {
  AccessPage,
  AccessNavigation,
  AccessSubmit,
  AccessFeedback,
  PasswordRequirements,
  styles,
} from '@/features/auth/access-ui';
import { useRegistration } from '@/features/auth/registration';
import {
  authErrorMessage,
  credentialsSchema,
  registrationSchema,
  type Credentials,
} from '@/features/auth/credentials';

export function AccessScreen() {
  const contact = useRegistration((state) => state.contact);
  const registrationPending = useRegistration((state) => state.submitting);
  const [register, setRegister] = useState(!!contact);
  const submitting = useRef(false);
  const [focusedField, setFocusedField] = useState<keyof Credentials | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(register ? registrationSchema : credentialsSchema),
    defaultValues: { email: contact?.email ?? '', password: '' },
  });
  useFocusEffect(
    useCallback(() => {
      const saved = useRegistration.getState().contact;
      if (saved) {
        setRegister(true);
        reset({ email: saved.email, password: '' });
      }
    }, [reset]),
  );
  const submit = () =>
    handleSubmit(async (values) => {
      if (submitting.current) return;
      submitting.current = true;
      try {
        if (register) {
          if (useRegistration.getState().begin(values)) {
            reset();
            router.push('/auth/phone');
          }
          return;
        }
        const result = await getSupabase().auth.signInWithPassword(values);
        if (result.error) throw result.error;
        reset();
      } catch (error) {
        setError('root', { message: authErrorMessage(error) });
      } finally {
        submitting.current = false;
      }
    })();

  return (
    <AccessPage
      title={register ? 'Crea tu cuenta.' : 'Inicia sesión.'}
      navigation={
        <AccessNavigation
          register={register}
          disabled={isSubmitting || registrationPending}
          onChange={(nextRegister) => {
            if (nextRegister === register) return;
            setRegister(nextRegister);
            reset({ email: useRegistration.getState().contact?.email ?? '', password: '' });
            setFocusedField(null);
          }}
        />
      }
    >
      {register && contact ? (
        <Text variant="note" style={styles.muted}>
          Retoma tu registro. Ingresa nuevamente tu contraseña para continuar.
        </Text>
      ) : null}
      {registrationPending ? (
        <AccessFeedback text="Tu solicitud de registro sigue en curso. Espera a que termine para continuar." />
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Input
            ref={ref}
            label="Correo electrónico"
            placeholder="nombre@correo.cl"
            error={errors.email?.message}
            style={[styles.input, focusedField === 'email' && !errors.email && styles.inputFocused]}
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocusedField('email')}
            onBlur={() => {
              onBlur();
              setFocusedField(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!isSubmitting && !registrationPending}
            returnKeyType="next"
            onSubmitEditing={() => setFocus('password')}
            submitBehavior="submit"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <View style={styles.passwordField}>
            <Input
              ref={ref}
              label="Contraseña"
              error={errors.password?.message}
              accessibilityHint={
                register ? 'Mínimo 8 caracteres, una mayúscula y un número.' : undefined
              }
              style={[
                styles.input,
                focusedField === 'password' && !errors.password && styles.inputFocused,
              ]}
              value={value}
              onChangeText={onChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => {
                onBlur();
                setFocusedField(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={register ? 'new-password' : 'current-password'}
              textContentType={register ? 'newPassword' : 'password'}
              editable={!isSubmitting && !registrationPending}
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
            {register ? <PasswordRequirements password={value} /> : null}
          </View>
        )}
      />
      {errors.root?.message ? <AccessFeedback text={errors.root.message} error /> : null}
      <AccessSubmit
        label={register ? 'Continuar' : 'Ingresar'}
        loadingLabel={register ? 'Continuando…' : 'Ingresando…'}
        loading={isSubmitting}
        disabled={registrationPending}
        onPress={() => void submit()}
      />
    </AccessPage>
  );
}
