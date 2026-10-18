import { Stack } from 'expo-router/stack';
import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useCustomerOrderUpdates } from '@/features/orders/customer/order-updates';
import { BottomTabBar } from '@/shared/ui/bottom-tab-bar';
import { screenStyles } from '@/shared/ui/screen';

export default function CustomerLayout() {
  useCustomerOrderUpdates();
  const pathname = usePathname();
  return (
    <View style={screenStyles.safe}>
      <Stack screenOptions={{ headerShown: false }} />
      {pathname.startsWith('/customer') ? (
        <BottomTabBar
          items={[
            {
              label: 'Inicio',
              icon: 'home',
              selected: pathname === '/customer',
              onPress: () => router.replace('/customer'),
            },
            {
              label: 'Pedidos',
              icon: 'orders',
              selected: pathname === '/customer/orders',
              onPress: () => router.replace('/customer/orders'),
            },
            {
              label: 'Cuenta',
              icon: 'user',
              selected: pathname === '/customer/account',
              onPress: () => router.replace('/customer/account'),
            },
          ]}
        />
      ) : null}
    </View>
  );
}
