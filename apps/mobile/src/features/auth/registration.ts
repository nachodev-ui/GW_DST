import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  registrationSchema,
  registrationPhoneSchema,
  authErrorMessage,
  authRetryDelay,
  type Credentials,
} from '@/features/auth/credentials';

type RegistrationResult = 'check-email' | 'authenticated' | 'cancelled' | 'ignored';
type RegistrationState = {
  draft: Credentials | null;
  email: string | null;
  contact: { email: string; digits: string } | null;
  error: string | null;
  retryAt: number;
  submitting: boolean;
  setPhone: (digits: string) => void;
  begin: (values: Credentials) => boolean;
  leave: (pathname: string) => void;
  submit: (
    auth: Pick<SupabaseClient['auth'], 'signUp'>,
    phone: string,
    redirect: string,
  ) => Promise<RegistrationResult>;
};

// No persistence, route params, analytics or query cache. Leaving phone drops the
// password; email/digits remain in memory so registration can resume safely.
export const useRegistration = create<RegistrationState>((set, get) => ({
  draft: null,
  email: null,
  contact: null,
  error: null,
  retryAt: 0,
  submitting: false,
  setPhone: (digits) => {
    const contact = get().contact;
    if (contact && !get().submitting) {
      set({ contact: { ...contact, digits: digits.replace(/\D/g, '').slice(0, 8) } });
    }
  },
  begin: (values) => {
    if (get().submitting || get().draft) return false;
    const draft = registrationSchema.parse(values);
    const previous = get().contact;
    set({
      draft,
      email: null,
      contact: {
        email: draft.email,
        digits: previous?.email === draft.email ? previous.digits : '',
      },
    });
    return true;
  },
  leave: (pathname) => {
    if (pathname === '/auth/phone') return;
    if (pathname === '/access') {
      // Resume email/phone after back, but require the password again.
      set({ draft: null, email: null });
    } else if (pathname === '/auth/check-email') {
      set({ draft: null, contact: null });
    } else {
      set({ draft: null, contact: null, email: null, error: null, retryAt: 0 });
    }
  },
  submit: async (auth, phone, redirect) => {
    const draft = get().draft;
    if (get().submitting || !draft || get().retryAt > Date.now()) return 'ignored';
    const canonicalPhone = registrationPhoneSchema.parse(phone);
    // Synchronous lock: React form state alone cannot stop taps in the same frame.
    set({ submitting: true, error: null, contact: { email: draft.email, digits: phone } });
    try {
      const { data, error } = await auth.signUp({
        ...draft,
        options: { emailRedirectTo: redirect, data: { phone: canonicalPhone } },
      });
      if (get().draft !== draft) return 'cancelled';
      if (error) throw error;
      set({
        draft: null,
        contact: null,
        email: data.session ? null : draft.email,
        error: null,
        retryAt: 0,
      });
      return data.session ? 'authenticated' : 'check-email';
    } catch (error) {
      // Keep rate limits even if the user left while Auth was responding.
      // The next manual attempt can resume without keeping their password.
      const delay = authRetryDelay(error);
      if (delay) set({ error: authErrorMessage(error), retryAt: Date.now() + delay });
      if (get().draft !== draft) return 'cancelled';
      if (!delay) set({ error: authErrorMessage(error) });
      throw error;
    } finally {
      set({ submitting: false });
    }
  },
}));
