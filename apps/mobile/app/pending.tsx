import { Redirect } from 'expo-router';

// Preserve old links while applications now live in the customer's account.
export default function Pending() {
  return <Redirect href="/customer/account" />;
}
