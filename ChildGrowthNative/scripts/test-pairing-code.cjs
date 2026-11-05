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
  const value = pairing.familyAccountQrValue('child', '@Mia-Champ', 'abc123_FirebaseUid');
  assert.equal(value, 'questhero://family?role=child&nickname=mia-champ&uid=abc123_FirebaseUid');
  assert.deepEqual(pairing.parseFamilyAccountQr(value), { role: 'child', nickname: 'mia-champ', uid: 'abc123_FirebaseUid' });
});

test('parent and child QR identities cannot be confused with device codes', () => {
  const parent = pairing.familyAccountQrValue('parent', 'parent_one');
  assert.deepEqual(pairing.parseFamilyAccountQr(parent), { role: 'parent', nickname: 'parent_one' });
  assert.equal(pairing.normalizePairingCode(parent), null);
  assert.equal(pairing.normalizeGuardianCode(parent), null);
});

test('family QR accepts Android and legacy Quest Champ URL variants', () => {
  const expected = { role: 'child', nickname: 'mia', uid: 'abc123_FirebaseUid' };
  assert.deepEqual(pairing.parseFamilyAccountQr('questhero://family/?role=child&nickname=mia&uid=abc123_FirebaseUid'), expected);
  assert.deepEqual(pairing.parseFamilyAccountQr('questhero:///family?nickname=mia&uid=abc123_FirebaseUid&role=child'), expected);
  assert.deepEqual(pairing.parseFamilyAccountQr('questchamp://family/child?nickname=mia&uid=abc123_FirebaseUid'), expected);
  assert.deepEqual(pairing.parseFamilyAccountQr('https://quest-hero-dab6b.web.app/family?role=child&nickname=mia&uid=abc123_FirebaseUid'), expected);
  assert.equal(pairing.normalizePairingCode('questhero://pair/?code=ABCD-EFGH-2345'), 'ABCD-EFGH-2345');
  assert.equal(pairing.normalizeGuardianCode('questhero:///guardian?code=ABCD-EFGH-2345'), 'ABCD-EFGH-2345');
});

test('the visible child nickname works as the manual family code', () => {
  const qr = pairing.familyAccountQrValue('child', 'Mia Champ', 'abc123_FirebaseUid');
  const child = pairing.parseFamilyAccountQr(qr);
  assert.equal(pairing.normalizeFamilyNickname(`@${child.nickname}`), child.nickname);
});

test('child family codes are short, readable and distinct from device codes', () => {
  assert.equal(pairing.normalizeFamilyAccountCode('ABCD-EFGH'), 'ABCD-EFGH');
  assert.equal(pairing.normalizeFamilyAccountCode('abcd efgh'), 'ABCD-EFGH');
  assert.equal(pairing.normalizeFamilyAccountCode('ABCD-EFGH-2345'), null);
  assert.equal(pairing.normalizeFamilyAccountCode('ABCI-EFGH'), null);
});

test('family nickname accepts visible account codes and rejects unsafe input', () => {
  assert.equal(pairing.normalizeFamilyNickname('@Alex.Quest_2'), 'alex.quest_2');
  assert.equal(pairing.normalizeFamilyNickname('a'), null);
  assert.equal(pairing.normalizeFamilyNickname('bad/account'), null);
  assert.equal(pairing.parseFamilyAccountQr('questhero://family?role=child&nickname=%E0%A4%A'), null);
  assert.equal(pairing.parseFamilyAccountQr('questhero://family?role=child&nickname=mia&uid=bad%2Fuid'), null);
});
