import { Stack } from 'expo-router/stack';
import { BusinessMemberGuard } from '@/features/business/business-layout';

export default function DocumentationLayout() {
  return (
    <BusinessMemberGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </BusinessMemberGuard>
  );
}
