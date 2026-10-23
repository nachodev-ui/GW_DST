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
import { GaswayLogo } from './gasway-logo';

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
      haptic={variant === 'primary'}
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
  prefix,
  frameStyle,
  hideLabel = false,
  style,
  ref,
  ...props
}: TextInputProps & {
  label: string;
  help?: string;
  error?: string | undefined;
  prefix?: ReactNode;
  frameStyle?: StyleProp<ViewStyle>;
  hideLabel?: boolean;
  ref?: Ref<TextInput>;
}) {
  const ready = useContext(FontReadyContext);
  return (
    <View style={ui.stack}>
      {!hideLabel ? <Text variant="label">{label}</Text> : null}
      <View style={prefix ? [ui.inputFrame, frameStyle, error && ui.inputError] : undefined}>
        {prefix ? (
          typeof prefix === 'string' ? (
            <Text variant="title" accessible={false} style={ui.inputPrefix}>
              {prefix}
            </Text>
          ) : (
            <View accessible={false}>{prefix}</View>
          )
        ) : null}
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? props.accessibilityHint ?? help}
          allowFontScaling
          maxFontSizeMultiplier={0}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            ui.input,
            prefix ? ui.prefixedInput : null,
            { fontFamily: ready ? theme.typography.fonts.regular : theme.typography.family },
            error ? ui.inputError : null,
            style,
          ]}
        />
      </View>
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

export function Card({
  style,
  onPress,
  variant = 'standard',
  ...props
}: ViewProps & {
  onPress?: () => void;
  variant?: 'standard' | 'highlighted' | 'interactive';
}) {
  const cardStyle = [
    ui.card,
    (onPress || variant === 'interactive') && ui.interactiveCard,
    variant === 'highlighted' && ui.highlightedCard,
    style,
  ];
  if (onPress)
    return (
      <PulsePressable {...props} accessibilityRole="button" onPress={onPress} style={cardStyle} />
    );
  return <View {...props} style={cardStyle} />;
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
      haptic
      accessibilityRole="radio"
      accessibilityLabel={[label, detail].filter(Boolean).join(', ')}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
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

export function ScreenHeader({
  title,
  onBack,
  compact = false,
}: {
  title: string;
  onBack: () => void;
  compact?: boolean;
}) {
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
      <Text accessibilityRole="header" variant={compact ? 'subtitle' : 'display'} style={ui.flex}>
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
  icon?: IconName;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'error' | 'warning' | 'progress';
}) {
  const color = tone === 'neutral' ? theme.colors.textMuted : theme.colors[tone];
  const statusIcon = icon ?? (tone === 'success' ? 'check' : tone === 'error' ? 'close' : 'clock');
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        ui.badge,
        {
          backgroundColor:
            tone === 'neutral'
              ? theme.colors.warm
              : tone === 'accent'
                ? theme.colors.accentLight
                : tone === 'success' ||
                    tone === 'error' ||
                    tone === 'warning' ||
                    tone === 'progress'
                  ? theme.colors[`${tone}Light`]
                  : theme.colors.primaryLight,
        },
      ]}
    >
      <Icon name={statusIcon} color={color} />
      <Text variant="label" compact style={{ color, flexShrink: 1 }}>
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

export function IconChip({ icon }: { icon: IconName }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={ui.iconChip}
    >
      <Icon name={icon} />
    </View>
  );
}

export function Section({
  title,
  icon,
  children,
}: PropsWithChildren<{ title: string; icon?: IconName }>) {
  return (
    <View style={ui.section}>
      <View style={ui.header}>
        {icon ? <IconChip icon={icon} /> : null}
        <Text variant="subtitle" accessibilityRole="header" style={ui.flex}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function BrandHeader({ accountAction }: { accountAction?: ReactNode }) {
  return (
    <View style={ui.brandHeader}>
      <GaswayLogo />
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
    borderRadius: theme.radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { ...theme.elevation.low, backgroundColor: theme.colors.primary },
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
  inputFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.inputHeight,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  inputPrefix: { paddingLeft: theme.spacing.md, color: theme.colors.textMuted },
  prefixedInput: { flex: 1, minWidth: theme.spacing.none, borderWidth: theme.spacing.none },
  card: {
    ...theme.elevation.low,
    padding: theme.spacing.lg,
    gap: theme.spacing.compact,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
  },
  highlightedCard: {
    ...theme.elevation.medium,
    backgroundColor: theme.colors.surfaceHighlighted,
    borderColor: theme.colors.primary,
  },
  interactiveCard: {
    ...theme.elevation.medium,
    minHeight: theme.layout.touchTarget,
  },
  iconChip: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surfaceHighlighted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    ...theme.elevation.low,
    flexGrow: 1,
    minHeight: theme.layout.inputHeight,
    padding: theme.spacing.compact,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
  },
  selected: {
    backgroundColor: theme.colors.surfaceHighlighted,
    borderColor: theme.colors.primary,
  },
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
