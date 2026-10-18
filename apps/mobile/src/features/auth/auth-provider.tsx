import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { focusManager, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/shared/supabase/client';
import { fetchAccess, type Zone } from '@/features/auth/access';

type AuthState = {
  session: Session | null;
  zone: Zone | undefined;
  loading: boolean;
  error: boolean;
  retry: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();
  const access = useQuery({
    queryKey: ['auth-access', session?.user.id],
    queryFn: () => fetchAccess(session!.user.id),
    enabled: ready && !!session,
    staleTime: 0,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    setReady(false);
    setSessionError(false);
    try {
      const client = getSupabase();
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, next) => {
        if (!active) return;
        authEventReceived = true;
        queryClient.clear();
        setSession(next);
        setReady(true);
        setSessionError(false);
      });
      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active || authEventReceived) return;
          if (error) throw error;
          setSession(data.session);
          setReady(true);
        })
        .catch(() => {
          if (active && !authEventReceived) {
            setSessionError(true);
            setReady(true);
          }
        });
      const refresh = (state: string | null | undefined) => {
        focusManager.setFocused(state === 'active');
        if (state === 'active') {
          client.auth.startAutoRefresh();
          void queryClient.invalidateQueries({ queryKey: ['auth-access'] });
        } else client.auth.stopAutoRefresh();
      };
      refresh(AppState.currentState);
      const listener = AppState.addEventListener('change', refresh);
      return () => {
        active = false;
        subscription.unsubscribe();
        listener.remove();
        client.auth.stopAutoRefresh();
      };
    } catch {
      setSessionError(true);
      setReady(true);
    }
    return () => {
      active = false;
    };
  }, [attempt, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session,
        zone: access.data,
        loading: !ready || (!!session && access.isPending),
        error: sessionError || (!!session && access.isError),
        retry: async () => {
          if (sessionError) setAttempt((value) => value + 1);
          else await access.refetch();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  return auth;
}
