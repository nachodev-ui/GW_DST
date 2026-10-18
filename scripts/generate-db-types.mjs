import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

if (!process.env.npm_execpath) throw new Error('Run with npm run db:types');
const output = execFileSync(
  process.execPath,
  [process.env.npm_execpath, 'exec', '--', 'supabase', 'gen', 'types', 'typescript', '--local'],
  { encoding: 'utf8' },
);
writeFileSync('apps/mobile/src/shared/types/database.generated.ts', output);
