import { createContext, useContext } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { theme } from '@/theme';

export const FontReadyContext = createContext(false);
type Variant = keyof typeof theme.typography.sizes;
const weights = {
  display: 'bold',
  title: 'bold',
  subtitle: 'semibold',
  body: 'regular',
  label: 'semibold',
  note: 'regular',
} as const;

export function Text({
  variant = 'body',
  compact = false,
  style,
  ...props
}: TextProps & { variant?: Variant; compact?: boolean }) {
  const ready = useContext(FontReadyContext);
  const size = theme.typography.sizes[variant];
  const weight = weights[variant];
  return (
    <NativeText
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={compact ? theme.typography.compactScale : 0}
      style={[
        {
          color: theme.colors.text,
          fontSize: size,
          lineHeight: size * 1.4,
          fontFamily: ready ? theme.typography.fonts[weight] : theme.typography.family,
          fontWeight: ready
            ? 'normal'
            : weight === 'bold'
              ? '700'
              : weight === 'semibold'
                ? '600'
                : '400',
        },
        style,
      ]}
    />
  );
}
