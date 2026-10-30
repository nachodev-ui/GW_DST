import { Redirect, router, usePathname } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { BottomTabBar } from '@/shared/ui/bottom-tab-bar';
import { screenStyles } from '@/shared/ui/screen';

export default function DriverLayout() {
  const { session, zone } = useAuth();
  const pathname = usePathname();
  if (!session || zone !== 'driver') return <Redirect href="/" />;
  return (
    <View style={screenStyles.safe}>
      <Stack screenOptions={{ headerShown: false }} />
      {['/driver', '/driver-coverage', '/driver-account'].includes(pathname) ? (
        <BottomTabBar
          items={[
            {
              label: 'Inicio',
              icon: 'home',
              selected: pathname === '/driver',
              onPress: () => router.replace('/driver'),
            },
            {
              label: 'Cobertura',
              icon: 'pin',
              selected: pathname === '/driver-coverage',
              onPress: () => router.replace('/driver-coverage'),
            },
            {
              label: 'Cuenta',
              icon: 'user',
              selected: pathname === '/driver-account',
              onPress: () => router.replace('/driver-account'),
            },
          ]}
        />
      ) : null}
    </View>
  );
}
