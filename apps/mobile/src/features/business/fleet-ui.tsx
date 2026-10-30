import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';

type FleetFilter = 'all' | 'ready' | 'available';

export function FleetHeaderActions({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
      <View style={styles.row}>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Requisitos para repartir"
          onPress={() => setShowInfo(true)}
          style={styles.iconAction}
        >
          <Icon name="info" size={theme.layout.tagRemove} color={theme.business.muted} />
        </PulsePressable>
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Agregar vehículo"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAdd}
          style={styles.addAction}
        >
          <Text variant="subtitle" accessible={false} style={styles.activeText}>
            +
          </Text>
          <Text variant="label" style={styles.activeText}>
            Agregar
          </Text>
        </PulsePressable>
      </View>
      {showInfo ? (
        <BottomSheet visible title="Para repartir" onClose={() => setShowInfo(false)}>
          <ScrollView contentContainerStyle={styles.infoContent}>
            <Text variant="note" style={styles.muted}>
              Para nuevos repartos se exige conductor habilitado y vehículo disponible con
              documentos vigentes revisados. La disponibilidad del conductor se gestiona por
              separado.
            </Text>
          </ScrollView>
        </BottomSheet>
      ) : null}
    </>
  );
}

export function FleetFilters({
  value,
  onChange,
  total,
  ready,
  available,
}: {
  value: FleetFilter;
  onChange: (value: FleetFilter) => void;
  total: number | undefined;
  ready: number | undefined;
  available: number | undefined;
}) {
  const options = [
    { value: 'all', label: 'Todos', count: total },
    { value: 'ready', label: 'Por activar', count: ready },
    { value: 'available', label: 'Disponibles', count: available },
  ] as const;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Filtrar vehículos"
        style={styles.filters}
      >
        {options.map((option) => (
          <PulsePressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={`${option.label}${option.count !== undefined ? `, ${option.count}` : ''}`}
            accessibilityState={{ selected: value === option.value }}
            aria-selected={value === option.value}
            onPress={() => onChange(option.value)}
            style={[styles.filter, value === option.value && styles.selected]}
          >
            <Text
              variant="label"
              numberOfLines={1}
              style={value === option.value ? styles.activeText : styles.muted}
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text
                variant="note"
                numberOfLines={1}
                style={[styles.count, value === option.value ? styles.activeText : styles.muted]}
              >
                {option.count}
              </Text>
            ) : null}
          </PulsePressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  iconAction: {
    minWidth: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.warm,
    borderRadius: theme.radii.control,
  },
  filter: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.compact,
    borderRadius: theme.radii.control,
  },
  selected: { backgroundColor: theme.business.surface },
  activeText: { color: theme.colors.primary },
  muted: { color: theme.business.muted },
  count: { fontVariant: ['tabular-nums'] },
  infoContent: { paddingBottom: theme.spacing.md },
});
