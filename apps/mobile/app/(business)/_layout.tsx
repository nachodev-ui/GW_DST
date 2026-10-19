import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useAuth } from '@/features/auth/auth-provider';

export default function BusinessLayout() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
