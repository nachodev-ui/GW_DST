import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useForegroundScreen } from '@/shared/lifecycle/use-foreground-screen';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { driverProgressError } from './offer-contracts';
import type { DeliveryProgressFeedback } from './use-delivery-progress';

function actionCopy(feedback: DeliveryProgressFeedback) {
  const failed = feedback.state === 'error';
  return {
    title: failed
      ? 'Cambio sin confirmar'
      : feedback.target === 'delivered'
        ? 'Entrega completada'
        : 'Entrega iniciada',
    detail:
      feedback.state === 'error'
        ? driverProgressError(feedback.error)
        : feedback.target === 'delivered'
          ? ''
          : 'Ya estás en camino.',
  };
}

// Keep announcements tied to the action, independently of where its result is displayed.
export function useDeliveryActionAnnouncement(feedback: DeliveryProgressFeedback | null) {
  const foreground = useForegroundScreen();
  const announced = useRef<string | null>(null);
  const copy = feedback ? actionCopy(feedback) : null;
  const announcement = copy ? [copy.title, copy.detail].filter(Boolean).join('. ') : '';
  const eventKey = feedback && feedback.state !== 'pending' ? feedback.key : null;
  const failed = feedback?.state === 'error';
  useEffect(() => {
    if (!eventKey || announced.current === eventKey) return;
    announced.current = eventKey;
    if (!foreground) return;
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(
        failed ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(announcement);
  }, [eventKey, foreground, failed, announcement]);
}

export function DeliveryActionNotice({
  feedback,
  onDismiss,
}: {
  feedback: DeliveryProgressFeedback;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const failed = feedback.state === 'error';
  const { title, detail } = actionCopy(feedback);
  const announcement = [title, detail].filter(Boolean).join('. ');
  if (feedback.state === 'pending') return null;
  const color = failed ? theme.colors.error : theme.colors.text;
  return (
    <Animated.View
      {...(reducedMotion ? {} : { entering: FadeIn.duration(theme.motion.transition) })}
      style={[styles.notice, failed ? styles.errorNotice : styles.confirmedNotice]}
    >
      <View
        accessible
        accessibilityRole={failed ? 'alert' : 'text'}
        accessibilityLiveRegion={failed ? 'assertive' : 'polite'}
        accessibilityLabel={announcement}
        style={styles.message}
      >
        <View style={[styles.symbol, failed ? { borderColor: color } : styles.confirmedSymbol]}>
          <Icon name={failed ? 'close' : 'check'} color={failed ? color : theme.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text
            variant={!failed && feedback.target === 'delivered' ? 'subtitle' : 'label'}
            style={{ color }}
          >
            {title}
          </Text>
          {detail ? (
            <Text variant="note" style={{ color: failed ? color : theme.colors.primary }}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      {!failed && feedback.target === 'on_the_way' ? (
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar confirmación de inicio"
          onPress={onDismiss}
          style={styles.dismiss}
        >
          <Icon name="close" color={color} size={theme.spacing.screen} />
        </PulsePressable>
      ) : null}
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.compact,
    borderRadius: theme.radii.control,
    gap: theme.spacing.xs,
  },
  confirmedNotice: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
  },
  errorNotice: { backgroundColor: theme.colors.errorLight },
  message: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
  symbol: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.focus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedSymbol: {
    borderWidth: theme.spacing.none,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.lime,
  },
  copy: { flex: 1, minWidth: theme.spacing.none },
  dismiss: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
