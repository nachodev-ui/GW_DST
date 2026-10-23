import { z } from 'zod';

export const confirmationRedirect = 'gasway://auth/confirm';

export type ConfirmationResult = 'confirmed' | 'invalid' | 'expired' | 'sign-in' | 'unavailable';
type ConfirmationLink = { code: string } | { result: Exclude<ConfirmationResult, 'confirmed'> };
const codeSchema = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/);

// External URL boundary: never accept a destination or a bearer session from a link.
export function parseConfirmationLink(raw: string | null): ConfirmationLink {
  if (!raw) return { result: 'invalid' };
  try {
    const url = new URL(raw);
    if (
      `${url.protocol}//${url.host}${url.pathname}` !== confirmationRedirect ||
      url.username ||
      url.password
    ) {
      return { result: 'invalid' };
    }
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (
      url.searchParams.has('access_token') ||
      url.searchParams.has('refresh_token') ||
      fragment.has('access_token') ||
      fragment.has('refresh_token')
    ) {
      return { result: 'sign-in' };
    }
    const error = url.searchParams.get('error_code') ?? fragment.get('error_code');
    if (error === 'otp_expired' || error === 'flow_state_expired') return { result: 'expired' };
    if (error || url.searchParams.has('error') || fragment.has('error'))
      return { result: 'invalid' };
    if (url.searchParams.getAll('code').length !== 1 || fragment.has('code'))
      return { result: 'invalid' };
    const code = codeSchema.safeParse(url.searchParams.get('code'));
    return code.success ? { code: code.data } : { result: 'invalid' };
  } catch {
    return { result: 'invalid' };
  }
}

type ConfirmationAuth = {
  exchangeCodeForSession: (code: string) => PromiseLike<{
    data: { session: unknown };
    error: { code?: string | undefined } | null;
  }>;
};

export async function confirmEmail(
  raw: string,
  auth: ConfirmationAuth,
): Promise<ConfirmationResult> {
  const link = parseConfirmationLink(raw);
  if ('result' in link) return link.result;
  try {
    const { data, error } = await auth.exchangeCodeForSession(link.code);
    if (!error && data.session) return 'confirmed';
    if (error?.code === 'flow_state_expired' || error?.code === 'otp_expired') return 'expired';
    if (
      error?.code === 'pkce_code_verifier_not_found' ||
      error?.code === 'flow_state_not_found' ||
      error?.code === 'bad_code_verifier'
    )
      return 'sign-in';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
