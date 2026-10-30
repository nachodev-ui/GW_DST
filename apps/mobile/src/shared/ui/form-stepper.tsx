import { Fragment, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type FormStep = { label: string; icon: IconName };

export function FormStepper({ steps, current }: { steps: readonly FormStep[]; current: number }) {
  return (
    <View
      style={s.stack}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={steps[current]?.label}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
    >
      <View style={s.rail}>
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            {index > 0 ? <StepConnector complete={index <= current} /> : null}
            <View style={[s.circle, index < current && s.done, index === current && s.current]}>
              <Icon
                name={index < current ? 'check' : step.icon}
                color={
                  index < current
                    ? theme.colors.background
                    : index === current
                      ? theme.colors.primary
                      : theme.colors.textMuted
                }
              />
            </View>
          </Fragment>
        ))}
      </View>
      <View style={s.caption}>
        <Text variant="label" style={s.label}>
          {steps[current]?.label}
        </Text>
        <Text variant="note" style={s.muted}>
          Paso {current + 1} de {steps.length}
        </Text>
      </View>
    </View>
  );
}

function StepConnector({ complete }: { complete: boolean }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(complete ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(complete ? 1 : 0, { duration: reduced ? 0 : theme.motion.transition }));
  }, [complete, progress, reduced]);
  const motion = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <View style={s.connector}>
      <Animated.View style={[s.fill, motion]} />
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  rail: { flexDirection: 'row', alignItems: 'center' },
  circle: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radii.pill,
    borderWidth: theme.borders.focus,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  current: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    ...theme.elevation.low,
  },
  connector: { flex: 1, height: theme.borders.focus, backgroundColor: theme.colors.divider },
  fill: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.primary },
  caption: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  label: { flexGrow: 1, flexShrink: 1 },
  muted: { color: theme.colors.textMuted },
});
