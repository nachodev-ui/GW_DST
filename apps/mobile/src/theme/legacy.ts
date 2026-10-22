// Compatibility layout for older screens; colors follow the current palette.
import { theme as currentTheme } from './index';

export const theme = {
  colors: currentTheme.colors,
  typography: {
    family: currentTheme.typography.family,
    sizes: { caption: 12, body: 16, subtitle: 20, title: 28 },
    weights: { regular: '400', medium: '500', bold: '700' },
    lineHeights: { body: 24, title: 36 },
  },
  spacing: { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radii: { sm: 4, md: 8, lg: 16, pill: 999 },
  borders: { thin: 1, accent: 4 },
  layout: { touchTarget: 52, formWidth: 520 },
  opacity: { disabled: 0.6 },
} as const;
