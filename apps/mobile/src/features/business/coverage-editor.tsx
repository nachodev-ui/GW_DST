import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth/auth-provider';
import { getSupabase } from '@/shared/supabase/client';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button, Feedback, Input } from '@/shared/ui/components';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Skeleton } from '@/shared/ui/skeleton';
import { Text } from '@/shared/ui/text';
import { theme } from '@/theme';
import { fetchBusinessCommunes } from './business-data';
import { businessCoverageSchema, type BusinessCoverage } from './coverage-contracts';

export function CoverageEditor({
  businessId,
  initial,
  onClose,
}: {
  businessId: string;
  initial: BusinessCoverage;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [selected, setSelected] = useState(initial.communes.map((commune) => commune.code));
  const [search, setSearch] = useState('');
  const catalogue = useQuery({
    queryKey: ['business-communes', session?.user.id],
    queryFn: fetchBusinessCommunes,
    staleTime: Infinity,
  });
  const save = useMutation({
    retry: false,
    mutationFn: async () => {
      const codes = z
        .array(z.string().regex(/^\d{5}$/))
        .max(346)
        .parse(selected);
      const { data, error } = await getSupabase().rpc('set_business_coverage', {
        p_distributor_id: z.uuid().parse(businessId),
        p_commune_codes: codes,
        p_revision: initial.revision,
      });
      if (error) throw error;
      return businessCoverageSchema.parse(data);
    },
    onSuccess: async (data) => {
      client.setQueryData(['business-coverage', session?.user.id, businessId], data);
      await Promise.all(
        ['business-coverage', 'delivery-options', 'driver'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      onClose();
    },
    onError: () =>
      client.invalidateQueries({ queryKey: ['business-coverage', session?.user.id, businessId] }),
  });
  const changed =
    [...selected].sort().join(',') !==
    initial.communes
      .map((commune) => commune.code)
      .sort()
      .join(',');
  const query = search
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
  const matches =
    catalogue.data?.filter((commune) =>
      `${commune.name} ${commune.code}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es-CL')
        .includes(query),
    ) ?? [];
  const conflict = z.object({ code: z.string() }).safeParse(save.error);
  const selectedCommunes = (catalogue.data ?? initial.communes).filter((commune) =>
    selected.includes(commune.code),
  );
  return (
    <BottomSheet
      visible
      title="Comunas de reparto"
      onClose={onClose}
      saving={save.isPending}
      onSave={() => save.mutate()}
      saveDisabled={
        !changed ||
        !catalogue.data ||
        catalogue.isError ||
        (conflict.success && conflict.data.code === '40001')
      }
    >
      <View style={styles.controls}>
        <Text variant="note">Todos tus conductores heredan esta cobertura.</Text>
        <Input
          label="Buscar comuna"
          value={search}
          onChangeText={setSearch}
          editable={!save.isPending}
        />
        <Text variant="label" accessibilityLiveRegion="polite">
          {selected.length}{' '}
          {selected.length === 1 ? 'comuna seleccionada' : 'comunas seleccionadas'}
        </Text>
        {selectedCommunes.length > 0 ? (
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Comunas seleccionadas"
            style={styles.tagsScroll}
            contentContainerStyle={styles.tags}
          >
            {selectedCommunes.map((commune) => (
              <PulsePressable
                key={commune.code}
                haptic
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${commune.name} de la selección`}
                accessibilityHint="El cambio se aplica al guardar."
                accessibilityState={{ disabled: save.isPending }}
                disabled={save.isPending}
                onPress={() =>
                  setSelected((current) => current.filter((code) => code !== commune.code))
                }
                style={styles.tagTarget}
              >
                <View style={styles.tag}>
                  <Text variant="note" style={styles.tagText}>
                    {commune.name}
                  </Text>
                  <View style={styles.tagRemove}>
                    <Icon
                      name="close"
                      size={theme.layout.tagRemoveIcon}
                      color={theme.colors.background}
                    />
                  </View>
                </View>
              </PulsePressable>
            ))}
          </ScrollView>
        ) : null}
        {selected.length === 0 ? (
          <Feedback text="Sin comunas no se recibirán pedidos nuevos." />
        ) : null}
        {save.isError ? (
          <Feedback
            error
            text={
              conflict.success && conflict.data.code === '40001'
                ? 'Otra persona cambió la cobertura. Cierra y vuelve a editar.'
                : 'No pudimos guardar. Actualiza el acceso e intenta otra vez.'
            }
          />
        ) : null}
      </View>
      {catalogue.isPending ? (
        <Skeleton rows={3} />
      ) : catalogue.isError ? (
        <Button
          label="Reintentar carga"
          variant="secondary"
          onPress={() => void catalogue.refetch()}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(commune) => commune.code}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            <EmptyState title="Sin coincidencias" description="Prueba otro nombre." />
          }
          renderItem={({ item }) => {
            const checked = selected.includes(item.code);
            return (
              <PulsePressable
                accessibilityRole="checkbox"
                accessibilityLabel={item.name}
                accessibilityState={{ checked, disabled: save.isPending }}
                disabled={save.isPending}
                onPress={() =>
                  setSelected((current) =>
                    checked
                      ? current.filter((code) => code !== item.code)
                      : [...current, item.code],
                  )
                }
                style={[styles.row, checked && styles.selected]}
              >
                <Icon name={checked ? 'check' : 'pin'} />
                <Text variant="label" style={styles.grow}>
                  {item.name}
                </Text>
              </PulsePressable>
            );
          }}
        />
      )}
    </BottomSheet>
  );
}
const styles = StyleSheet.create({
  controls: { gap: theme.spacing.sm },
  tagsScroll: { flexGrow: 0, flexShrink: 0 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  tagTarget: { minHeight: theme.layout.touchTarget, justifyContent: 'center' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.spacing.xl,
    paddingLeft: theme.spacing.compact,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  tagText: { color: theme.colors.text },
  tagRemove: {
    width: theme.layout.tagRemove,
    height: theme.layout.tagRemove,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexShrink: 1 },
  row: {
    minHeight: theme.layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderRadius: theme.radii.control,
  },
  selected: { backgroundColor: theme.colors.primaryLight },
  grow: { flex: 1 },
});
