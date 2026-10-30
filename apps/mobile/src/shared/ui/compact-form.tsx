import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { BottomSheet } from './bottom-sheet';
import { Card, Input } from './components';
import { Icon, type IconName } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

export function FormStepHeading({ title, icon }: { title: string; icon: IconName }) {
  return (
    <View style={s.heading}>
      <View style={s.art}>
        <Icon name={icon} size={theme.layout.brandStacked} color={theme.colors.background} />
      </View>
      <Text variant="title" accessibilityRole="header" style={s.grow}>
        {title}
      </Text>
    </View>
  );
}

export function CompactFormInput({
  icon,
  help,
  label,
  ...props
}: ComponentProps<typeof Input> & { icon: IconName }) {
  return (
    <View style={s.stack}>
      <View style={s.row}>
        <Text variant="note" style={s.grow}>
          {label}
        </Text>
        {help ? <FormInfo label={`Información: ${label}`} detail={help} /> : null}
      </View>
      <Input
        {...props}
        label={label}
        hideLabel
        prefix={
          <View style={s.inputIcon}>
            <Icon name={icon} size={theme.layout.tagRemove} color={theme.colors.textMuted} />
          </View>
        }
        frameStyle={s.inputFrame}
        style={[s.input, props.style]}
      />
    </View>
  );
}

export function FormInfo({
  label,
  detail,
  icon = 'info',
  children,
}: PropsWithChildren<{ label: string; detail: string; icon?: IconName }>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={detail}
        onPress={() => setOpen(true)}
        style={children ? s.notice : s.info}
      >
        {children ?? <Icon name={icon} size={theme.layout.tagRemove} />}
      </PulsePressable>
      <BottomSheet visible={open} title="Información" onClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={s.detail}>
          <Text>{detail}</Text>
        </ScrollView>
      </BottomSheet>
    </>
  );
}

export function FormNotice({ label, detail }: { label: string; detail: string }) {
  return (
    <FormInfo label={label} detail={detail}>
      <Icon name="shield" size={theme.layout.tagRemove} />
      <Text
        variant="note"
        compact
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[s.grow, s.noticeText]}
      >
        {label}
      </Text>
    </FormInfo>
  );
}

export function FormSummarySection({
  title,
  icon,
  onEdit,
  disabled,
  children,
}: PropsWithChildren<{
  title: string;
  icon: IconName;
  onEdit: () => void;
  disabled?: boolean;
}>) {
  return (
    <View style={s.summarySection}>
      <View style={s.row}>
        <Icon name={icon} size={theme.layout.tagRemove} />
        <Text variant="label" style={s.grow}>
          {title}
        </Text>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${title.toLocaleLowerCase('es-CL')}`}
          disabled={disabled}
          onPress={onEdit}
          style={s.info}
        >
          <Icon name="edit" size={theme.layout.tagRemove} />
        </PulsePressable>
      </View>
      {children}
    </View>
  );
}

export function FormChoiceTile({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PulsePressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.tile, selected && s.selected]}
    >
      <View style={s.check}>
        {selected ? (
          <Icon name="check" size={theme.layout.tagRemove} />
        ) : (
          <Icon name="flame" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
        )}
      </View>
      <Text
        variant="note"
        compact
        numberOfLines={1}
        adjustsFontSizeToFit
        style={selected && s.olive}
      >
        {label}
      </Text>
    </PulsePressable>
  );
}

export function FormCard({ children }: PropsWithChildren) {
  return <Card style={s.card}>{children}</Card>;
}

const s = StyleSheet.create({
  grow: { flex: 1, minWidth: theme.spacing.none },
  stack: { gap: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  art: {
    width: theme.layout.illustrationSelector,
    height: theme.layout.illustrationSelector,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: theme.spacing.md, gap: theme.spacing.md },
  input: { minHeight: theme.layout.touchTarget, padding: theme.spacing.compact },
  inputFrame: { minHeight: theme.layout.touchTarget, borderColor: theme.colors.surfaceBorder },
  inputIcon: { paddingLeft: theme.spacing.compact },
  info: {
    width: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
  },
  detail: { paddingBottom: theme.spacing.md },
  summarySection: {
    gap: theme.spacing.xs,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.compact,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
  },
  noticeText: {
    color: theme.colors.textMuted,
    fontSize: theme.forms.noteSize,
    lineHeight: theme.forms.noteLine,
  },
  olive: { color: theme.colors.primary },
  tile: {
    flex: 1,
    minWidth: theme.spacing.none,
    paddingVertical: theme.spacing.compact,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.background,
  },
  selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.warm },
  check: { height: theme.layout.icon, alignItems: 'center', justifyContent: 'center' },
});
