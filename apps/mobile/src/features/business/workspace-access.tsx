import { createContext, useContext } from 'react';
import type { Business } from './business-contracts';

export const WorkspaceAccessContext = createContext<{
  data: Business[];
  refetch: () => Promise<unknown>;
} | null>(null);

// The layout owns the one live membership observer for the whole workspace.
export function useWorkspaceBusinesses() {
  const access = useContext(WorkspaceAccessContext);
  if (!access) throw new Error('BusinessMemberGuard is required');
  return access;
}
