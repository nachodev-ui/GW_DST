import { useAuth } from '@/features/auth/auth-provider';
import { useOwnerDocuments } from '@/shared/documents/owner-documents';
import { driverLicenseSubmission, type DriverLicenseSubmission } from './document-contracts';
import type { DriverWorkspace } from './offer-contracts';

export function useDriverLicenseSubmission(workspace: DriverWorkspace | undefined) {
  const { session } = useAuth();
  const enabled =
    !!session && !!workspace?.business && workspace.blocking_reason === 'driver_documents';
  const documents = useOwnerDocuments(
    session?.user.id,
    {
      type: 'driver',
      id: session?.user.id ?? '',
      businessId: workspace?.business?.id ?? '',
    },
    enabled,
  );
  const submission: DriverLicenseSubmission = !enabled
    ? 'unknown'
    : documents.isPending
      ? 'checking'
      : documents.isError || !documents.data
        ? 'unknown'
        : driverLicenseSubmission(documents.data);
  return {
    submission,
    refresh: () => (enabled ? documents.refetch({ cancelRefetch: false }) : Promise.resolve()),
  };
}
