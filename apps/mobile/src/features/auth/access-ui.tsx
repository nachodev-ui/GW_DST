import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function AccessPage({
  title,
  description,
  footer,
  children,
}: PropsWithChildren<{ title: string; description: string; footer: ReactNode }>) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.brand}>
            <Text variant="title">gasway</Text>
            <View style={styles.brandDot} accessible={false} aria-hidden />
          </View>
          <View style={styles.form}>
            <View style={styles.intro}>
              <Text variant="display" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.muted}>{description}</Text>
            </View>
            {children}
          </View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AccessFeedback({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <Text
      variant="note"
      accessibilityRole={error ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.feedback, error && styles.error]}
    >
      {text}
    </Text>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.layout.accessFormWidth,
    alignSelf: 'center',
    padding: theme.spacing.screen,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xxl,
  },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs },
  brandDot: {
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: theme.typography.accessTitleSize,
    lineHeight: theme.typography.lineHeights.accessTitle,
  },
  form: { gap: theme.spacing.lg },
  intro: { gap: theme.spacing.compact, paddingBottom: theme.spacing.sm },
  footer: {
    marginTop: 'auto',
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: { color: theme.colors.textMuted, textAlign: 'center' },
  button: { borderRadius: theme.radii.control, borderCurve: 'continuous' },
  input: {
    borderWidth: theme.borders.focus,
    padding: theme.spacing.md - theme.borders.thin,
  },
  muted: { color: theme.colors.textMuted },
  inputFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  feedback: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.primaryLight,
    color: theme.colors.text,
  },
  error: { backgroundColor: theme.colors.accentLight, color: theme.colors.error },
});
