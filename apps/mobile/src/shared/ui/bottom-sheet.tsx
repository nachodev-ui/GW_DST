import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Button } from './components';
import { Text } from './text';
import { useReducedMotion } from 'react-native-reanimated';

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
}>) {
  const reducedMotion = useReducedMotion();
  const dismiss = () => {
    if (dismissible && !saving) onClose();
  };
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
        <SafeAreaView
          edges={['bottom']}
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          style={styles.sheet}
        >
          <View accessible={false} style={styles.handle} />
          <View style={styles.header}>
            {header ?? (
              <Text variant="title" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            )}
            {!onSave ? (
              <View>
                <Button
                  label="Cerrar"
                  variant="secondary"
                  onPress={dismiss}
                  disabled={!dismissible || saving}
                />
              </View>
            ) : null}
          </View>
          {children}
          {onSave ? (
            <View style={styles.actions}>
              <Button
                label={saving ? 'Guardando…' : saveLabel}
                onPress={onSave}
                disabled={saving || saveDisabled}
              />
              <Button
                label="Cancelar"
                variant="link"
                onPress={dismiss}
                disabled={!dismissible || saving}
              />
            </View>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim },
  sheet: {
    ...theme.elevation.high,
    maxHeight: theme.layout.sheetMaxHeight,
    width: '100%',
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
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  title: { flex: 1 },
  actions: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.surfaceBorder,
    flexShrink: 0,
  },
});
