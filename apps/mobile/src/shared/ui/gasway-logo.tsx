import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { gaswayGeometry as geometry } from '@/shared/branding/gasway-geometry';
import { theme } from '@/theme';

type Appearance = 'light' | 'dark' | 'black' | 'white' | 'lime' | 'cream';
type Variant = 'wordmark' | 'monogram';

const palette = theme.brand.colors;
const treatments = {
  light: { ink: palette.green, dot: palette.olive },
  dark: { ink: palette.cream, dot: palette.lime },
  black: { ink: palette.black, dot: palette.black },
  white: { ink: palette.white, dot: palette.white },
  lime: { ink: palette.lime, dot: palette.lime },
  cream: { ink: palette.cream, dot: palette.cream },
} as const;
const monogramGlyphs = [['g', 0, 0]] as const;

/** Shared outlined artwork; never substitute live type or independently size the dot. */
export function GaswayLogo({
  variant = 'wordmark',
  appearance = 'light',
}: {
  variant?: Variant;
  appearance?: Appearance;
}) {
  const box = geometry[variant];
  const width =
    variant === 'wordmark' ? theme.brand.logo.wordmarkWidth : theme.brand.logo.monogramWidth;
  const padding = geometry.dot.radius;
  const canvasWidth = box.width + padding * 2;
  const canvasHeight = box.height + padding * 2;
  const height = (width * canvasHeight) / canvasWidth;
  const colors = treatments[appearance];
  const letters = variant === 'wordmark' ? geometry.placements : monogramGlyphs;
  const center = variant === 'wordmark' ? geometry.dot.wordmarkCenter : geometry.dot.monogramCenter;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Gasway"
      style={[styles.container, { width, height }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${-padding} ${-padding} ${canvasWidth} ${canvasHeight}`}
        accessible={false}
        aria-hidden
      >
        {letters.map(([letter, x, y], index) => (
          <G key={`${letter}-${index}`} transform={`translate(${x} ${y})`}>
            <Path d={geometry.glyphs[letter]} fill={colors.ink} fillRule="evenodd" />
          </G>
        ))}
        <Circle cx={center[0]} cy={center[1]} r={geometry.dot.radius} fill={colors.dot} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flexShrink: 0 } });
