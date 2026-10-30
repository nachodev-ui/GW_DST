import { View } from 'react-native';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { flowStyles as s } from './flow-styles';
const palette = theme.documentation.colors;
export function DocumentStatus({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  icon?: IconName;
}) {
  const color = tone === 'error' ? theme.colors.error : palette.ink;
  const symbol =
    icon ??
    (tone === 'success'
      ? 'check'
      : tone === 'warning'
        ? 'clock'
        : tone === 'error'
          ? 'info'
          : 'orders');
  return (
    <View style={s.status} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <Icon name={symbol} color={color} size={theme.layout.tagRemove} />
      <Text variant="label" style={[s.statusText, tone === 'error' && s.statusError]}>
        {label}
      </Text>
    </View>
  );
}

export function DocumentMessage({
  title,
  detail,
  error = false,
}: {
  title: string;
  detail?: string | undefined;
  error?: boolean;
}) {
  return (
    <View
      style={[s.feedback, error && s.feedbackError]}
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
    >
      <Text
        variant="label"
        accessibilityRole={error ? 'alert' : 'text'}
        style={error ? s.statusError : s.statusText}
      >
        {title}
      </Text>
      {detail ? (
        <Text variant="note" style={s.muted}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function DocumentAction({
  label,
  onPress,
  disabled = false,
  icon = 'arrowRight',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  return (
    <PulsePressable
      style={s.action}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text variant="label" style={s.actionText}>
        {label}
      </Text>
      <Icon name={icon} size={theme.layout.tagRemove} />
    </PulsePressable>
  );
}
