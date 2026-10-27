const assert = require('node:assert/strict');
const { test, after } = require('node:test');
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-questblox') throw Error('Use the demo-questblox emulator');
const { db, linkId } = require('../functions/lib/backend/functions/src/core');
const { initializeAccount, updateNickname, resolveFamilyAccount, recoverLegacyProgress } = require('../functions/lib/backend/functions/src/accounts');
const call = (fn, uid, data, token = { email: `${uid}@example.test`, firebase: { sign_in_provider: 'password' } }) => fn.run({ auth: uid ? { uid, token } : undefined, data });
const get = async uid => (await db.doc(`profiles/${uid}`).get()).data();
after(() => db.terminate());
test('account creation and lookup protect identity and private family data', async t => {
  await t.test('rejects anonymous initialization and invalid identity fields', async () => {
    await assert.rejects(call(initializeAccount, null, {}), /AUTH_REQUIRED/);
    await assert.rejects(call(initializeAccount, 'account-anon', { role: 'parent' }, { firebase: { sign_in_provider: 'anonymous' } }), /ACCOUNT_SIGN_IN_REQUIRED/);
    await assert.rejects(call(initializeAccount, 'account-child', { role: 'admin' }), /INVALID_ROLE/);
    await assert.rejects(call(initializeAccount, 'account-child', { role: 'child', nickname: 'a' }), /INVALID_NICKNAME/);
  });
  await t.test('takes email from authentication, initializes Noob and ignores client balance', async () => {
    await call(initializeAccount, 'account-child', { role: 'child', nickname: 'account_child', email: 'forged@example.test', coins: 99999 });
    const profile = await get('account-child');
    assert.equal(profile.email, 'account-child@example.test');
    assert.equal(profile.coins, 0); assert.equal(profile.current_avatar, 'roblox_noob');
    assert.deepEqual((await db.doc('user_data/account-child').get()).data().unlocked_avatars, ['roblox_noob']);
  });
  await t.test('creates friendly nicknames and safely changes old generated tags', async () => {
    await call(initializeAccount, 'friendly-child', { role: 'child', fullName: 'Alex Smith' });
    assert.match((await get('friendly-child')).nickname, /^alex\d{4}$/);
    await db.doc('profiles/old-hero').set({ nickname: 'hero_0123456789abcdef', full_name: 'hero_0123456789abcdef', role: 'child' });
    await db.doc('nicknames/hero_0123456789abcdef').set({ uid: 'old-hero' });
    const migrated = await call(updateNickname, 'old-hero', {});
    assert.match(migrated.nickname, /^[a-z]+\d{4}$/);
    assert.equal((await get('old-hero')).full_name, migrated.nickname);
    assert.equal((await db.doc('nicknames/hero_0123456789abcdef').get()).exists, false);
    assert.equal((await db.doc(`nicknames/${migrated.nickname}`).get()).data().uid, 'old-hero');
    assert.deepEqual(await call(updateNickname, 'old-hero', { nickname: 'rocketfox77' }), { nickname: 'rocketfox77' });
    await assert.rejects(call(updateNickname, 'old-hero', { nickname: 'hero_not_allowed' }), /INVALID_NICKNAME/);
  });
  await t.test('repeated initialization cannot change an existing role or overwrite progress', async () => {
    await db.doc('profiles/account-child').update({ coins: 321 });
    await call(initializeAccount, 'account-child', { role: 'parent', nickname: 'replace_identity' });
    const profile = await get('account-child');
    assert.equal(profile.role, 'child'); assert.equal(profile.nickname, 'account_child'); assert.equal(profile.coins, 321);
  });
  await t.test('concurrent nickname claims produce exactly one winner', async () => {
    const results = await Promise.allSettled(['account-a', 'account-b'].map(uid => call(initializeAccount, uid, { role: 'parent', nickname: 'contested_nickname' })));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.message, 'NICKNAME_TAKEN');
  });
  await t.test('private lookups reveal only the UID of accepted family accounts', async () => {
    await call(initializeAccount, 'account-parent', { role: 'parent', nickname: 'account_parent' });
    await assert.rejects(call(resolveFamilyAccount, 'account-parent', { tag: 'account_child' }), /FAMILY_ACCOUNT_UNAVAILABLE/);
    await assert.rejects(call(resolveFamilyAccount, 'account-parent', { tag: 'nonexistent' }), /FAMILY_ACCOUNT_UNAVAILABLE/);
    await db.doc(`familyLinks/${linkId('account-parent', 'account-child')}`).set({ status: 'pending' });
    await assert.rejects(call(resolveFamilyAccount, 'account-parent', { tag: 'account_child' }), /FAMILY_ACCOUNT_UNAVAILABLE/);
    await db.doc(`familyLinks/${linkId('account-parent', 'account-child')}`).update({ status: 'accepted' });
    assert.deepEqual(await call(resolveFamilyAccount, 'account-parent', { tag: 'account_child' }), { uid: 'account-child' });
    await db.doc(`familyLinks/${linkId('account-parent', 'account-child')}`).update({ status: 'unlinked' });
    await assert.rejects(call(resolveFamilyAccount, 'account-parent', { tag: 'account_child' }), /FAMILY_ACCOUNT_UNAVAILABLE/);
  });
  await t.test('legacy recovery preserves the source, never overwrites current data, and rejects conflicting ownership', async () => {
    await db.doc('profiles/account-legacy').set({ nickname: 'legacy_hero', role: 'child' });
    await db.doc('user_data/usr_legacy_hero').set({ tasks: [{ id: 'kept', done: true }], unlocked_avatars: ['roblox_ninja'], role: 'parent' });
    assert.deepEqual(await call(recoverLegacyProgress, 'account-legacy', {}), { migrated: true });
    const restored = (await db.doc('user_data/account-legacy').get()).data();
    assert.equal(restored.tasks[0].id, 'kept'); assert.equal(restored.role, undefined);
    assert.ok((await db.doc('user_data/usr_legacy_hero').get()).exists);
    await db.doc('user_data/account-legacy').update({ tasks: [] });
    assert.deepEqual(await call(recoverLegacyProgress, 'account-legacy', {}), { migrated: false });
    assert.deepEqual((await db.doc('user_data/account-legacy').get()).data().tasks, []);
    await db.doc('profiles/account-conflict').set({ nickname: 'conflict_hero', role: 'child' });
    await db.doc('user_data/usr_conflict_hero').set({ ownerUid: 'someone-else', tasks: [] });
    await assert.rejects(call(recoverLegacyProgress, 'account-conflict', {}), /ACCOUNT_RECOVERY_REQUIRED/);
  });
});
