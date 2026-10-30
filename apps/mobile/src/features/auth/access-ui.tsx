import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { registrationPasswordRequirements } from '@/features/auth/credentials';

/** Decorative route and doorway, drawn in the existing brand palette. */
function AccessArtwork() {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.artwork}
    >
      <Svg width="100%" height="100%" viewBox={theme.access.artwork.viewBox} aria-hidden>
        <Circle
          cx="133"
          cy="109"
          r="100"
          fill="none"
          stroke={theme.colors.heroEnd}
          strokeWidth={theme.access.artwork.outlineWidth}
        />
        <Path
          d="M48 216v-44c0-23 18-41 41-41h40c23 0 41-18 41-41V0"
          fill="none"
          stroke={theme.colors.lime}
          strokeWidth={theme.access.artwork.routeWidth}
        />
        <Rect
          x="30"
          y="49"
          width="106"
          height="106"
          rx="35"
          fill={theme.colors.lime}
          transform="rotate(-12 83 102)"
        />
        <Path
          d="m59 98 24-21 24 21v29H91v-22H75v22H59Z"
          fill="none"
          stroke={theme.colors.heroStart}
          strokeWidth={theme.access.artwork.routeWidth}
          strokeLinejoin="round"
        />
        <Circle cx="48" cy="194" r="6" fill={theme.colors.background} />
        <Circle cx="112" cy="27" r="4" fill={theme.colors.lime} />
      </Svg>
    </View>
  );
}

export function AccessPage({
  title,
  navigation,
  children,
  step = false,
}: PropsWithChildren<{ title: string; navigation: ReactNode; step?: boolean }>) {
  return (
    <SafeAreaView style={[styles.safe, step && styles.stepSafe]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.canvas}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
        >
          {step ? (
            <View style={styles.stepHeader}>
              {navigation}
              <GaswayLogo />
            </View>
          ) : (
            <View style={styles.hero}>
              <View style={styles.heroContent}>
                <AccessArtwork />
                <GaswayLogo appearance="dark" />
                <Text variant="display" accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
              </View>
            </View>
          )}
          <SafeAreaView style={[styles.sheet, step && styles.stepSheet]} edges={['bottom']}>
            <View style={styles.form}>
              {step ? (
                <>
                  <Text variant="label" style={styles.stepEyebrow}>
                    CREA TU CUENTA · 2 DE 2
                  </Text>
                  <Text variant="display" accessibilityRole="header" style={styles.stepTitle}>
                    {title}
                  </Text>
                </>
              ) : (
                navigation
              )}
              {children}
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AccessNavigation({
  register,
  disabled,
  onChange,
}: {
  register: boolean;
  disabled: boolean;
  onChange: (register: boolean) => void;
}) {
  return (
    <View style={styles.switch} accessibilityRole="radiogroup" accessibilityLabel="Acceso a Gasway">
      {[false, true].map((option) => (
        <PulsePressable
          key={String(option)}
          accessibilityRole="radio"
          accessibilityState={{ checked: register === option, disabled }}
          aria-checked={register === option}
          disabled={disabled}
          onPress={() => onChange(option)}
          style={[styles.switchOption, register === option && styles.switchSelected]}
        >
          <Text
            variant="label"
            style={[styles.switchText, register === option && styles.switchSelectedText]}
          >
            {option ? 'Registrarme' : 'Iniciar sesión'}
          </Text>
        </PulsePressable>
      ))}
    </View>
  );
}

export function AccessSubmit({
  label,
  loadingLabel,
  loading,
  onPress,
  disabled = false,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PulsePressable
      haptic
      accessibilityRole="button"
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      disabled={loading || disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text variant="label" style={styles.buttonText}>
        {loading ? loadingLabel : label}
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.background} />
      ) : (
        <Icon name="arrowRight" color={theme.colors.background} />
      )}
    </PulsePressable>
  );
}

export function AccessBack({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel="Volver al registro"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.back}
    >
      <Icon name="arrowLeft" />
      <Text variant="label">Volver</Text>
    </PulsePressable>
  );
}

