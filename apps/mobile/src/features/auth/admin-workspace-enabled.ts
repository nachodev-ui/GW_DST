import { readPublicEnv } from '@/shared/config/env';

// This selects the UI contract only. is_document_admin/review_document authorize on the server.
export function isAdminWorkspaceEnabled() {
  const host = new URL(readPublicEnv().supabaseUrl).hostname;
  if (host === 'xnrueexpwzvxotgwmamj.supabase.co') return true;
  return (
    host === 'gleltbrvpfvfgggcatpt.supabase.co' &&
    process.env.EXPO_PUBLIC_ADMIN_DOCUMENT_WORKSPACE_ENABLED === 'true'
  );
}
