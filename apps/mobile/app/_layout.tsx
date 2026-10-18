import { AuthNavigator } from '@/features/auth/auth-navigator';
import { AppProviders } from '@/shared/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthNavigator />
    </AppProviders>
  );
}
