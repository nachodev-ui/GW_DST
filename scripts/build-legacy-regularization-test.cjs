// Compose the exact administrative block with transactional SQL fixtures. No network.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('supabase/admin/regularize-legacy-driver.sql', 'utf8');
const block = source.match(/do \$\$[\s\S]*?\$\$;/)?.[0];
assert.ok(block, 'administrative DO block required');
const tests = fs.readFileSync('supabase/tests/legacy_driver_regularization.sql', 'utf8');
const output = process.argv[2];
assert.ok(output, 'provide a destination SQL file');
fs.writeFileSync(
  output,
  `begin;\nselect set_config('gasway.test_regularization_sql','${block.replaceAll("'", "''")}',true);\n${tests}\nrollback;\nselect 'PASS one-time regularization, permissions, invitation consent, review, rejection, retry and audit; fixtures reverted' as result;\n`,
);
