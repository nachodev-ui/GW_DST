import { Stack } from 'expo-router/stack';
import { BusinessMemberGuard } from '@/features/business/business-layout';
import { View } from 'react-native';
import { BusinessNavigation, businessStyles } from '@/features/business/business-shell';

export default function BusinessWorkspaceLayout() {
  return (
    <BusinessMemberGuard>
      <View style={businessStyles.safe}>
        <Stack screenOptions={{ headerShown: false }} />
        <BusinessNavigation />
      </View>
    </BusinessMemberGuard>
  );
}
