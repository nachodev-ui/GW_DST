import { useEffect, type PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { FontReadyContext } from './text';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function FontProvider({ children }: PropsWithChildren) {
  const [ready, error] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
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
