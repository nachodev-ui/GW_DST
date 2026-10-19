import { invitationEntrySchema, type InvitationEntry } from '@/features/business/team-contracts';

export const invitationCsvTemplate = 'nombre,correo\nConductor de ejemplo,conductor@example.com';
export const maxInvitationCsvSize = 100000;
export type InvitationImportRow = { line: number; name: string; email: string; errors: string[] };

// CSV only: quoted fields, escaped quotes, CRLF/BOM and Chilean semicolon exports.
export function parseInvitationCsv(source: string): InvitationImportRow[] {
  if (source.length > maxInvitationCsvSize) throw new Error('Usa un CSV de hasta 100 KB.');
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const delimiter = text.split('\n', 1)[0]?.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const endField = () => {
    row.push(field.trim());
    field = '';
    closed = false;
  };
  const endRow = () => {
    endField();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === delimiter) endField();
    else if (char === '\n') endRow();
    else if (char === '"' && field === '' && !closed) quoted = true;
    else if (char === '"' || (closed && char.trim() !== ''))
      throw new Error('Revisa las comillas del CSV.');
    else if (!closed) field += char;
  }
  if (quoted) throw new Error('Hay una celda con comillas sin cerrar.');
  endRow();
  const header = rows.shift()?.map((cell) => cell.toLowerCase());
  if (header?.length !== 2 || !['nombre,correo', 'name,email'].includes(header.join(',')))
    throw new Error('Usa dos columnas en este orden: nombre,correo.');
  if (rows.length === 0 || rows.length > 100)
    throw new Error('Incluye entre 1 y 100 personas por archivo.');
  const emails = rows.map((cells) => (cells[1] ?? '').toLowerCase());
  return rows.map((cells, index) => {
    const candidate = { name: cells[0] ?? '', email: emails[index]! };
    const parsed = invitationEntrySchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    if (cells.length !== 2) errors.push('La fila debe tener exactamente dos columnas.');
    if (emails.filter((email) => email === candidate.email).length > 1)
      errors.push('Correo repetido dentro del archivo.');
    return { line: index + 2, ...candidate, errors };
  });
}

export function invitationImportEntries(rows: InvitationImportRow[]): InvitationEntry[] {
  if (!rows.length || rows.some((row) => row.errors.length))
    throw new Error('Corrige las filas marcadas antes de continuar.');
  return rows.map((row) => invitationEntrySchema.parse({ name: row.name, email: row.email }));
}
