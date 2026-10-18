import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabase } from '@/shared/supabase/client';
import { ActionButton, AuthPage, Feedback, styles } from '@/features/auth/auth-ui';
import {
  authErrorMessage,
  credentialsSchema,
  registrationSchema,
  type Credentials,
} from '@/features/auth/credentials';

export function AccessScreen() {
  const [register, setRegister] = useState(false);
  const [notice, setNotice] = useState('');
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(register ? registrationSchema : credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    setNotice('');
    try {
      const client = getSupabase();
      const result = register
        ? await client.auth.signUp(values)
        : await client.auth.signInWithPassword(values);
      if (result.error) throw result.error;
      reset();
      if (register && !result.data.session) {
        setRegister(false);
        setNotice('Revisa tu correo para confirmar tu cuenta. Luego vuelve aquí e inicia sesión.');
      }
    } catch (error) {
      setError('root', { message: authErrorMessage(error) });
    }
  });

  return (
    <AuthPage
      title={register ? 'Tu cuenta, cerca de casa.' : 'Qué bueno tenerte por aquí.'}
      description={
        register
          ? 'Crea tu cuenta de cliente. Si quieres repartir, podrás solicitarlo al ingresar.'
          : 'Ingresa a Gasway con tu correo y contraseña.'
      }
    >
      <View style={styles.field}>
        <Text nativeID="email-label" style={styles.label}>
          Correo electrónico
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextInput
              ref={ref}
              accessibilityLabel="Correo electrónico"
              accessibilityLabelledBy="email-label"
              style={[styles.input, !!errors.email && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isSubmitting}
              returnKeyType="next"
            />
          )}
        />
        {errors.email?.message ? <Feedback text={errors.email.message} error /> : null}
      </View>
      <View style={styles.field}>
        <Text nativeID="password-label" style={styles.label}>
          Contraseña
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextInput
              ref={ref}
              accessibilityLabel="Contraseña"
              accessibilityLabelledBy="password-label"
              style={[styles.input, !!errors.password && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={register ? 'new-password' : 'current-password'}
              textContentType={register ? 'newPassword' : 'password'}
              editable={!isSubmitting}
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
          )}
        />
        {register ? (
          <Feedback text="Usa al menos 8 caracteres. Puedes pegar tu contraseña desde tu gestor." />
        ) : null}
        {errors.password?.message ? <Feedback text={errors.password.message} error /> : null}
      </View>
      {errors.root?.message ? <Feedback text={errors.root.message} error /> : null}
      {notice ? <Feedback text={notice} /> : null}
      <ActionButton
        label={isSubmitting ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Ingresar'}
        disabled={isSubmitting}
        onPress={() => void submit()}
      />
      <ActionButton
        secondary
        label={register ? 'Ya tengo una cuenta' : 'Crear una cuenta'}
        disabled={isSubmitting}
        onPress={() => {
          setRegister(!register);
          reset();
          setNotice('');
        }}
      />
    </AuthPage>
  );
}
