import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { theme } from '@/theme';

export const brandLogoKeys = {
  Lipigas: 'lipigas',
  Gasco: 'gasco',
  Abastible: 'abastible',
} as const;

type Brand = (typeof brandLogoKeys)[keyof typeof brandLogoKeys];
type Variant = 'mark' | 'horizontal' | 'stacked';

const assets: Record<Brand, Record<Variant, { source: ImageSourcePropType; ratio: number }>> = {
  lipigas: {
    mark: { source: require('../../../assets/brands/lipigas/mark.png'), ratio: 1 },
    horizontal: {
      source: require('../../../assets/brands/lipigas/logo-horizontal.png'),
      ratio: 800 / 210,
    },
    stacked: {
      source: require('../../../assets/brands/lipigas/logo-stacked.png'),
      ratio: 303 / 216,
    },
  },
  gasco: {
    mark: { source: require('../../../assets/brands/gasco/mark.png'), ratio: 1 },
    horizontal: {
      source: require('../../../assets/brands/gasco/logo-horizontal.png'),
      ratio: 800 / 226,
    },
    stacked: { source: require('../../../assets/brands/gasco/logo-stacked.png'), ratio: 326 / 392 },
  },
  abastible: {
    mark: { source: require('../../../assets/brands/abastible/mark.png'), ratio: 1 },
    horizontal: {
      source: require('../../../assets/brands/abastible/logo-horizontal.png'),
      ratio: 298 / 76,
    },
    stacked: {
      source: require('../../../assets/brands/abastible/logo-stacked.png'),
      ratio: 381 / 252,
    },
  },
};

const names: Record<Brand, string> = { lipigas: 'Lipigas', gasco: 'Gasco', abastible: 'Abastible' };

/** size is the image height; the white surface reserves a quarter-height on every side. */
export function BrandLogo({
  brand,
  variant,
  size,
}: {
  brand: Brand;
  variant: Variant;
  size: number;
}) {
  const asset = assets[brand][variant];
  return (
    <View style={[styles.surface, { padding: size / 4 }]}>
      <Image
        source={asset.source}
        resizeMode="contain"
        accessibilityLabel={names[brand]}
        accessible
        style={{ height: size, width: size * asset.ratio }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill, flexShrink: 0 },
});
