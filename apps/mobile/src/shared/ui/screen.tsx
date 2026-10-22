import { type PropsWithChildren, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { ScreenHeader } from './components';

export function Screen({
  title,
  onBack,
  children,
  footer,
  tabbed = false,
  list,
  compactHeader = false,
}: PropsWithChildren<{
  title: string;
  onBack: () => void;
  footer?: ReactNode;
  tabbed?: boolean;
  list?: ReactNode;
  compactHeader?: boolean;
}>) {
  return (
    <SafeAreaView
      edges={tabbed ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={screenStyles.safe}
    >
      <KeyboardAvoidingView
        style={screenStyles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={screenStyles.header}>
          <ScreenHeader title={title} onBack={onBack} compact={compactHeader} />
        </View>
        {list ?? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={screenStyles.content}
          >
            {children}
          </ScrollView>
        )}
        {footer ? <View style={screenStyles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.compact,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
  },
});
