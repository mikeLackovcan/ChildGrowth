const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function loadPairingCode() {
  const filename = path.join(root, 'src/lib/pairingCode.ts');
  const mod = new Module(filename, module);
  mod._compile(ts.transpileModule(read('src/lib/pairingCode.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return mod.exports;
}

test('family QR accepts only Quest Champ pairing codes', () => {
  const { normalizePairingCode, pairingQrValue, normalizeGuardianCode, guardianQrValue } = loadPairingCode();
  assert.equal(normalizePairingCode('ABCD-EFGH-2345'), 'ABCD-EFGH-2345');
  assert.equal(normalizePairingCode(pairingQrValue('ABCD-EFGH-2345')), 'ABCD-EFGH-2345');
  assert.equal(normalizePairingCode('https://example.com/?code=ABCD-EFGH-2345'), null);
  assert.equal(normalizePairingCode('ABCI-EFGH-2345'), null);
  assert.equal(normalizeGuardianCode('ABCD-EFGH-2345'), 'ABCD-EFGH-2345');
  assert.equal(normalizeGuardianCode(guardianQrValue('ABCD-EFGH-2345')), 'ABCD-EFGH-2345');
  assert.equal(normalizeGuardianCode(pairingQrValue('ABCD-EFGH-2345')), null);
});

test('family QR connects immediately after one valid scan and keeps manual entry', () => {
  const screen = read('src/app/link-account.tsx');
  assert.match(screen, /onBarcodeScanned=\{\(\{ data \}\) => void handleScan\(data\)\}/);
  assert.match(screen, /setCode\(parsed\);[\s\S]*await connect\(parsed\)/);
  assert.match(screen, /requestCameraPermission\(\)/);
  assert.match(screen, /accessibilityLabel=\{t\('pair_code_label'\)\}/);
});

test('linked children can add parents and parents can claim a child QR', () => {
  const child = read('src/app/link-account.tsx');
  const parent = read('src/app/claim-child.tsx');
  const setup = read('src/components/ParentPairingSetup.tsx');
  assert.match(child, /deviceConnection === 'linked'/);
  assert.match(child, /createGuardianCode/);
  assert.match(child, /guardianQrValue/);
  assert.match(parent, /claimGuardianCode/);
  assert.match(parent, /normalizeGuardianCode/);
  assert.match(parent, /await useAppStore\.getState\(\)\.loadMockState\(\)/);
  assert.match(setup, /router\.push\('\/claim-child'/);
});

test('entry flow keeps Kid mode local and cloud sign-in parent-only', () => {
  const login = read('src/app/index.tsx');
  assert.match(login, /entryMode.*'choose'.*'parent'/);
  assert.match(login, /selectedRole = 'parent'/);
  assert.match(login, /entry_kid_accessible/);
  assert.match(login, /entry_parent_accessible/);
});

test('logout clears both Firebase and native Google sessions', () => {
  assert.match(read('src/store/useAppStore.ts'), /signOut\(auth\)[\s\S]*signOutGoogleSession/);
  assert.match(read('src/lib/googleLogin.ts'), /GoogleSignin\.signOut\(\)/);
});

test('linked-child quests require approval and new child quests suggest reminders', () => {
  const editor = read('src/app/manage-tasks.tsx');
  assert.match(editor, /familyChild \? true : canApprove && requiresApproval/);
  assert.match(editor, /original \? Boolean\(original\.reminderEnabled\) : state\.role === 'child'/);
  assert.match(read('src/app/quest-map.tsx'), /requiresApproval: familyChild/);
});

test('offline cloud writes leave a durable retry marker and foreground retry', () => {
  assert.match(read('src/store/useAppStore.ts'), /pending_cloud_sync_/);
  assert.match(read('src/app/_layout.tsx'), /AppState\.addEventListener[\s\S]*syncToServer/);
});

test('managed children use readable nicknames and pairing retains them', () => {
  assert.match(read('src/lib/devicePairing.ts'), /baseNickname/);
  assert.doesNotMatch(read('src/lib/devicePairing.ts'), /nickname: ref\.id/);
  assert.match(read('src/lib/connectGuestDevice.ts'), /profile\.nickname \|\| profile\.full_name/);
});
