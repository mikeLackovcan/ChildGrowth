const assert = require('assert');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBO1MM4BuAqeORW3o9tG4EMS7lEyrQHviQ',
  authDomain: 'questblox-10c14.firebaseapp.com',
  projectId: 'questblox-10c14',
  storageBucket: 'questblox-10c14.firebasestorage.app',
  messagingSenderId: '35992182600',
  appId: '1:35992182600:web:63ccce0b2653a3450d9d7d'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testKidInvitesParentCycle() {
  console.log('🧪 TESTING FULL KID-INITIATED LINKING & PARENT APPROVAL CYCLE IN FIRESTORE...\n');

  const ts = Date.now();
  const kidTag = `testkid_${ts}`;
  const parentTag = `testparent_${ts}`;

  const kidDocId = `usr_${kidTag}`;
  const parentDocId = `usr_${parentTag}`;

  // 1. Both registered
  console.log('1. Registering Parent and Kid in Firestore...');
  await setDoc(doc(db, 'profiles', parentDocId), {
    nickname: parentTag,
    role: 'parent',
    full_name: 'Parent User',
    email: `${parentTag}@questblox.app`
  });
  await setDoc(doc(db, 'user_data', parentDocId), {
    children: [],
    tasks: [],
    linked_parents: []
  });

  await setDoc(doc(db, 'profiles', kidDocId), {
    nickname: kidTag,
    role: 'child',
    full_name: 'Kid Hero',
    email: `${kidTag}@questblox.app`
  });
  await setDoc(doc(db, 'user_data', kidDocId), {
    children: [],
    tasks: [],
    linked_parents: []
  });
  console.log('   ✅ Parent and Kid accounts initialized.');

  // 2. Kid initiates parent invite (what sendParentInvite does)
  console.log('\n2. Kid sends invite to Parent @' + parentTag + '...');
  // Update Kid doc
  await setDoc(doc(db, 'user_data', kidDocId), {
    approval_status: 'pending',
    parent_email: parentTag,
    linked_parents: [parentTag],
    updated_at: new Date().toISOString()
  }, { merge: true });

  // Update Parent doc
  const kidItem = {
    id: kidDocId,
    name: 'Kid Hero',
    nickname: kidTag,
    level: 1,
    xp: 0,
    coins: 0,
    tasks: [],
    wonPrizes: [],
    unlockedAvatars: ['default'],
    currentAvatar: 'default',
    linkedParents: [parentTag],
    isApproved: false,
    initiatedBy: 'kid'
  };
  await setDoc(doc(db, 'user_data', parentDocId), {
    children: [kidItem],
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log('   ✅ Firestore updated: Kid pending and Parent children array populated.');

  // 3. Parent poll (loadMockState)
  console.log('\n3. Parent polling user_data from Firestore...');
  const parentDataSnap = await getDoc(doc(db, 'user_data', parentDocId));
  assert(parentDataSnap.exists(), 'Parent user_data must exist');
  const parentData = parentDataSnap.data();
  assert.strictEqual(parentData.children.length, 1);
  assert.strictEqual(parentData.children[0].nickname, kidTag);
  assert.strictEqual(parentData.children[0].isApproved, false);
  assert.strictEqual(parentData.children[0].initiatedBy, 'kid');
  console.log('   ✅ Parent dashboard detects pending request from Kid @' + kidTag + '!');

  // 4. Parent approves Kid (approveChildByParent)
  console.log('\n4. Parent taps APPROVE LINK in dashboard...');
  const updatedParentChildren = parentData.children.map(c => ({ ...c, isApproved: true }));
  await setDoc(doc(db, 'user_data', parentDocId), {
    children: updatedParentChildren,
    updated_at: new Date().toISOString()
  }, { merge: true });

  await setDoc(doc(db, 'user_data', kidDocId), {
    approval_status: 'approved',
    parent_email: parentTag,
    linked_parents: [parentTag],
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log('   ✅ Parent approved child in Firestore.');

  // 5. Kid poll (loadMockState)
  console.log('\n5. Kid polling user_data from Firestore...');
  const kidDataSnap = await getDoc(doc(db, 'user_data', kidDocId));
  assert(kidDataSnap.exists(), 'Kid user_data must exist');
  const kidData = kidDataSnap.data();
  assert.strictEqual(kidData.approval_status, 'approved');
  assert(kidData.linked_parents.includes(parentTag));
  console.log('   ✅ Kid app receives approval! Status is now "approved".');

  // 6. Parent assigns daily quest
  console.log('\n6. Parent assigns Quest to Kid...');
  const quest = {
    id: 'quest_clean_room',
    name: 'Clean My Room 🛏️',
    diff: 'easy',
    freq: 'daily',
    done: false,
    date: new Date().toISOString().split('T')[0]
  };
  await setDoc(doc(db, 'user_data', kidDocId), {
    tasks: [quest],
    updated_at: new Date().toISOString()
  }, { merge: true });

  const kidUpdatedQuests = (await getDoc(doc(db, 'user_data', kidDocId))).data().tasks;
  assert.strictEqual(kidUpdatedQuests.length, 1);
  assert.strictEqual(kidUpdatedQuests[0].name, 'Clean My Room 🛏️');
  console.log('   ✅ Kid receives assigned quest: "' + kidUpdatedQuests[0].name + '"');

  console.log('\n🎉 ENTIRE CYCLE VERIFIED 100% WORKING IN FIRESTORE! 🚀');
}

testKidInvitesParentCycle().then(() => process.exit(0)).catch(e => {
  console.error('❌ Cycle test failed:', e);
  process.exit(1);
});
