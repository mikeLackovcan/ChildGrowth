const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const memory = new Map(), delivered = [], receipts = new Map();
const auth = { currentUser: { uid: 'queue-child' } };
let mode = 'ok', beforeResponse = null, failStorage = false, failReviewWrite = false;
function load() {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/progressQueue.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name.includes('async-storage')) return { getItem: async key => memory.get(key) || null, setItem: async (key, value) => { if (failStorage || (failReviewWrite && key.startsWith('questblox-progress-review:'))) throw Error('disk full'); memory.set(key, value); } };
    if (name === '../utils/questDay') return { localDay: () => '2026-10-23' };
    if (name === './firebase') return { auth, app: {} };
    if (name === 'firebase/functions') return { getFunctions: () => ({}), httpsCallable: () => async operation => {
      if (mode === 'offline') throw Error('offline');
      if (mode === 'reject' && operation.payload.id === 'rejected') throw Object.assign(Error('QUEST_NOT_FOUND'), { code: 'functions/not-found' });
      if (!receipts.has(operation.requestId)) {
        delivered.push(operation);
        receipts.set(operation.requestId, { profile: { coins: delivered.length * 12 }, data: { tasks: [] }, result: { ok: true } });
      }
      if (mode === 'lost-response') throw Error('response lost after commit');
      if (beforeResponse) { const callback = beforeResponse; beforeResponse = null; await callback(); }
      return { data: receipts.get(operation.requestId) };
    } };
    throw Error(`Unexpected dependency: ${name}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(localRequire, module, module.exports);
  return module.exports;
}
(async () => {
  let queue = load();
  const first = await queue.enqueueProgress('queue-child', 'queue-child', 'task.complete', { id: 'read' });
  mode = 'offline';
  await assert.rejects(queue.flushProgress('queue-child'), /offline/);
  assert.equal(await queue.hasQueuedProgress('queue-child'), true);
  queue = load(); // Simulate process restart: only persisted storage survives.
  mode = 'lost-response';
  await assert.rejects(queue.flushProgress('queue-child'), /response lost/);
  assert.equal(delivered.length, 1);
  mode = 'ok';
  const recovered = await queue.flushProgress('queue-child');
  assert.equal(delivered.length, 1); assert.equal(delivered[0].requestId, first.requestId);
  assert.equal(recovered.snapshots['queue-child'].profile.coins, 12);
  assert.equal(await queue.hasQueuedProgress('queue-child'), false);
  console.log('✓ Offline operations survive restart; a lost response retries the same request without double payment');
  const second = await queue.enqueueProgress('queue-child', 'queue-child', 'task.help', { id: 'clean' });
  beforeResponse = async () => { await queue.enqueueProgress('queue-child', 'queue-child', 'task.start', { id: 'clean' }); };
  const concurrent = await queue.flushProgress('queue-child');
  assert.equal(delivered.length, 3); assert.equal(delivered[1].requestId, second.requestId);
  assert.equal(concurrent.generation, queue.progressGeneration('queue-child'));
  assert.equal(await queue.hasQueuedProgress('queue-child'), false);
  console.log('✓ Operations added during a flush stay ordered and are drained before reconciliation');
  await queue.enqueueProgress('queue-child', 'queue-child', 'chest.claim');
  beforeResponse = () => { auth.currentUser = { uid: 'another-child' }; };
  await assert.rejects(queue.flushProgress('queue-child'), /ACCOUNT_CHANGED/);
  assert.equal(await queue.hasQueuedProgress('queue-child'), true);
  await assert.rejects(queue.flushProgress('queue-child'), /ACCOUNT_CHANGED/);
  assert.equal(await queue.hasQueuedProgress('another-child'), false);
  auth.currentUser = { uid: 'queue-child' };
  await queue.flushProgress('queue-child');
  assert.equal(delivered.length, 4);
  console.log('✓ Account switching cannot consume another account’s outbox or apply its response');
  failStorage = true;
  await assert.rejects(queue.enqueueProgress('queue-child', 'queue-child', 'task.create', { id: 'saved-later' }), /disk full/);
  await assert.rejects(queue.flushProgress('queue-child'), /disk full/);
  assert.equal(await queue.hasQueuedProgress('queue-child'), true);
  failStorage = false;
  await queue.enqueueProgress('queue-child', 'queue-child', 'task.complete', { id: 'saved-later' });
  await queue.flushProgress('queue-child');
  assert.deepEqual(delivered.slice(-2).map(item => item.action), ['task.create', 'task.complete']);
  assert.equal(await queue.hasQueuedProgress('queue-child'), false);
  console.log('✓ Failed local writes remain pending and retry in order before dependent actions');

  mode = 'reject';
  const rejected = await queue.enqueueProgress('queue-child', 'queue-child', 'task.complete', { id: 'rejected' });
  await queue.enqueueProgress('queue-child', 'queue-child', 'task.help', { id: 'next-task' });
  const reviewed = await queue.flushProgress('queue-child');
  assert.equal(reviewed.needsRefresh, true);
  assert.equal(await queue.hasQueuedProgress('queue-child'), false);
  assert.equal((await queue.readProgressIssues('queue-child')).filter(issue => !issue.archivedAt).length, 1);
  assert.equal(delivered.at(-1).payload.id, 'next-task');
  mode = 'ok';
  await queue.retryProgressIssue('queue-child', rejected.requestId);
  failReviewWrite = true;
  await assert.rejects(queue.flushProgress('queue-child'), /disk full/);
  const paidCount = delivered.length;
  assert.equal(await queue.hasQueuedProgress('queue-child'), true);
  queue = load(); // Crash after server success but before review archive persisted.
  failReviewWrite = false;
  const retry = await queue.flushProgress('queue-child');
  assert.equal(delivered.length, paidCount);
  assert.ok(retry.snapshots['queue-child']);
  assert.deepEqual(queue.takeProgressResult('queue-child', rejected.requestId), { ok: true });
  assert.equal(await queue.hasQueuedProgress('queue-child'), false);
  assert.equal(delivered.at(-1).requestId, rejected.requestId);
  assert.ok((await queue.readProgressIssues('queue-child'))[0].archivedAt);
  auth.currentUser = { uid: 'another-child' };
  await assert.rejects(queue.readProgressIssues('queue-child'), /ACCOUNT_CHANGED/);
  await assert.rejects(queue.retryProgressIssue('queue-child', rejected.requestId), /ACCOUNT_CHANGED/);
  console.log('✓ Rejected changes keep a review copy, later saves continue, and retries keep their original receipt ID');
})().catch(error => { console.error(error); process.exitCode = 1; });
