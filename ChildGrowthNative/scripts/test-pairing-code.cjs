const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/lib/pairingCode.ts');
const mod = new Module(filename, module);
mod.filename = filename;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const pairing = mod.exports;

test('family account QR preserves role and normalized nickname', () => {
  const value = pairing.familyAccountQrValue('child', '@Mia-Champ');
  assert.equal(value, 'questhero://family?role=child&nickname=mia-champ');
  assert.deepEqual(pairing.parseFamilyAccountQr(value), { role: 'child', nickname: 'mia-champ' });
});

test('parent and child QR identities cannot be confused with device codes', () => {
  const parent = pairing.familyAccountQrValue('parent', 'parent_one');
  assert.deepEqual(pairing.parseFamilyAccountQr(parent), { role: 'parent', nickname: 'parent_one' });
  assert.equal(pairing.normalizePairingCode(parent), null);
  assert.equal(pairing.normalizeGuardianCode(parent), null);
});

test('family nickname accepts visible account codes and rejects unsafe input', () => {
  assert.equal(pairing.normalizeFamilyNickname('@Alex.Quest_2'), 'alex.quest_2');
  assert.equal(pairing.normalizeFamilyNickname('a'), null);
  assert.equal(pairing.normalizeFamilyNickname('bad/account'), null);
  assert.equal(pairing.parseFamilyAccountQr('questhero://family?role=child&nickname=%E0%A4%A'), null);
});
