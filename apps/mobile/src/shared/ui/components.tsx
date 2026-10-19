import { useContext, type PropsWithChildren, type ReactNode, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type ViewProps,
} from 'react-native';
import { theme } from '@/theme';
import { FontReadyContext, Text } from './text';
import { PulsePressable } from './pulse-pressable';
import { Icon, type IconName } from './icon';

type ButtonProps = {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'link' | 'destructive';
  style?: StyleProp<ViewStyle>;
};
export function Button({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        ui.button,
        variant === 'primary' && ui.primary,
        variant === 'secondary' && ui.secondary,
        style,
      ]}
    >
      <Text
        variant="label"
        compact
        style={{
          textAlign: 'center',
          flexShrink: 1,
          color:
            variant === 'primary'
              ? theme.colors.onPrimary
              : variant === 'destructive'
                ? theme.colors.error
                : theme.colors.primary,
        }}
      >
        {label}
      </Text>
    </PulsePressable>
  );
}

export function Input({
  label,
  help,
  error,
  style,
  ref,
  ...props
}: TextInputProps & {
  label: string;
  help?: string;
  error?: string | undefined;
  ref?: Ref<TextInput>;
}) {
  const ready = useContext(FontReadyContext);
  return (
    <View style={ui.stack}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={error ?? help}
        allowFontScaling
        maxFontSizeMultiplier={0}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          ui.input,
          { fontFamily: ready ? theme.typography.fonts.regular : theme.typography.family },
          error ? ui.inputError : null,
          style,
        ]}
      />
      {help ? (
        <Text variant="note" style={ui.muted}>
          {help}
        </Text>
      ) : null}
      {error ? (
        <Text variant="note" accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ style, onPress, ...props }: ViewProps & { onPress?: () => void }) {
  if (onPress)
    return (
      <PulsePressable
        {...props}
        accessibilityRole="button"
        onPress={onPress}
        style={[ui.card, style]}
      />
    );
  return <View {...props} style={[ui.card, style]} />;
}

export function OptionCard({
  label,
  detail,
  illustration,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  detail?: string;
  illustration?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PulsePressable
      accessibilityRole="radio"
      accessibilityLabel={[label, detail].filter(Boolean).join(', ')}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[ui.option, selected && ui.selected]}
    >
      {illustration ? <View style={ui.illustration}>{illustration}</View> : null}
      {illustration ? (
        <View style={ui.header}>
          <Text variant="title" style={ui.flex}>
            {label}
          </Text>
          {selected ? <Icon name="check" /> : null}
        </View>
      ) : (
        <>
          <View style={ui.choiceMark}>{selected ? <Icon name="check" /> : null}</View>
          <Text variant="label" style={ui.choiceLabel}>
            {label}
          </Text>
        </>
      )}
      {detail ? (
        <Text variant="note" style={ui.muted}>
          {detail}
        </Text>
      ) : null}
    </PulsePressable>
  );
}

export function Stepper({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={ui.stepper}>
      <View style={ui.stepSide}>
        <Button
          variant="secondary"
          label="−"
          accessibilityLabel="Quitar un cilindro"
          disabled={disabled || value <= 1}
          onPress={() => onChange(value - 1)}
        />
      </View>
      <Text
        variant="subtitle"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${value} cilindros`}
      >
        {value}
      </Text>
      <View style={ui.stepSide}>
        <Button
          variant="secondary"
          label="+"
          accessibilityLabel="Agregar un cilindro"
          disabled={disabled || value >= 99}
          onPress={() => onChange(value + 1)}
        />
      </View>
    </View>
  );
}

export function SegmentedChoice({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={ui.equalRow} accessibilityRole="radiogroup" accessibilityLabel="Canje de envase">
      {[true, false].map((option) => (
        <View key={String(option)} style={ui.flex}>
          <OptionCard
            label={option ? 'Entrego envase vacío' : 'Necesito envase'}
            selected={value === option}
            onPress={() => onChange(option)}
            disabled={disabled}
          />
        </View>
      ))}
    </View>
  );
}

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={ui.header}>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack}
        style={ui.iconButton}
      >
        <Icon name="arrowLeft" />
      </PulsePressable>
      <Text accessibilityRole="header" variant="display" style={ui.flex}>
        {title}
      </Text>
    </View>
  );
}

export function StatusBadge({
  label,
  icon,
  tone = 'primary',
}: {
  label: string;
  icon: IconName;
  tone?: 'primary' | 'accent' | 'success' | 'error';
}) {
  return (
    <View
      style={[
        ui.badge,
        {
          backgroundColor:
            tone === 'accent'
              ? theme.colors.accentLight
              : tone === 'success' || tone === 'error'
                ? theme.colors.surface
                : theme.colors.primaryLight,
        },
      ]}
    >
      <Icon name={icon} color={theme.colors[tone]} />
      <Text variant="label" compact style={{ color: theme.colors[tone], flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

export function Feedback({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <Text
      accessibilityRole={error ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={error ? ui.error : ui.muted}
    >
      {text}
    </Text>
  );
}

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={ui.section}>
      <Text variant="subtitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function CashNote() {
  return (
    <View style={ui.header}>
      <Icon name="cash" />
      <Text variant="note" style={[ui.muted, ui.flex]}>
        Pagas en efectivo al recibir
      </Text>
    </View>
  );
}

export function BrandHeader({ accountAction }: { accountAction?: ReactNode }) {
  return (
    <View style={ui.brandHeader}>
      <View style={ui.header}>
        <Text variant="display" style={ui.primaryText}>
          gasway
        </Text>
        <View style={ui.dot} />
      </View>
      {accountAction}
    </View>
  );
}

export function AccountIcon({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mi cuenta"
      onPress={onPress}
      style={({ pressed }) => [ui.iconButton, pressed && ui.dimmed]}
    >
      <View accessible={false} style={ui.person}>
        <View style={ui.personHead} />
        <View style={ui.personBody} />
      </View>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: theme.spacing.sm },
  muted: { color: theme.colors.textMuted },
  error: { color: theme.colors.error },
  primaryText: { color: theme.colors.primary },
  illustration: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  choiceMark: { minHeight: theme.layout.icon, alignItems: 'center' },
  choiceLabel: { textAlign: 'center' },
  button: {
    width: '100%',
    minHeight: theme.layout.buttonHeight,
    padding: theme.spacing.md,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: {
    backgroundColor: theme.colors.warm,
  },
  dimmed: { opacity: theme.opacity.disabled },
  input: {
    minHeight: theme.layout.inputHeight,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.body,
  },
  inputError: { borderColor: theme.colors.error },
  card: {
    padding: theme.spacing.lg,
    gap: theme.spacing.compact,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.warm,
  },
  option: {
    flexGrow: 1,
    minHeight: theme.layout.inputHeight,
    padding: theme.spacing.compact,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.warm,
  },
  selected: { backgroundColor: theme.colors.primaryLight },
  equalRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'stretch' },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.xl,
  },
  stepSide: { minWidth: theme.layout.touchTarget },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  iconButton: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.compact,
    paddingVertical: theme.spacing.sm,
    maxWidth: '100%',
  },
  section: {
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  dot: {
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  person: { width: theme.layout.icon, alignItems: 'center', gap: theme.spacing.xs },
  personHead: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
  },
  personBody: {
    width: theme.spacing.md,
    height: theme.spacing.compact,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.pill,
    borderTopRightRadius: theme.radii.pill,
  },
});
