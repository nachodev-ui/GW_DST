import { Stack } from 'expo-router/stack';
import { View } from 'react-native';
import { useCustomerOrderUpdates } from '@/features/orders/customer/order-updates';
import { CustomerNavigation } from '@/features/orders/customer/customer-navigation';
import { screenStyles } from '@/shared/ui/screen';

export default function CustomerLayout() {
  useCustomerOrderUpdates();
  return (
    <View style={screenStyles.safe}>
      <Stack screenOptions={{ headerShown: false }} />
      <CustomerNavigation />
    </View>
  );
}
