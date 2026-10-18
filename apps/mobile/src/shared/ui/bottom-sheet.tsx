import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Button } from './components';
import { Text } from './text';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar lista"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={['bottom']}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={styles.sheet}
        >
          <View accessible={false} style={styles.handle} />
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <View>
              <Button label="Cerrar" variant="secondary" onPress={onClose} />
            </View>
          </View>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim },
  sheet: {
    maxHeight: theme.layout.sheetMaxHeight,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
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
});
