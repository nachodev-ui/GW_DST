import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';
import { BottomSheet } from './bottom-sheet';
import { CompactFormInput } from './compact-form';
import { Icon } from './icon';
import { PulsePressable } from './pulse-pressable';
import { Text } from './text';

type SelectOption = { value: string; label: string; detail: string };

// The owner supplies already-filtered options, preserving its catalogue/query contract.
export function CompactSelect({
  label,
  selected,
  options,
  search,
  onSearch,
  onChange,
  onBlur,
  error,
  disabled,
  hint,
}: {
  label: string;
  selected?: SelectOption | undefined;
  options: SelectOption[];
  search: string;
  onSearch: (value: string) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | undefined;
  disabled?: boolean;
  hint: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onBlur();
  };
  return (
    <View style={s.stack}>
      <Text variant="note">{label}</Text>
      <PulsePressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'Sin seleccionar'}`}
        accessibilityHint={error ?? 'Abre el buscador de comunas'}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[s.field, error && s.invalid]}
      >
        <Icon name="pin" size={theme.layout.tagRemove} color={theme.colors.textMuted} />
        {selected ? (
          <View style={s.chip}>
            <Text variant="note" numberOfLines={1} style={s.grow}>
              {selected.label}
            </Text>
            <Text variant="note" style={s.muted}>
              {selected.detail}
            </Text>
          </View>
        ) : (
          <Text variant="note" style={[s.grow, s.muted]}>
            Selecciona una comuna
          </Text>
        )}
        <Icon name="chevronDown" size={theme.layout.tagRemove} />
      </PulsePressable>
      {error ? (
        <Text variant="note" accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      <BottomSheet visible={open} title="Comuna del recinto" onClose={close}>
        <CompactFormInput
          label="Buscar comuna o código CUT"
          placeholder="Nombre o código CUT"
          icon="search"
          value={search}
          onChangeText={onSearch}
          editable={!disabled}
          autoFocus
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.results}
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
        >
          {options.map((option) => (
            <PulsePressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}, CUT ${option.detail}`}
              accessibilityState={{ checked: selected?.value === option.value }}
              disabled={disabled}
              onPress={() => {
                onChange(option.value);
                close();
              }}
              style={s.option}
            >
              <Text variant="label" numberOfLines={1} style={s.grow}>
                {option.label}
              </Text>
              <Text variant="note" style={s.muted}>
                {option.detail}
              </Text>
              {selected?.value === option.value ? (
                <Icon name="check" size={theme.layout.tagRemove} />
              ) : null}
            </PulsePressable>
          ))}
          <Text variant="note" style={s.muted}>
            {hint}
          </Text>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: theme.spacing.sm },
  grow: { flex: 1, minWidth: theme.spacing.none },
  muted: { color: theme.colors.textMuted },
  error: { color: theme.colors.error },
  invalid: { borderColor: theme.colors.error },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    padding: theme.spacing.compact,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.surface,
  },
  chip: {
    flex: 1,
    minWidth: theme.spacing.none,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.warm,
  },
  results: { paddingBottom: theme.spacing.md, gap: theme.spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: theme.borders.thin,
    borderBottomColor: theme.colors.divider,
  },
});
