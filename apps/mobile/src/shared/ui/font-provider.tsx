import { useEffect, type PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { FontReadyContext } from './text';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function FontProvider({ children }: PropsWithChildren) {
  const [ready, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  useEffect(() => {
    if (ready || error) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, error]);
  if (!ready && !error) return null;
  return <FontReadyContext.Provider value={ready}>{children}</FontReadyContext.Provider>;
}
