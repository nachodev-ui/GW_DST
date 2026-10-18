// Metadata is presentation only; it never determines access or roles.
export function getDisplayName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined,
) {
  const value = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : email?.split('@')[0] || 'Mi cuenta';
}
