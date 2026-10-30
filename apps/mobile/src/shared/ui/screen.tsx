import { type PropsWithChildren, type ReactNode, type Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { StatusBar } from 'expo-status-bar';
import { ScreenHeader } from './components';
import { useManualRefresh } from './use-manual-refresh';

export function Screen({
  title,
  onBack,
  children,
  footer,
  tabbed = false,
  list,
  compactHeader = false,
  headerAccessory,
  contentKey,
  scrollRef,
  onRefresh,
}: PropsWithChildren<{
  title: string;
  onBack: () => void;
  footer?: ReactNode;
  tabbed?: boolean;
  list?: ReactNode;
  compactHeader?: boolean;
  headerAccessory?: ReactNode;
  contentKey?: string | number;
  scrollRef?: Ref<ScrollViewInstance>;
  onRefresh?: () => Promise<unknown>;
}>) {
  const { refreshing, refresh } = useManualRefresh(onRefresh);
  return (
    <SafeAreaView
      edges={tabbed ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={screenStyles.safe}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={screenStyles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={screenStyles.header}>
          <ScreenHeader title={title} onBack={onBack} compact={compactHeader} />
          {headerAccessory}
        </View>
        {list ?? (
          <ScrollView
            key={contentKey}
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={screenStyles.content}
            {...(onRefresh ? { alwaysBounceVertical: true } : {})}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  accessibilityLabel="Actualizar contenido"
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary, theme.colors.lime]}
                  progressBackgroundColor={theme.colors.background}
                />
              ) : undefined
            }
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
    gap: theme.spacing.sm,
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
