import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/shared/ui/components';
import { Text } from '@/shared/ui/text';
import {
  matchesFilter,
  reviewFilterSchema,
  useAdminWorkspace,
  type ReviewFilter,
} from './admin-data';
import { AdminPage, BusinessReviewCard, QueryFeedback, s } from './admin-ui';

export function AdminDocumentsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const filter: ReviewFilter = reviewFilterSchema.safeParse(params.filter).data ?? 'pending';
  const query = useAdminWorkspace();
  const data = query.isError ? undefined : query.data;
  const businesses = data?.businesses.filter((item) => matchesFilter(item, filter));
  return (
    <AdminPage
      title="Revisión documental"
      onBack={() => router.replace('/admin')}
      onRefresh={() => query.refetch()}
    >
      <View style={s.row}>
        {(['pending', 'all'] as const).map((value) => (
          <View key={value} style={s.grow}>
            <Button
              label={value === 'pending' ? 'Pendientes' : 'Todas'}
              variant="secondary"
              style={filter === value ? s.selected : undefined}
              onPress={() => router.setParams({ filter: value })}
            />
          </View>
        ))}
      </View>
      {filter === 'expiring' || filter === 'expired' ? (
        <Text variant="label">{filter === 'expiring' ? 'Vencen en 30 días' : 'Vencidos'}</Text>
      ) : null}
      <QueryFeedback
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {businesses?.map((business) => (
        <BusinessReviewCard
          key={business.id}
          business={business}
          today={data!.today}
          onPress={() =>
            router.push({
              pathname: '/admin/distributors/[businessId]',
              params: { businessId: business.id, filter },
            })
          }
        />
      ))}
      {businesses?.length === 0 ? (
        <Text style={s.muted}>Sin distribuidoras en esta vista.</Text>
      ) : null}
    </AdminPage>
  );
}
