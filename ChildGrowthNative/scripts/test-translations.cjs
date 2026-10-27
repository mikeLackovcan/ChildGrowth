const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let resources;
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const localRequire = name => name === 'i18next' ? { use() { return this; }, init(options) { resources = options.resources; } }
    : name === 'react-i18next' ? { initReactI18next: {} } : load(path.join(path.dirname(file), `${name}.ts`));
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
load(path.resolve(__dirname, '../src/i18n/index.ts'));
const keys = Object.keys(resources.en.translation).sort();
const parameters = value => [...value.matchAll(/{{\s*([\w]+)\s*}}/g)].map(m => m[1]).sort();
for (const language of ['en', 'cs', 'es', 'de']) {
  const catalog = resources[language].translation;
  assert.deepEqual(Object.keys(catalog).sort(), keys, `${language}: missing or extra translation keys`);
  for (const key of keys) {
    assert.equal(typeof catalog[key], 'string', `${language}.${key}`);
    assert.ok(catalog[key].trim(), `${language}.${key} is empty`);
    assert.deepEqual(parameters(catalog[key]), parameters(resources.en.translation[key]), `${language}.${key}: placeholder mismatch`);
  }
}
console.log(`✓ ${keys.length} translation keys present in all four languages; placeholders match.`);
console.log('Key parity does not prove that every screen is localized; also review visible text and layout.');
