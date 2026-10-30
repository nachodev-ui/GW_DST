import { documentTypes, type DocumentVersion } from '@/shared/documents/contracts';

export function reviewDocumentVersions(items: DocumentVersion[]) {
  const ordered = [...items].sort(
    (a, b) =>
      Number(b.status === 'pending') - Number(a.status === 'pending') ||
      b.created_at.localeCompare(a.created_at) ||
      b.id.localeCompare(a.id),
  );
  const current = documentTypes.flatMap((type) => {
    const document = ordered.find(
      (item) => item.type === type && !['superseded', 'replaced'].includes(item.status),
    );
    return document ? [document] : [];
  });
  const currentIds = new Set(current.map((item) => item.id));
  const history = items
    .filter((item) => !currentIds.has(item.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { current, history };
}
