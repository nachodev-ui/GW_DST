import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PulsePressable({
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[style, animatedStyle, disabled && { opacity: theme.opacity.disabled }]}
      onPressIn={(event) => {
        opacity.set(theme.opacity.pressed);
        if (!reduceMotion)
          scale.set(
            withTiming(theme.motion.pressScale, {
              duration: theme.motion.pressDuration,
            }),
          );
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        opacity.set(1);
        scale.set(withTiming(1, { duration: theme.motion.pressDuration }));
        onPressOut?.(event);
      }}
    />
  );
}
