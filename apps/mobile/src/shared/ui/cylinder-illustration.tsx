import { Platform } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { theme } from '@/theme';

const silhouettes = {
  5: { x: 30, y: 70, width: 80, height: 91, radius: 29 },
  11: { x: 23, y: 51, width: 94, height: 110, radius: 33 },
  15: { x: 19, y: 43, width: 102, height: 118, radius: 35 },
  45: { x: 34, y: 25, width: 72, height: 136, radius: 26 },
} as const;

export function CylinderIllustration({
  weight = 15,
  size = 'medium',
}: {
  weight?: 5 | 11 | 15 | 45;
  size?: 'small' | 'medium' | 'hero' | 'large';
}) {
  const width = {
    small: theme.layout.illustrationSmall,
    medium: theme.layout.illustration,
    hero: theme.layout.illustrationHero,
    large: theme.layout.illustrationLarge,
  }[size];
  const body = silhouettes[weight];
  return (
    <Svg
      width={width}
      height={(width * 180) / 140}
      viewBox="0 0 140 180"
      {...(Platform.OS === 'web' ? {} : { accessible: false })}
      aria-hidden
    >
      <Ellipse cx="70" cy="168" rx="47" ry="6" fill={theme.colors.cylinderDark} opacity="0.12" />
      <Rect
        x="48"
        y={body.y - 20}
        width="44"
        height="29"
        rx="10"
        fill={theme.colors.cylinderDark}
      />
      <Rect x="56" y={body.y - 14} width="28" height="12" rx="4" fill={theme.colors.primaryLight} />
      <Rect x="65" y={body.y - 10} width="10" height="16" rx="3" fill={theme.colors.accent} />
      <Rect
        x={body.x}
        y={body.y}
        width={body.width}
        height={body.height}
        rx={body.radius}
        fill={theme.colors.primary}
      />
      <Path
        d={`M${body.x + 13} ${body.y + 30}v${body.height - 56}`}
        stroke={theme.colors.primaryLight}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.4"
      />
      <Rect
        x={body.x + 8}
        y="151"
        width={body.width - 16}
        height="12"
        rx="4"
        fill={theme.colors.cylinderDark}
      />
      <Ellipse
        cx="74"
        cy={body.y + body.height * 0.57}
        rx="19"
        ry="22"
        fill={theme.colors.primaryLight}
      />
      <Path
        d={`M74 ${body.y + body.height * 0.57 - 15}c4 10 12 12 10 21-2 10-18 10-20 0-1-5 3-9 5-12 0 5 2 6 3 6 3-4 4-9 2-15Z`}
        fill={theme.colors.accent}
      />
    </Svg>
  );
}
