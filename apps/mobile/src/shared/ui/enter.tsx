import type { PropsWithChildren } from 'react';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { theme } from '@/theme';

export function Enter({ children, index = 0 }: PropsWithChildren<{ index?: number }>) {
  const reduced = useReducedMotion();
  const entrance = reduced
    ? {}
    : { entering: FadeInDown.duration(theme.motion.entrance).delay(index * theme.motion.stagger) };
  return <Animated.View {...entrance}>{children}</Animated.View>;
}
