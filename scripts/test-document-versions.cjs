const assert = require('node:assert/strict');
const { load } = require('./testing/load.cjs');
const { reviewDocumentVersions } = load('apps/mobile/src/features/admin/document-versions.ts');
const version = (id, type, status = 'pending') => ({
  id: String(id),
  type,
  status,
  created_at: `2026-10-27T12:00:0${id}Z`,
});
const front = 'driver_license_front';
const back = 'driver_license_back';
const attempts = [
  version(1, front, 'replaced'),
  version(2, back, 'replaced'),
  version(3, front, 'replaced'),
  version(4, back),
  version(5, front),
];
const current = reviewDocumentVersions(attempts);
assert.deepEqual(
  current.current.map((item) => item.id),
  ['5', '4'],
);
assert.deepEqual(
  current.history.map((item) => item.id),
  ['3', '2', '1'],
);
assert.equal(attempts.length, 5, 'Grouping never erases history');
const approved = version(1, front, 'approved');
const pending = version(2, front);
assert.deepEqual(reviewDocumentVersions([approved, pending]).current, [pending]);
assert.deepEqual(reviewDocumentVersions([approved, pending]).history, [approved]);
const rejected = { ...pending, status: 'rejected' };
assert.deepEqual(reviewDocumentVersions([approved, rejected]).current, [rejected]);
assert.deepEqual(reviewDocumentVersions([approved, rejected]).history, [approved]);
assert.deepEqual(
  reviewDocumentVersions([version(1, front), version(5, front)]).current.map((item) => item.id),
  ['5'],
  'Old queues are de-duplicated while upgrading',
);
assert.deepEqual(reviewDocumentVersions([]), { current: [], history: [] });
console.log(
  'PASS: five license attempts become two current files and three historical versions; previous approval remains accessible',
);
