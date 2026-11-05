const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function fixture({ cloud = null, cached = null, offline = false, switchAccount = false, anonymous = false } = {}) {
  const auth = { currentUser: { uid: 'account-a', isAnonymous: anonymous } };
  const reads = [], writes = [];
  const mocks = {
    './firebase': { auth, db: {} },
    './projectStorage': { default: {
      getItem: async key => { reads.push(key); return cached; },
      setItem: async (key, value) => { writes.push([key, value]); },
    } },
    'firebase/firestore': {
      doc: (_db, collection, uid) => collection + '/' + uid,
      getDoc: async ref => {
        reads.push(ref);
        if (switchAccount) auth.currentUser = { uid: 'account-b' };
        if (offline) throw new Error('offline');
        return { exists: () => cloud !== null, data: () => typeof cloud === 'object' ? cloud : ({ role: cloud }) };
      },
    },
  };
  const filename = path.resolve(__dirname, '../src/lib/accountRole.ts');
  const mod = new Module(filename, module);
  mod.require = name => { assert.ok(mocks[name], name); return { __esModule: true, ...mocks[name] }; };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return { ...mod.exports, reads, writes };
}

test('fresh-device parent login restores its cloud role and caches by UID', async () => {
  const f = fixture({ cloud: 'parent', cached: 'child' });
  assert.equal(await f.loadAccountRole('account-a'), 'parent');
  assert.deepEqual(f.reads, ['account_role_account-a', 'profiles/account-a']);
  assert.deepEqual(f.writes, [['account_role_account-a', 'parent']]);
});
test('existing legacy child account keeps its recorded cloud role', async () => {
  assert.equal(await fixture({ cloud: 'child' }).loadAccountRole('account-a'), 'child');
});
test('login restores the canonical cloud nickname used by family QR linking', async () => {
  const identity = await fixture({ cloud: { role: 'child', nickname: 'mia-champ', full_name: 'Mia Champ' } }).loadAccountIdentity('account-a');
  assert.deepEqual(identity, { role: 'child', nickname: 'mia-champ', fullName: 'Mia Champ' });
});
test('new accounts default to parent; offline recovery uses only UID-scoped cached role', async () => {
  assert.equal(await fixture().loadAccountRole('account-a'), 'parent');
  assert.equal(await fixture({ offline: true, cached: 'child' }).loadAccountRole('account-a'), 'child');
  assert.equal(await fixture({ cloud: 'invalid', cached: 'invalid' }).loadAccountRole('account-a'), 'parent');
});
test('account switching or anonymous device identity cannot adopt a parent role', async () => {
  const f = fixture({ switchAccount: true, cloud: 'parent' });
  await assert.rejects(f.loadAccountRole('account-a'), /pair_session_changed/);
  assert.deepEqual(f.writes, []);
  const anonymous = fixture({ anonymous: true });
  await assert.rejects(anonymous.loadAccountRole('account-a'), /pair_session_changed/);
  assert.deepEqual(anonymous.reads, []);
});
