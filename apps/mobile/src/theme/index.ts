import { Platform } from 'react-native';

export const theme = {
  colors: {
    primary: '#125C4C',
    onPrimary: '#FFFFFF',
    accent: '#F5B942',
    background: '#F7F9F8',
    surface: '#FFFFFF',
    text: '#142923',
    textMuted: '#53675F',
    border: '#CEDBD5',
    error: '#B42318',
    success: '#167044',
  },
  typography: {
    family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
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
