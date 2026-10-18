import { Slot } from 'expo-router';
import { AppProviders } from '@/shared/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
