import { StyleSheet } from 'react-native';
import { theme } from '@/theme';

const palette = theme.documentation.colors;

// Only the fourth step uses this compact summary treatment.
export const summaryStyles = StyleSheet.create({
  content: { gap: theme.spacing.compact },
  progressSegment: { backgroundColor: palette.olive },
  footerButton: { backgroundColor: palette.olive },
  overview: {
    padding: theme.spacing.compact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  overviewLabel: { color: palette.canvas, flex: 1, minWidth: 0 },
  count: { color: palette.canvas, flexShrink: 0, fontVariant: ['tabular-nums'] },
  item: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.compact,
    gap: theme.spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  index: {
    color: palette.olive,
    fontSize: theme.documentation.folioSize,
    fontVariant: ['tabular-nums'],
  },
  title: { flex: 1, minWidth: 0 },
  status: { minWidth: 0, flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statusText: { flexShrink: 1, minWidth: 0 },
  data: { flexShrink: 1, minWidth: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  action: {
    minHeight: theme.layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.control,
    flex: 1,
    minWidth: 0,
  },
  tonal: { backgroundColor: theme.colors.warm },
  primary: { backgroundColor: palette.ink },
  discreet: { paddingVertical: theme.spacing.none },
  actionText: { color: palette.olive, flexShrink: 1, minWidth: 0 },
  primaryText: { color: palette.canvas },
});
