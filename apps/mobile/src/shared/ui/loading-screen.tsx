import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Button } from './components';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { GaswayLogo } from './gasway-logo';

type LoadingState = 'waiting' | 'success' | 'notice' | 'error' | 'idle';
type LoadingScreenProps = {
  state: LoadingState;
  title: string;
  description: string;
  status: string;
  delayedDescription?: string;
  onRetry?: () => Promise<void>;
  footer?: ReactNode;
  appearance?: 'light' | 'dark';
};

export function LoadingScreen(props: LoadingScreenProps) {
  // Remount only the visual wait when its real stage changes. No artificial stages.
  return props.state === 'waiting' ? (
    <WaitingScreen key={props.status} {...props} />
  ) : (
    <LoadingFrame {...props} delayed={false} />
  );
}

function WaitingScreen(props: LoadingScreenProps) {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(true), theme.loading.delayMs);
    return () => clearTimeout(timer);
  }, []);
  return <LoadingFrame {...props} delayed={delayed} />;
}

function LoadingFrame({
  state,
  title,
  description,
  status,
  delayed,
  delayedDescription = 'Revisa tu conexión. Si la espera continúa, vuelve a abrir la app.',
  onRetry,
  footer,
  appearance,
}: LoadingScreenProps & { delayed: boolean }) {
  const scheme = useColorScheme();
  const resolvedAppearance = appearance ?? (scheme === 'dark' ? 'dark' : 'light');
  const palette = theme.loading[resolvedAppearance];
  const waiting = state === 'waiting';
  const logoOnly = waiting && !delayed;
  const notice = delayed || state === 'notice';
  const tone =
    state === 'error'
      ? { ink: theme.colors.error, background: theme.colors.errorLight, icon: 'close' as IconName }
      : state === 'success'
        ? {
            ink: theme.colors.success,
            background: theme.colors.successLight,
            icon: 'check' as IconName,
          }
        : notice
          ? {
              ink: theme.colors.warning,
              background: theme.colors.warningLight,
              icon: 'clock' as IconName,
            }
          : { ink: palette.accent, background: palette.surface, icon: 'clock' as IconName };
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          <View
            style={styles.logo}
            accessible={logoOnly}
            accessibilityLabel={logoOnly ? `Gasway. ${status}` : undefined}
            accessibilityLiveRegion="polite"
            accessibilityState={{ busy: waiting }}
          >
            <GaswayLogo appearance={resolvedAppearance} />
          </View>
          {!logoOnly ? (
            <>
              <View style={styles.intro}>
                <Text
                  variant="title"
                  accessibilityRole="header"
                  style={[styles.center, { color: palette.text }]}
                >
                  {title}
                </Text>
                <Text style={[styles.center, { color: palette.muted }]}>{description}</Text>
              </View>
              <View
                style={[
                  styles.status,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={[styles.statusIcon, { backgroundColor: tone.background }]}>
                  <Icon name={tone.icon} color={tone.ink} />
                </View>
                <View style={styles.statusCopy}>
                  <Text
                    variant="label"
                    accessibilityLabel={
                      delayed ? 'La carga está tardando más de lo esperado.' : status
                    }
                    accessibilityLiveRegion="polite"
                    accessibilityRole={state === 'error' ? 'alert' : 'text'}
                    accessibilityState={{ busy: waiting && !delayed }}
                    style={{ color: palette.text }}
                  >
                    {delayed ? 'Está tardando más de lo esperado' : status}
                  </Text>
                  {delayed ? (
                    <Text
                      variant="note"
                      accessibilityLiveRegion="polite"
                      style={{ color: palette.muted }}
                    >
                      {delayedDescription}
                    </Text>
                  ) : null}
                </View>
              </View>
              {delayed && onRetry ? (
                <Button label="Reintentar" onPress={() => void onRetry()} />
              ) : null}
            </>
          ) : null}
        </View>
        {footer ? (
          <View style={[styles.footer, { borderColor: palette.border }]}>{footer}</View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.layout.formWidth,
    alignSelf: 'center',
    padding: theme.spacing.screen,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logo: { alignItems: 'center' },
  intro: { gap: theme.spacing.sm },
  center: { textAlign: 'center' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    padding: theme.spacing.md,
    borderWidth: theme.borders.thin,
    borderRadius: theme.radii.card,
  },
  statusIcon: {
    width: theme.loading.statusIconSize,
    height: theme.loading.statusIconSize,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: { flex: 1, gap: theme.spacing.xs },
  footer: {
    borderTopWidth: theme.borders.thin,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
});
