import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { CylinderIllustration } from './cylinder-illustration';
import { ProductImage } from './product-image';
import type { Product } from '@/shared/orders/contracts';
import { Icon } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

type Weight = 5 | 11 | 15 | 45;
export function CylinderSelector({
  value,
  onChange,
  disabled = false,
  brand,
  availableWeights,
}: {
  value?: Weight | undefined;
  onChange: (weight: Weight) => void;
  disabled?: boolean;
  brand?: Product['brand'] | undefined;
  availableWeights?: readonly Weight[];
}) {
  return (
    <View>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Tamaño del cilindro"
      >
        {([5, 11, 15, 45] as const).map((weight) => (
          <Size
            key={weight}
            weight={weight}
            selected={value === weight}
            onPress={() => onChange(weight)}
            disabled={
              disabled || (availableWeights !== undefined && !availableWeights.includes(weight))
            }
            brand={brand}
          />
        ))}
      </View>
    </View>
  );
}
function Size({
  weight,
  selected,
  onPress,
  disabled,
  brand,
}: {
  weight: Weight;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
  brand?: Product['brand'] | undefined;
}) {
  const lift = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    lift.set(
      withTiming(selected && !reduced ? -theme.spacing.xs : 0, {
        duration: theme.motion.transition,
      }),
    );
  }, [selected, reduced, lift]);
  const art = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }] }));
  return (
    <PulsePressable
      haptic
      accessibilityRole="radio"
      accessibilityLabel={`${brand ? `${brand}, ` : ''}${weight} kilos`}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      onPress={onPress}
      disabled={disabled}
      style={[styles.size, selected && styles.selected]}
    >
      <View style={styles.check}>
        {selected ? <Icon name="check" size={theme.spacing.md} /> : null}
      </View>
      <Animated.View style={[styles.art, art]}>
        {brand ? (
          <ProductImage
            product={{ brand, weight_kg: weight, variant: 'standard' }}
            size="selector"
          />
        ) : (
          <CylinderIllustration weight={weight} size="selector" />
        )}
      </Animated.View>
      <Text variant="label" style={selected ? styles.active : undefined}>
        {weight} kg
      </Text>
    </PulsePressable>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  size: {
    flex: 1,
    minWidth: theme.layout.touchTarget,
    padding: theme.spacing.xs,
    paddingBottom: theme.spacing.compact,
    alignItems: 'center',
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.focus,
    borderColor: theme.colors.surfaceBorder,
  },
  selected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  check: { position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs },
  art: {
    width: '100%',
    height: theme.layout.selectionArtHeight,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  reference: { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  active: { color: theme.colors.primary },
});
