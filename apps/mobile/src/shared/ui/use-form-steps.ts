import { useCallback, useState } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';

// Navigation only: the form owner validates before calling go().
export function useFormSteps({ onExit, busy = false }: { onExit: () => void; busy?: boolean }) {
  const [step, setStep] = useState(0);
  const go = useCallback((next: number) => {
    Keyboard.dismiss();
    setStep(next);
  }, []);
  const back = useCallback(() => {
    if (busy) return;
    if (step > 0) go(step - 1);
    else onExit();
  }, [busy, go, onExit, step]);
  usePreventRemove(step > 0 || busy, back);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => subscription.remove();
    }, [back]),
  );
  return { step, go, back };
}
