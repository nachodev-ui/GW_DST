import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuth } from '@/features/auth/auth-provider';

export default function DriverLayout() {
  const { session, zone } = useAuth();
  if (!session || zone !== 'driver') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