export function RegistrationPhonePrefix() {
  return (
    <View
      style={styles.phonePrefix}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={theme.access.flagWidth}
        height={theme.access.flagHeight}
        viewBox="0 0 30 20"
        aria-hidden
      >
        <Rect width="30" height="20" fill={theme.access.flagColors.white} />
        <Rect y="10" width="30" height="10" fill={theme.access.flagColors.red} />
        <Rect width="10" height="10" fill={theme.access.flagColors.blue} />
        <Path
          d="m5 1.6.8 2.5h2.6l-2.1 1.5.8 2.5L5 6.5 2.9 8.1l.8-2.5-2.1-1.5h2.6Z"
          fill={theme.access.flagColors.white}
        />
      </Svg>
      <Text variant="subtitle">+56 9</Text>
    </View>
  );
}

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <View style={styles.passwordRequirements}>
      {registrationPasswordRequirements.map((requirement) => {
        const met = requirement.check(password);
        return (
          <View
            key={requirement.label}
            accessible
            accessibilityLabel={`${requirement.label}: ${met ? 'cumplido' : 'pendiente'}`}
            accessibilityLiveRegion="polite"
            style={styles.passwordRequirement}
          >
            <Icon
              name={met ? 'check' : 'close'}
              color={met ? theme.colors.success : theme.colors.error}
              size={theme.spacing.md}
            />
            <Text
              variant="note"
              style={[styles.passwordRequirementText, met && styles.passwordRequirementMet]}
            >
              {requirement.label}
            </Text>
          </View>
        );
      })}
    </View>
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
  passwordField: { gap: theme.spacing.sm },
  passwordRequirements: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.compact,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.warm,
  },
  passwordRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  passwordRequirementText: { flex: 1, color: theme.colors.textMuted },
  passwordRequirementMet: { color: theme.colors.success },
  stepSafe: { backgroundColor: theme.colors.background },
  stepHeader: {
    width: '100%',
    maxWidth: theme.layout.accessFormWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
  },
  stepSheet: { marginTop: theme.spacing.none },
  stepEyebrow: { color: theme.colors.textMuted, letterSpacing: theme.typography.tracking.eyebrow },
  stepTitle: { color: theme.colors.text, marginBottom: theme.spacing.sm },
  muted: { color: theme.colors.textMuted },
  back: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
    minHeight: theme.layout.touchTarget,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  phoneFrame: { minHeight: theme.access.phoneFieldHeight, borderColor: theme.colors.surfaceBorder },
  phoneFrameFocused: { borderColor: theme.colors.primary, borderWidth: theme.borders.focus },
  phoneDigits: {
    fontSize: theme.access.phoneDigitSize,
    letterSpacing: theme.access.phoneDigitTracking,
  },
  buttonDisabled: { opacity: theme.opacity.disabled },
  safe: { flex: 1, backgroundColor: theme.colors.heroStart },
  canvas: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: theme.colors.heroStart, overflow: 'hidden' },
  heroContent: {
    width: '100%',
    maxWidth: theme.layout.accessFormWidth,
    minHeight: theme.access.heroMinHeight,
    alignSelf: 'center',
    padding: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + theme.spacing.screen,
    gap: theme.spacing.xl,
  },
  artwork: {
    position: 'absolute',
    width: theme.access.artworkWidth,
    height: theme.access.artworkHeight,
    top: theme.access.artworkTop,
    right: theme.access.artworkRight,
  },
  title: {
    color: theme.colors.background,
    fontSize: theme.access.titleSize,
    lineHeight: theme.access.titleLineHeight,
    letterSpacing: theme.typography.tracking.display,
    maxWidth: theme.access.titleWidth,
  },
  sheet: {
    flexGrow: 1,
    marginTop: theme.access.sheetOverlap,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    backgroundColor: theme.colors.background,
  },
  form: {
    width: '100%',
    maxWidth: theme.layout.accessFormWidth,
    alignSelf: 'center',
    padding: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  switch: {
    flexDirection: 'row',
    padding: theme.access.switchInset,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
    marginBottom: theme.spacing.sm,
  },
  switchOption: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.compact,
    borderRadius: theme.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchSelected: { backgroundColor: theme.colors.surface, ...theme.elevation.low },
  switchText: { color: theme.colors.textMuted, textAlign: 'center' },
  switchSelectedText: { color: theme.colors.text },
  button: {
    ...theme.elevation.low,
    minHeight: theme.access.submitHeight,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  buttonText: { flex: 1, color: theme.colors.background },
  input: {
    borderWidth: theme.borders.thin,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  inputFocused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  feedback: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.primaryLight,
    color: theme.colors.text,
  },
  error: { backgroundColor: theme.colors.errorLight, color: theme.colors.error },
});
