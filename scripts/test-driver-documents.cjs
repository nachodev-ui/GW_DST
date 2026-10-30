const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const documents = load('apps/mobile/src/shared/documents/owner-documents.ts', {
  '@tanstack/react-query': {},
  'expo-router/react-navigation': {},
  '@/shared/supabase/client': {},
});
const flow = load('apps/mobile/src/features/driver/document-contracts.ts', {
  '@/shared/documents/owner-documents': documents,
});
const data = {
  status: 'pending',
  today: '2026-10-27',
  rut: '12345678-5',
  license_class: 'A4',
  items: [],
};
const version = (type, extra = {}) => ({
  id: '1',
  type,
  status: 'pending',
  expires_on: type.endsWith('back') ? '2026-11-27' : null,
  created_at: '2026-10-27T12:00:00Z',
  license_class: type.endsWith('back') ? 'A4' : null,
  ...extra,
});
const front = version('driver_license_front');
const back = version('driver_license_back', { id: '2' });
assert.equal(flow.firstDriverDocumentStep({ ...data, rut: '12345678-9' }), 0);
assert.equal(flow.firstDriverDocumentStep(data), 1);
assert.equal(flow.firstDriverDocumentStep({ ...data, items: [front] }), 2);
assert.equal(flow.firstDriverDocumentStep({ ...data, items: [front, back] }), 3);
assert.equal(flow.driverLicenseSubmission({ ...data, items: [front, back] }), 'in_review');
assert.equal(flow.driverLicenseSubmission({ ...data, items: [front] }), 'incomplete');
assert.equal(
  flow.driverLicenseSubmission({ ...data, rut: null, items: [front, back] }),
  'incomplete',
);
assert.equal(
  flow.driverLicenseSubmission({ ...data, items: [front, { ...back, expires_on: '2026-10-26' }] }),
  'incomplete',
);
assert.equal(
  flow.driverLicenseSubmission({ ...data, license_class: 'B', items: [front, back] }),
  'incomplete',
);
assert.equal(
  flow.driverLicenseSubmission({ ...data, items: [front, { ...back, status: 'rejected' }] }),
  'incomplete',
);
assert.equal(
  flow.driverLicenseSubmission({
    ...data,
    status: 'approved',
    items: [
      { ...front, status: 'approved' },
      { ...back, status: 'approved' },
    ],
  }),
  'approved',
);
assert.equal(
  flow.firstDriverDocumentStep({ ...data, items: [front, { ...back, expires_on: '2026-10-26' }] }),
  2,
);
assert.equal(
  flow.firstDriverDocumentStep({ ...data, license_class: 'B', items: [front, back] }),
  2,
);
assert.equal(
  flow.firstDriverDocumentStep({ ...data, items: [front, { ...back, status: 'rejected' }] }),
  2,
);
assert.equal(
  flow.firstDriverDocumentStep({ ...data, items: [front, { ...back, status: 'superseded' }] }),
  2,
);
assert.equal(
  flow.firstDriverDocumentStep({ ...data, items: [front, { ...back, status: 'replaced' }] }),
  2,
);
const oldApproval = {
  ...back,
  status: 'approved',
  created_at: '2026-10-26T12:00:00Z',
  expires_on: data.today,
};
const rejection = { ...back, id: '3', status: 'rejected' };
const replacement = flow.licenseFileStatus({ ...data, items: [rejection, oldApproval] }, back.type);
assert.equal(replacement.approved.id, oldApproval.id);
assert.equal(replacement.latest.id, rejection.id);
assert.equal(replacement.label, 'Revisado y vigente');
assert.equal(
  flow.licenseFileStatus({ ...data, items: [back] }, back.type).label,
  'En revisión de Gasway',
);
assert.equal(
  flow.licenseFileStatus({ ...data, items: [{ ...back, expires_on: '2026-10-26' }] }, back.type)
    .label,
  'Documento vencido',
);
assert.equal(flow.parseLicenseDate('31/02/2026').success, false);
assert.equal(flow.parseLicenseDate('27/10/2026').data, '2026-10-27');
assert.equal(flow.formatLicenseDateInput('27102026'), '27/10/2026');
assert.equal(
  flow.driverDetailsSchema.parse({ rut: '12.345.678-5', license: 'A4' }).rut,
  '12345678-5',
);
assert.equal(
  flow.driverDetailsSchema.safeParse({ rut: '12345678-5', license: 'C' }).success,
  false,
);
console.log(
  'PASS: license wizard resume, expiry, class changes, pending/rejected replacements and input validation',
);

// A failed refresh must not present cached submission data as a confirmed review.
let enabled;
let query = {
  data: { ...data, items: [front, back] },
  isPending: false,
  isError: false,
  refetch: async () => {},
};
const { useDriverLicenseSubmission } = load('apps/mobile/src/features/driver/document-data.ts', {
  '@/features/auth/auth-provider': { useAuth: () => ({ session: { user: { id: 'driver' } } }) },
  '@/shared/documents/owner-documents': {
    useOwnerDocuments: (_user, _owner, active) => {
      enabled = active;
      return query;
    },
  },
  './document-contracts': flow,
});
const workspace = { business: { id: 'business' }, blocking_reason: 'driver_documents' };
assert.equal(useDriverLicenseSubmission(workspace).submission, 'in_review');
assert.equal(enabled, true);
query = { ...query, isError: true };
assert.equal(useDriverLicenseSubmission(workspace).submission, 'unknown');
query = { ...query, isError: false, isPending: true };
assert.equal(useDriverLicenseSubmission(workspace).submission, 'checking');
assert.equal(useDriverLicenseSubmission(undefined).submission, 'unknown');
assert.equal(enabled, false);
console.log(
  'PASS: submission review waits for persisted evidence, fails closed after read errors and skips unrelated blocks',
);
