import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export function AuthPage({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.brand}>
            <Text style={styles.brandText}>gasway</Text>
            <View style={styles.brandMark} />
          </View>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.body}>{description}</Text>
          </View>
          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Feedback({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <Text
      accessibilityRole={error ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.body, error && styles.error]}
    >
      {text}
    </Text>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.xxl,
    maxWidth: theme.layout.formWidth,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  brandText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
  },
  brandMark: {
    width: theme.spacing.md,
    height: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.sm,
  },
  intro: {
    gap: theme.spacing.md,
    borderLeftWidth: theme.borders.accent,
    borderLeftColor: theme.colors.accent,
    paddingLeft: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.title,
    lineHeight: theme.typography.lineHeights.title,
    fontWeight: theme.typography.weights.bold,
  },
  body: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.body,
    lineHeight: theme.typography.lineHeights.body,
  },
  form: { gap: theme.spacing.lg },
  field: { gap: theme.spacing.sm },
  label: {
    color: theme.colors.text,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
  },
  input: {
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.body,
  },
  inputError: { borderColor: theme.colors.error },
  error: { color: theme.colors.error },
  button: {
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontFamily: theme.typography.family,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
  },
  secondaryText: { color: theme.colors.primary },
  dimmed: { opacity: theme.opacity.disabled },
});
