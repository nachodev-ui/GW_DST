import { router, usePathname } from 'expo-router';
import { BottomTabBar } from '@/shared/ui/bottom-tab-bar';
import { useOrdersList } from './order-data';

export function CustomerNavigation() {
  const pathname = usePathname();
  return pathname.startsWith('/customer') ? <CustomerTabs pathname={pathname} /> : null;
}

function CustomerTabs({ pathname }: { pathname: string }) {
  // Same query and cache as Inicio/Pedidos; no extra endpoint or polling.
  const orders = useOrdersList();
  const hasActiveOrder =
    orders.data?.pages.some((page) =>
      page.some((order) => order.status !== 'delivered' && order.status !== 'cancelled'),
    ) ?? false;
  return (
    <BottomTabBar
      appearance="floating"
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
          badge: hasActiveOrder,
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
  );
}
