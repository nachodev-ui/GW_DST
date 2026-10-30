import { useLayoutEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Button } from './components';
import { BottomSheetMotion } from './bottom-sheet-motion';
import { Icon } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';
import { useReducedMotion } from 'react-native-reanimated';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  dismissible = true,
  onSave,
  saving = false,
  header,
  saveDisabled = false,
  saveLabel = 'Guardar cambios',
  compactFooter = false,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  dismissible?: boolean;
  onSave?: () => void;
  saving?: boolean;
  header?: ReactNode;
  saveDisabled?: boolean;
  saveLabel?: string;
  compactFooter?: boolean;
}>) {
  const reducedMotion = useReducedMotion();
  const [motion] = useState(() => new BottomSheetMotion());
  useLayoutEffect(() => {
    motion.update({ visible, dismissible, saving, reducedMotion, onClose });
  }, [motion, visible, dismissible, saving, reducedMotion, onClose]);
  useLayoutEffect(() => () => motion.dispose(), [motion]);
  const dismiss = motion.dismiss;
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar ventana"
          disabled={!dismissible || saving}
          onPress={dismiss}
          style={StyleSheet.absoluteFill}
        />
        <AnimatedSafeAreaView
          edges={['bottom']}
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          onLayout={(event) => {
            motion.measure(event.nativeEvent.layout.height);
          }}
          style={[styles.sheet, { transform: [{ translateY: motion.translateY }] }]}
        >
          <View collapsable={false} {...motion.panHandlers} style={styles.dragArea}>
            <View accessible={false} style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.title}>
                {header ?? (
                  <Text variant="title" accessibilityRole="header">
                    {title}
                  </Text>
                )}
              </View>
              <PulsePressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar ventana"
                accessibilityState={{ disabled: !dismissible || saving }}
                disabled={!dismissible || saving}
                onPress={dismiss}
                style={styles.close}
              >
                <Icon name="close" color={theme.colors.primary} />
              </PulsePressable>
            </View>
          </View>
          {children}
          {onSave ? (
            <View style={[styles.actions, compactFooter && styles.compactActions]}>
              <Button
                label={saving ? 'Guardando…' : saveLabel}
                onPress={onSave}
                disabled={saving || saveDisabled}
                style={compactFooter && styles.compactButton}
              />
              {!compactFooter ? (
                <Button
                  label="Cancelar"
                  variant="link"
                  onPress={dismiss}
                  disabled={!dismissible || saving}
                />
              ) : null}
            </View>
          ) : null}
        </AnimatedSafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim },
  sheet: {
    ...theme.elevation.high,
    maxHeight: theme.layout.sheetMaxHeight,
    width: '100%' as const,
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderTopLeftRadius: theme.radii.sheet,
    borderTopRightRadius: theme.radii.sheet,
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
    flexShrink: 1,
  },
  handle: {
    width: theme.layout.sheetHandleWidth,
    height: theme.layout.sheetHandleHeight,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    alignSelf: 'center',
  },
  dragArea: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { flex: 1, minWidth: theme.spacing.none },
  close: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
  },
  actions: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.surfaceBorder,
    flexShrink: 0,
  },
  compactActions: {
    paddingTop: theme.spacing.xs,
    borderTopWidth: theme.spacing.none,
  },
  compactButton: {
    minHeight: theme.layout.touchTarget,
    paddingVertical: theme.spacing.sm,
  },
});
