import { Image, View, type ImageSourcePropType } from 'react-native';
import type { Product } from '@/shared/orders/contracts';
import { theme } from '@/theme';
import { CylinderSizeIllustration } from './cylinder-size-illustration';

const abastibleImages = {
  5: require('../../../assets/products/abastible-5kg.png'),
  11: require('../../../assets/products/abastible-11kg.png'),
  15: require('../../../assets/products/abastible-15kg.png'),
  45: require('../../../assets/products/abastible-45kg.png'),
  vma: require('../../../assets/products/abastible-vma-15kg.png'),
  vm: require('../../../assets/products/abastible-vm-15kg.png'),
} satisfies Record<Product['weight_kg'] | 'vma' | 'vm', ImageSourcePropType>;

const brandReferences = {
  Gasco: require('../../../assets/products/gasco-reference.png'),
  Lipigas: require('../../../assets/products/lipigas-reference.png'),
} satisfies Record<'Gasco' | 'Lipigas', ImageSourcePropType>;

type Size = 'small' | 'selector' | 'medium' | 'hero' | 'large';

export function CylinderIllustration({
  weight = 15,
  size = 'medium',
  brand,
  variant = 'standard',
}: {
  weight?: Product['weight_kg'] | undefined;
  size?: Size;
  brand?: Product['brand'] | undefined;
  variant?: Product['variant'];
}) {
  const width = {
    small: theme.layout.illustrationSmall,
    selector: theme.layout.illustrationSelector,
    medium: theme.layout.illustration,
    hero: theme.layout.illustrationHero,
    large: theme.layout.illustrationLarge,
  }[size];
  const frameHeight = width * theme.layout.cylinderAspectRatio;
  if (!brand) {
    return (
      <CylinderSizeIllustration
        weight={weight}
        width={width}
        height={size === 'selector' ? theme.layout.selectionArtHeight : frameHeight}
      />
    );
  }
  const source =
    brand !== 'Abastible'
      ? brandReferences[brand]
      : abastibleImages[variant === 'standard' ? weight : variant];

  return (
    <View style={{ width, height: frameHeight, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Image
        source={source}
        style={{ width, height: frameHeight }}
        resizeMode="contain"
        accessible={false}
        aria-hidden
      />
    </View>
  );
}

export function CylinderBrandComposition() {
  return (
    <Image
      source={require('../../../assets/products/cylinder-brands-hero.png')}
      style={{
        width: theme.layout.heroArtWidth,
        height: theme.layout.heroArtWidth,
        maxWidth: '100%',
      }}
      resizeMode="contain"
      accessible={false}
      aria-hidden
    />
  );
}
