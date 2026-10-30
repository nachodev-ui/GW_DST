import { type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

type MediaKind = 'logo' | 'cover';

export function BrandProfilePreview({
  name,
  description,
  logoUri,
  coverUri,
  editing,
  disabled,
  uploading,
  onSelect,
  onLogoError,
  onCoverError,
  children,
}: PropsWithChildren<{
  name: string;
  description: string;
  logoUri: string | undefined;
  coverUri: string | undefined;
  editing: boolean;
  disabled: boolean;
  uploading: MediaKind | undefined;
  onSelect: (kind: MediaKind) => void;
  onLogoError: () => void;
  onCoverError: () => void;
}>) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase('es-CL');
  return (
    <View style={styles.profile}>
      <MediaTarget
        kind="cover"
        editing={editing}
        disabled={disabled}
        busy={uploading === 'cover'}
        onSelect={onSelect}
        style={styles.coverTarget}
      >
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            accessibilityLabel="Portada de tu distribuidora"
            resizeMode="cover"
            style={styles.cover}
            onError={onCoverError}
          />
        ) : (
          <LinearGradient
            colors={[theme.business.dark, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cover, styles.placeholder]}
          >
            <View style={styles.coverPrompt}>
              <Icon name="image" size={theme.layout.tagRemove} color={theme.business.onDark} />
              <Text variant="note" compact style={styles.onDark}>
                Agregar portada
              </Text>
            </View>
          </LinearGradient>
        )}
        {editing && (coverUri || uploading === 'cover') ? (
          <View style={styles.coverEdit}>
            <MediaBadge busy={uploading === 'cover'} />
          </View>
        ) : null}
      </MediaTarget>
      <View style={styles.body}>
        <MediaTarget
          kind="logo"
          editing={editing}
          disabled={disabled}
          busy={uploading === 'logo'}
          onSelect={onSelect}
          style={styles.logoTarget}
        >
          <View style={styles.logo}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                accessibilityLabel="Logo de tu distribuidora"
                resizeMode="contain"
                style={styles.logoImage}
                onError={onLogoError}
              />
            ) : (
              <Text variant="title" compact style={styles.initials}>
                {initials}
              </Text>
            )}
          </View>
          {editing || !logoUri ? (
            <View style={styles.logoEdit}>
              <MediaBadge busy={uploading === 'logo'} add={!logoUri} />
            </View>
          ) : null}
        </MediaTarget>
        <View style={styles.copy}>
          <Text variant="subtitle">{name}</Text>
          {description.trim() ? (
            <Text variant="note" style={styles.muted}>
              {description}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </View>
  );
}

function MediaTarget({
  kind,
  editing,
  disabled,
  busy,
  onSelect,
  style,
  children,
}: PropsWithChildren<{
  kind: MediaKind;
  editing: boolean;
  disabled: boolean;
  busy: boolean;
  onSelect: (kind: MediaKind) => void;
  style: StyleProp<ViewStyle>;
}>) {
  if (!editing) return <View style={style}>{children}</View>;
  return (
    <PulsePressable
      accessibilityRole="button"
      accessibilityLabel={`Cambiar ${kind === 'logo' ? 'logo' : 'portada'}`}
      accessibilityHint={busy ? 'Subiendo imagen' : 'Abre el selector de imágenes'}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={() => onSelect(kind)}
      style={style}
    >
      {children}
    </PulsePressable>
  );
}

function MediaBadge({ busy, add = false }: { busy: boolean; add?: boolean }) {
  return (
    <View style={styles.badge}>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : add ? (
        <Text variant="label" compact style={styles.initials}>
          +
        </Text>
      ) : (
        <Icon name="edit" size={theme.layout.tagRemoveIcon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profile: {
    backgroundColor: theme.business.surface,
    borderRadius: theme.business.radius,
    borderWidth: theme.borders.thin,
    borderColor: theme.business.border,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: theme.business.coverHeight },
  coverTarget: {
    width: '100%',
    height: theme.business.coverHeight,
    marginBottom: -theme.business.logoSize / 2,
  },
  placeholder: { alignItems: 'flex-end', justifyContent: 'center', padding: theme.spacing.md },
  coverPrompt: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  onDark: { color: theme.business.onDark },
  coverEdit: { position: 'absolute', top: theme.spacing.compact, right: theme.spacing.compact },
  body: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.compact,
  },
  logoTarget: { width: theme.business.logoSize, height: theme.business.logoSize },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: theme.business.radius,
    borderWidth: theme.borders.accent,
    borderColor: theme.business.surface,
    backgroundColor: theme.brand.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: theme.business.logoSize - theme.spacing.md,
    height: theme.business.logoSize - theme.spacing.md,
  },
  initials: { color: theme.colors.primary },
  logoEdit: { position: 'absolute', right: -theme.spacing.xs, bottom: -theme.spacing.xs },
  badge: {
    width: theme.layout.brandMark,
    height: theme.layout.brandMark,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.brand.colors.cream,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: theme.spacing.xs },
  muted: { color: theme.business.muted },
});
