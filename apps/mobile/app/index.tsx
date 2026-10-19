import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/auth-provider';

export default function Index() {
  const { session, zone } = useAuth();
  return <Redirect href={!session ? '/access' : zone === 'driver' ? '/driver' : '/customer'} />;
}
