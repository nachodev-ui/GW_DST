import { Image, View, type ImageSourcePropType } from 'react-native';
import type { Product } from '@/shared/orders/contracts';
import { theme } from '@/theme';

const cylinderImages = {
  perla: {
    5: require('../../../assets/products/neutral/cilindro-5kg-perla.png'),
    11: require('../../../assets/products/neutral/cilindro-11kg-perla.png'),
    15: require('../../../assets/products/neutral/cilindro-15kg-perla.png'),
    45: require('../../../assets/products/neutral/cilindro-45kg-perla.png'),
  },
  pizarra: {
    5: require('../../../assets/products/neutral/cilindro-5kg-pizarra.png'),
    11: require('../../../assets/products/neutral/cilindro-11kg-pizarra.png'),
    15: require('../../../assets/products/neutral/cilindro-15kg-pizarra.png'),
    45: require('../../../assets/products/neutral/cilindro-45kg-pizarra.png'),
  },
} satisfies Record<'perla' | 'pizarra', Record<Product['weight_kg'], ImageSourcePropType>>;

// Independently framed size choices, not manufacturer dimensions or physical scale.
export function CylinderSizeIllustration({
  weight,
  finish = 'pizarra',
  width = theme.layout.illustrationSelector,
  height = theme.layout.selectionArtHeight,
}: {
  weight: Product['weight_kg'];
  finish?: keyof typeof cylinderImages;
  width?: number;
  height?: number;
}) {
  const art = theme.layout.cylinderSizeArt[weight];
  const scale = Math.min(
    width / theme.layout.illustrationSelector,
    height / theme.layout.selectionArtHeight,
  );

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Image
        source={cylinderImages[finish][weight]}
        style={{ width: art.width * scale, height: art.height * scale }}
        resizeMode="contain"
        accessible={false}
        aria-hidden
      />
    </View>
  );
}
