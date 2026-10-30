import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { SignOutButton } from '@/features/auth/zone-screen';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Button } from '@/shared/ui/components';
import { Icon, type IconName } from '@/shared/ui/icon';
import { PulsePressable } from '@/shared/ui/pulse-pressable';
import { Text } from '@/shared/ui/text';
import { useAdminWorkspace, type ReviewFilter } from './admin-data';
import { AdminPage, BusinessReviewCard, QueryFeedback, s } from './admin-ui';

const metrics: {
  key:
    | 'pending_businesses'
    | 'pending_documents'
    | 'expiring_documents'
    | 'expired_documents'
    | 'total_businesses';
  label: string;
  icon: IconName;
  filter: ReviewFilter;
}[] = [
  {
    key: 'pending_businesses',
    label: 'Distribuidoras pendientes',
    icon: 'store',
    filter: 'pending',
  },
  { key: 'pending_documents', label: 'Documentos pendientes', icon: 'orders', filter: 'pending' },
  { key: 'expiring_documents', label: 'Vencen en 30 días', icon: 'calendar', filter: 'expiring' },
  { key: 'expired_documents', label: 'Vencidos', icon: 'clock', filter: 'expired' },
  { key: 'total_businesses', label: 'Distribuidoras', icon: 'store', filter: 'all' },
];
export function AdminHomeScreen() {
  const query = useAdminWorkspace();
  const [account, setAccount] = useState(false);
  const data = query.isError ? undefined : query.data;
  return (
    <AdminPage
      title="Administración"
      onRefresh={() => query.refetch()}
      action={
        <PulsePressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          style={s.iconButton}
          onPress={() => setAccount(true)}
        >
          <Icon name="logout" />
        </PulsePressable>
      }
    >
      <QueryFeedback
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data ? (
        <>
          <View style={s.wrap}>
            {metrics.map((metric) => (
              <PulsePressable
                key={metric.key}
                accessibilityRole="button"
                accessibilityLabel={`${metric.label}: ${data.metrics[metric.key]}`}
                style={s.metric}
                onPress={() =>
                  router.push({ pathname: '/admin/documents', params: { filter: metric.filter } })
                }
              >
                <Icon name={metric.icon} />
                <Text variant="display" style={s.number}>
                  {data.metrics[metric.key]}
                </Text>
                <Text variant="note">{metric.label}</Text>
              </PulsePressable>
            ))}
          </View>
          <View style={s.between}>
            <Text variant="subtitle">Siguientes por revisar</Text>
            <Button label="Todas" variant="link" onPress={() => router.push('/admin/documents')} />
          </View>
          {data.next_business_ids.length ? (
            data.next_business_ids.map((id) => {
              const business = data.businesses.find((item) => item.id === id);
              return business ? (
                <BusinessReviewCard
                  key={id}
                  business={business}
                  today={data.today}
                  onPress={() =>
                    router.push({
                      pathname: '/admin/distributors/[businessId]',
                      params: { businessId: id, filter: 'pending' },
                    })
                  }
                />
              ) : null;
            })
          ) : (
            <Text style={s.muted}>Sin pendientes.</Text>
          )}
        </>
      ) : null}
      <BottomSheet visible={account} title="Tu sesión" onClose={() => setAccount(false)}>
        <SignOutButton discreet />
      </BottomSheet>
    </AdminPage>
  );
}
