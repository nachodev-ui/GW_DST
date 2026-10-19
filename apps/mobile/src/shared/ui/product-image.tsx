import { Image, StyleSheet } from 'react-native';
import type { Product } from '@/shared/orders/contracts';
import { CylinderIllustration } from '@/shared/ui/cylinder-illustration';
import { theme } from '@/theme';

const abastibleImages = {
  5: require('../../../assets/products/abastible-5kg.png'),
  11: require('../../../assets/products/abastible-11kg.png'),
  15: require('../../../assets/products/abastible-15kg.png'),
  45: require('../../../assets/products/abastible-45kg.png'),
  vma: require('../../../assets/products/abastible-vma-15kg.png'),
  vm: require('../../../assets/products/abastible-vm-15kg.png'),
} as const;

export function ProductImage({ product }: { product: Product }) {
  if (product.brand !== 'Abastible')
    return <CylinderIllustration weight={product.weight_kg} size="small" />;
  return (
    <Image
      source={abastibleImages[product.variant === 'standard' ? product.weight_kg : product.variant]}
      style={styles.image}
      resizeMode="contain"
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: theme.layout.illustrationSmall,
    height: (theme.layout.illustrationSmall * 180) / 140,
  },
});
