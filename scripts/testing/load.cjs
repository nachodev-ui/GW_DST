const fs = require('node:fs');
const path = require('node:path');
const { Module, createRequire } = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');

// Execute real source with explicit boundary mocks; never render or load native modules.
function load(source, mocks = {}, globals = {}) {
  const filename = path.resolve(root, source);
  const localRequire = createRequire(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      inlineSourceMap: true,
      inlineSources: true,
    },
  }).outputText;
  const module = new Module(filename);
  const requireSource = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/')
        ? path.join(root, 'apps/mobile/src', specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      const resolved = ['', '.ts', '.tsx', '.json'].map((ext) => base + ext).find(fs.existsSync);
      if (!resolved) throw new Error(`Unresolved source import: ${specifier} in ${source}`);
      return resolved.endsWith('.json') ? localRequire(resolved) : load(resolved, mocks, globals);
    }
    return localRequire(specifier);
  };
  module.require = requireSource;
  module.testGlobals = { Intl, Date, Set, Map, Number, queueMicrotask, ...globals };
  const names = Object.keys(module.testGlobals);
  if (names.some((name) => !/^[a-zA-Z_$][\w$]*$/.test(name))) {
    throw new Error('Test globals must be JavaScript identifiers');
  }
  // Module compilation registers inline maps with Node/V8; vm.runInNewContext does not.
  // Account for the injected lexical globals without shifting reported TypeScript lines.
  const marker = '//# sourceMappingURL=data:application/json;base64,';
  const [javascript, encodedMap] = code.split(marker);
  const map = JSON.parse(Buffer.from(encodedMap.trim(), 'base64').toString('utf8'));
  map.mappings = ';' + map.mappings;
  const mapped = Buffer.from(JSON.stringify(map)).toString('base64');
  module._compile(
    `const { ${names.join(', ')} } = module.testGlobals;\n${javascript}${marker}${mapped}\n`,
    filename,
  );
  return module.exports;
}

module.exports = { load };
