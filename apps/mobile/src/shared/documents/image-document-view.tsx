import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Button } from '@/shared/ui/components';
import { theme } from '@/theme';

export function ImageDocumentView({
  uri,
  label,
  onError,
}: {
  uri: string;
  label: string;
  onError: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const fit = Math.min(size.width / imageSize.width, size.height / imageSize.height);
  const fittedWidth = imageSize.width * fit;
  const fittedHeight = imageSize.height * fit;
  const scale = useSharedValue(1);
  const start = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set(scale.get());
    })
    .onUpdate((event) => {
      scale.set(Math.max(1, Math.min(5, start.get() * event.scale)));
    })
    .onEnd(() => {
      const limitX = Math.max(0, (fittedWidth * scale.get() - size.width) / 2);
      const limitY = Math.max(0, (fittedHeight * scale.get() - size.height) / 2);
      x.set(Math.max(-limitX, Math.min(limitX, x.get())));
      y.set(Math.max(-limitY, Math.min(limitY, y.get())));
    });
  const pan = Gesture.Pan()
    .onStart(() => {
      sx.set(x.get());
      sy.set(y.get());
    })
    .onUpdate((event) => {
      const limitX = Math.max(0, (fittedWidth * scale.get() - size.width) / 2);
      const limitY = Math.max(0, (fittedHeight * scale.get() - size.height) / 2);
      x.set(Math.max(-limitX, Math.min(limitX, sx.get() + event.translationX)));
      y.set(Math.max(-limitY, Math.min(limitY, sy.get() + event.translationY)));
    });
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));
  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.stage} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
          <Animated.Image
            source={{ uri }}
            accessibilityLabel={label}
            resizeMode="contain"
            onError={onError}
            onLoad={(event) => setImageSize(event.nativeEvent.source)}
            style={[{ width: size.width, height: size.height }, animated]}
          />
        </GestureDetector>
      </View>
      <View style={styles.controls}>
        <Button
          label="Alejar"
          variant="link"
          onPress={() => {
            scale.set(Math.max(1, scale.get() - 0.5));
            x.set(0);
            y.set(0);
          }}
        />
        <Button
          label="Restablecer"
          variant="link"
          onPress={() => {
            scale.set(1);
            x.set(0);
            y.set(0);
          }}
        />
        <Button
          label="Acercar"
          variant="link"
          onPress={() => scale.set(Math.min(5, scale.get() + 0.5))}
        />
      </View>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, overflow: 'hidden' },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
});
