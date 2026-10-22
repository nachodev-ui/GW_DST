import { LinearGradient } from 'expo-linear-gradient';
import { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <LinearGradient
      colors={[theme.colors.heroStart, theme.colors.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={workspaceStyles.hero}
    >
      <View style={workspaceStyles.heroTop}>
        <Text variant="label" style={workspaceStyles.eyebrow}>
          {eyebrow}
        </Text>
        <Icon name="home" color={theme.colors.primaryLight} />
      </View>
      <Text variant="display" accessibilityRole="header" style={workspaceStyles.heroTitle}>
        {title}
      </Text>
      <Text style={workspaceStyles.heroDescription}>{description}</Text>
      {children ? <View style={workspaceStyles.heroFooter}>{children}</View> : null}
    </LinearGradient>
  );
}

export function WorkspaceHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={workspaceStyles.sectionHeading}>
      <Text variant="subtitle" accessibilityRole="header">
        {title}
      </Text>
      {detail ? (
        <Text variant="note" style={workspaceStyles.muted}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function WorkspaceMetric({
  value,
  label,
  icon,
  onPress,
}: {
  value: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={workspaceStyles.metric}>
      <View style={workspaceStyles.heroTop}>
        <Icon name={icon} color={theme.colors.primary} />
        <Icon name="arrowRight" color={theme.colors.textMuted} />
      </View>
      <Text style={workspaceStyles.metricValue}>{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

export const workspaceStyles = StyleSheet.create({
  hero: {
    ...theme.elevation.medium,
    borderRadius: theme.workspace.heroRadius,
    padding: theme.spacing.lg,
    gap: theme.spacing.compact,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.primaryLight,
    letterSpacing: theme.workspace.eyebrowSpacing,
    flexShrink: 1,
  },
  heroTitle: { color: theme.colors.onPrimary },
  heroDescription: { color: theme.colors.primaryLight },
  heroFooter: {
    borderTopColor: theme.colors.primaryLight,
    borderTopWidth: theme.borders.thin,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.compact,
  },
  sectionHeading: { gap: theme.spacing.xs },
  muted: { color: theme.colors.textMuted },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.compact },
  metric: {
    flex: 1,
    minWidth: theme.layout.illustrationHero,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderColor: theme.colors.surfaceBorder,
  },
  metricValue: { fontSize: theme.workspace.metricSize, lineHeight: theme.workspace.metricLine },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.compact,
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
    padding: theme.spacing.md,
  },
  grow: { flex: 1 },
});
