import { Redirect, router, usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { BottomTabBar } from '@/shared/ui/bottom-tab-bar';
import { s } from './admin-ui';

export function AdminLayout() {
  const { session, zone } = useAuth();
  const pathname = usePathname();
  if (!session || zone !== 'admin') return <Redirect href="/" />;
  const reviewing = pathname.startsWith('/admin/distributors/');
  return (
    <View style={s.page}>
      <Stack screenOptions={{ headerShown: false }} />
      {!reviewing ? (
        <BottomTabBar
          items={[
            {
              label: 'Inicio',
              icon: 'dashboard',
              selected: pathname === '/admin',
              onPress: () => router.replace('/admin'),
            },
            {
              label: 'Revisión',
              icon: 'orders',
              selected: pathname === '/admin/documents',
              onPress: () => router.replace('/admin/documents'),
            },
          ]}
        />
      ) : null}
    </View>
  );
}
