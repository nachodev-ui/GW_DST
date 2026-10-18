import { useState } from 'react';
import { Platform } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSupabase } from '@/shared/supabase/client';
import { Button, Input } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import { AccessPage, AccessFeedback, styles } from '@/features/auth/access-ui';
import {
  authErrorMessage,
  credentialsSchema,
  registrationSchema,
  type Credentials,
} from '@/features/auth/credentials';

export function AccessScreen() {
  const [register, setRegister] = useState(false);
  const [notice, setNotice] = useState('');
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
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    setNotice('');
    try {
      const client = getSupabase();
      const result = register
        ? await client.auth.signUp({
            ...values,
            ...(Platform.OS === 'web'
              ? { options: { emailRedirectTo: window.location.origin } }
              : {}),
          })
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
    <AccessPage
      title={register ? 'Crea tu cuenta' : 'Inicia sesión'}
      description={
        register
          ? 'Pide gas a distribuidores de tu zona. Si quieres repartir, podrás solicitarlo al ingresar.'
          : 'Tu próximo pedido empieza aquí. Ingresa con tu correo y contraseña.'
      }
      footer={
        <>
          <Text variant="note" style={styles.footerText}>
            {register ? '¿Ya eres parte de Gasway?' : '¿Primera vez en Gasway?'}
          </Text>
          <Button
            variant="link"
            label={register ? 'Iniciar sesión' : 'Crear una cuenta'}
            disabled={isSubmitting}
            onPress={() => {
              setRegister(!register);
              reset();
              setNotice('');
            }}
          />
        </>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <Input
            ref={ref}
            label="Correo electrónico"
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
            editable={!isSubmitting}
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
          <Input
            ref={ref}
            label="Contraseña"
            error={errors.password?.message}
            help={
              register
                ? 'Usa al menos 8 caracteres. Puedes pegar tu contraseña desde tu gestor.'
                : ''
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
            editable={!isSubmitting}
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />
        )}
      />
      {errors.root?.message ? <AccessFeedback text={errors.root.message} error /> : null}
      {notice ? <AccessFeedback text={notice} /> : null}
      <Button
        style={styles.button}
        label={isSubmitting ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Ingresar'}
        disabled={isSubmitting}
        onPress={() => void submit()}
      />
    </AccessPage>
  );
}
