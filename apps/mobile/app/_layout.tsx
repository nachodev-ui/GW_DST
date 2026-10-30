import { AuthNavigator } from '@/features/auth/auth-navigator';
import '@/features/tracking/driver/background-tracking';
import { AppProviders } from '@/shared/providers/app-providers';
import { FontProvider } from '@/shared/ui/font-provider';

export default function RootLayout() {
  return (
    <FontProvider>
      <AppProviders>
        <AuthNavigator />
      </AppProviders>
    </FontProvider>
  );
}
