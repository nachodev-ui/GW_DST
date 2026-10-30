import { Image, type ImageSourcePropType } from 'react-native';
import type { Product } from '@/shared/orders/contracts';
import { theme } from '@/theme';

type ProductIdentity = Pick<Product, 'brand' | 'weight_kg' | 'variant'>;
const productPhotos = {
  Abastible: {
    5: require('../../../assets/products/abastible-5kg.png'),
    11: require('../../../assets/products/abastible-11kg.png'),
    15: require('../../../assets/products/abastible-15kg.png'),
    45: require('../../../assets/products/abastible-45kg.png'),
  },
  Gasco: {
    5: require('../../../assets/products/gasco-5kg.png'),
    11: require('../../../assets/products/gasco-11kg.png'),
    15: require('../../../assets/products/gasco-15kg.png'),
    45: require('../../../assets/products/gasco-45kg.png'),
  },
  Lipigas: {
    5: require('../../../assets/products/lipigas-5kg.png'),
    11: require('../../../assets/products/lipigas-11kg.png'),
    15: require('../../../assets/products/lipigas-15kg.png'),
    45: require('../../../assets/products/lipigas-45kg.png'),
  },
} satisfies Record<Product['brand'], Record<Product['weight_kg'], ImageSourcePropType>>;
const abastibleVariants = {
  vm: require('../../../assets/products/abastible-vm-15kg.png'),
  vma: require('../../../assets/products/abastible-vma-15kg.png'),
} satisfies Record<'vm' | 'vma', ImageSourcePropType>;

export function ProductImage({
  product,
  size = 'small',
}: {
  product: ProductIdentity;
  size?: 'compact' | 'small' | 'selector' | 'medium' | 'large';
}) {
  const width = {
    compact: theme.layout.brandStacked,
    small: theme.layout.illustrationSmall,
    selector: theme.layout.illustrationSelector,
    medium: theme.layout.illustration,
    large: theme.layout.illustrationLarge,
  }[size];
  const source =
    product.brand === 'Abastible' && product.variant !== 'standard'
      ? abastibleVariants[product.variant]
      : productPhotos[product.brand][product.weight_kg];
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{
        width,
        height:
          size === 'selector'
            ? theme.layout.selectionArtHeight
            : width * theme.layout.cylinderAspectRatio,
      }}
      accessible={false}
      aria-hidden
    />
  );
}
