import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { GaswayLogo } from '@/shared/ui/gasway-logo';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { AccessSubmit } from '@/features/auth/access-ui';

function MailArtwork() {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.artwork}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={theme.access.confirmation.artworkViewBox}
        aria-hidden
      >
        <Circle cx="112" cy="75" r="69" fill={theme.colors.warm} />
        <Path
          d="M26 104c-19-28 2-67 34-65M180 29c27 9 36 39 24 60"
          fill="none"
          stroke={theme.colors.sage}
          strokeWidth={theme.access.artwork.outlineWidth}
          strokeDasharray="3 6"
          strokeLinecap="round"
        />
        <Circle cx="31" cy="106" r="5" fill={theme.colors.lime} />
        <Path d="m183 21 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill={theme.colors.primary} />
        <Path
          d="m57 67 55-40 55 40v60H57Z"
          fill={theme.colors.primary}
          stroke={theme.colors.primary}
          strokeWidth={theme.access.artwork.routeWidth}
          strokeLinejoin="round"
        />
        <Rect
          x="76"
          y="18"
          width="76"
          height="95"
          rx="12"
          fill={theme.colors.surface}
          stroke={theme.colors.surfaceBorder}
          strokeWidth={theme.access.artwork.outlineWidth}
          transform="rotate(8 114 65)"
        />
        <Path
          d="M93 42h38M93 53h29M93 64h34"
          stroke={theme.colors.sage}
          strokeWidth={theme.access.artwork.routeWidth}
          strokeLinecap="round"
          transform="rotate(8 114 65)"
        />
        <Path
          d="m57 67 55 38 55-38v54a10 10 0 0 1-10 10H67a10 10 0 0 1-10-10Z"
          fill={theme.colors.lime}
        />
        <Path
          d="m59 126 43-32a17 17 0 0 1 20 0l43 32"
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={theme.access.artwork.routeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx="172" cy="116" r="18" fill={theme.colors.heroStart} />
        <Path
          d="M172 107v9l6 3"
          fill="none"
          stroke={theme.colors.background}
          strokeWidth={theme.access.artwork.routeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function RegistrationCheckEmailPage({
  email,
  onSignIn,
}: {
  email: string;
  onSignIn: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <View style={styles.header}>
            <GaswayLogo />
            <Text variant="note" style={styles.headerNote}>
              Último paso
            </Text>
          </View>

          <View style={styles.intro}>
            <MailArtwork />
            <Text variant="display" accessibilityRole="header" style={styles.title}>
              Revisa tu correo.
            </Text>
            <Text style={styles.subtitle}>Solo falta confirmar tu correo para continuar.</Text>
          </View>

          <View style={styles.destination}>
            <Icon name="mail" color={theme.colors.primary} size={theme.layout.icon} />
            <View style={styles.destinationText}>
              <Text variant="note" style={styles.muted}>
                Tu correo de registro
              </Text>
              <Text variant="subtitle" selectable style={styles.email}>
                {email}
              </Text>
            </View>
          </View>

          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={styles.stepMarker}>
                <Text variant="label">1</Text>
              </View>
              <View style={styles.stepText}>
                <Text variant="label">Busca el correo de Gasway</Text>
                <Text variant="note" style={styles.muted}>
                  Revisa tu bandeja de entrada.
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepMarker}>
                <Text variant="label">2</Text>
              </View>
              <View style={styles.stepText}>
                <Text variant="label">Confirma tu cuenta</Text>
                <Text variant="note" style={styles.muted}>
                  Abre el enlace en este teléfono.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.help}>
            <Icon name="search" size={theme.spacing.md} color={theme.colors.textMuted} />
            <Text variant="note" style={styles.helpText}>
              ¿No lo encuentras? Revisa también spam o correo no deseado.
            </Text>
          </View>

          <View style={styles.actions}>
            <AccessSubmit
              label="Ir a iniciar sesión"
              loadingLabel="Continuando…"
              loading={false}
              onPress={onSignIn}
            />
            <Text variant="note" style={styles.accountHint}>
              Si ya tienes una cuenta con ese correo, ingresa con tu contraseña.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1 },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: theme.layout.accessFormWidth,
    alignSelf: 'center',
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  muted: { color: theme.colors.textMuted },
  headerNote: { flexShrink: 1, textAlign: 'right', color: theme.colors.textMuted },
  intro: { alignItems: 'center', gap: theme.spacing.sm },
  artwork: {
    width: theme.access.confirmation.artworkWidth,
    height: theme.access.confirmation.artworkHeight,
    maxWidth: '100%',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.access.confirmation.titleSize,
    lineHeight: theme.access.confirmation.titleLineHeight,
    letterSpacing: theme.typography.tracking.display,
    textAlign: 'center',
  },
  subtitle: { color: theme.colors.textMuted, textAlign: 'center' },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.compact,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  destinationText: { flex: 1, gap: theme.spacing.xs },
  email: { color: theme.colors.primary },
  steps: { gap: theme.spacing.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.compact },
  stepMarker: {
    minWidth: theme.access.confirmation.stepMarkerSize,
    minHeight: theme.access.confirmation.stepMarkerSize,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, gap: theme.spacing.xs },
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: theme.borders.thin,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.md,
  },
  helpText: { flex: 1, color: theme.colors.textMuted },
  actions: { marginTop: 'auto', paddingTop: theme.spacing.sm, gap: theme.spacing.compact },
  accountHint: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.sm,
  },
});
