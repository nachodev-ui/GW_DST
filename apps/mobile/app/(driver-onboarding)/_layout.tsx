import { Stack } from 'expo-router/stack';
import { DriverDocumentAccessGuard } from '@/features/driver/document-access';

export default function DriverOnboardingLayout() {
  return (
    <DriverDocumentAccessGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </DriverDocumentAccessGuard>
  );
}
