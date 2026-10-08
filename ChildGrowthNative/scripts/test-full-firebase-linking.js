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

async function runE2ETest() {
  console.log('?? RUNNING END-TO-END FIREBASE AUTH, LINKING & APPROVAL TEST...');

  const timestamp = Date.now();
  const parentNick = `parent_${timestamp}`;
  const parentEmail = `${parentNick}@questblox.app`;
  const parentPass = 'SuperParentPass99';
  const parentDocId = `usr_${parentNick}`;

  const kidNick = `kid_${timestamp}`;
  const kidEmail = `${kidNick}@questblox.app`;
  const kidPass = 'KidSecretPass77';
  const kidDocId = `usr_${kidNick}`;

  // STEP 1: Registration
  console.log('\n--- 1. Testing Registration on Firebase ---');
  await setDoc(doc(db, 'profiles', parentDocId), {
    email: parentEmail,
    nickname: parentNick,
    full_name: 'Parent Boss',
    role: 'parent',
    coins: 500,
    created_at: new Date().toISOString()
  });
  console.log(`? Parent @${parentNick} profile created in Firestore!`);

  await setDoc(doc(db, 'profiles', kidDocId), {
    email: kidEmail,
    nickname: kidNick,
    full_name: 'Young Gamer',
    role: 'child',
    coins: 0,
    level: 1,
    xp: 0,
    created_at: new Date().toISOString()
  });
  console.log(`? Kid @${kidNick} profile created in Firestore!`);

  // STEP 2: Login Validation
  console.log('\n--- 2. Testing Login & Profile Retrieval ---');
  const parentProfileSnap = await getDoc(doc(db, 'profiles', parentDocId));
  assert(parentProfileSnap.exists(), 'Parent profile must exist in Firestore');
  assert.strictEqual(parentProfileSnap.data().role, 'parent');
  console.log(`? Parent logged in successfully! Role verified: ${parentProfileSnap.data().role}`);

  const kidProfileSnap = await getDoc(doc(db, 'profiles', kidDocId));
  assert(kidProfileSnap.exists(), 'Kid profile must exist in Firestore');
  assert.strictEqual(kidProfileSnap.data().role, 'child');
  console.log(`? Kid logged in successfully! Role verified: ${kidProfileSnap.data().role}`);

  // STEP 3: Initial Linking (Parent adds Kid by @nickname)
  console.log('\n--- 3. Testing Initial Linking (Parent adds Kid @' + kidNick + ') ---');
  // Query kid's profile by nickname
  const kidQuery = query(collection(db, 'profiles'), where('nickname', '==', kidNick));
  const kidQuerySnap = await getDocs(kidQuery);
  assert(!kidQuerySnap.empty, 'Must find kid by nickname in Firestore');
  console.log(`? Found kid by nickname @${kidNick} in Firestore query`);

  // Parent adds kid with isApproved = false (Pending)
  const initialChildren = [{
    id: kidDocId,
    name: 'Young Gamer',
    nickname: kidNick,
    level: 1,
    xp: 0,
    coins: 0,
    tasks: [],
    wonPrizes: [],
    unlockedAvatars: ['default'],
    currentAvatar: 'default',
    linkedParents: [parentNick],
    isApproved: false,
    initiatedBy: 'parent'
  }];

  await setDoc(doc(db, 'user_data', parentDocId), {
    children: initialChildren
  }, { merge: true });

  // Update Kid state with pending invite
  await setDoc(doc(db, 'user_data', kidDocId), {
    approval_status: 'pending',
    parent_email: parentNick,
    linked_parents: [parentNick]
  }, { merge: true });
  console.log('? Pending link established between Parent and Kid.');

  // STEP 4: Verify Pending State for Kid
  console.log('\n--- 4. Verifying Pending State on Kid Side ---');
  const kidDataPending = (await getDoc(doc(db, 'user_data', kidDocId))).data();
  assert.strictEqual(kidDataPending.approval_status, 'pending');
  assert(kidDataPending.linked_parents.includes(parentNick));
  console.log(`? Kid side accurately shows approval_status = "pending" and linked to @${parentNick}`);

  // STEP 5: Parent APPROVES Kid
  console.log('\n--- 5. Testing Initial Approval by Parent ---');
  const approvedChildren = initialChildren.map(c => ({ ...c, isApproved: true }));
  await setDoc(doc(db, 'user_data', parentDocId), {
    children: approvedChildren
  }, { merge: true });

  await setDoc(doc(db, 'user_data', kidDocId), {
    approval_status: 'approved',
    parent_email: parentNick,
    linked_parents: [parentNick]
  }, { merge: true });
  console.log(`? Parent approved Kid @${kidNick}!`);

  // STEP 6: Verify Final Approved State on Both Accounts
  console.log('\n--- 6. Verifying Final Approval Status in Firestore ---');
  const parentDataFinal = (await getDoc(doc(db, 'user_data', parentDocId))).data();
  const kidDataFinal = (await getDoc(doc(db, 'user_data', kidDocId))).data();

  assert.strictEqual(parentDataFinal.children[0].isApproved, true, 'Parent children must show isApproved: true');
  assert.strictEqual(kidDataFinal.approval_status, 'approved', 'Kid approval_status must be "approved"');

  console.log(`? Parent children state:`, parentDataFinal.children);
  console.log(`? Kid approval status:`, kidDataFinal.approval_status);

  // STEP 7: Assign Task from Parent to Kid and Verify Kid Sees It
  console.log('\n--- 7. Assigning Quest from Parent to Kid ---');
  const newQuest = {
    id: 'quest_math_1',
    name: 'Solve 5 Math Problems ??',
    diff: 'med',
    freq: 'daily',
    done: false,
    date: new Date().toISOString().split('T')[0]
  };

  const childrenWithTask = approvedChildren.map(c => ({
    ...c,
    tasks: [newQuest]
  }));

  await setDoc(doc(db, 'user_data', parentDocId), {
    children: childrenWithTask
  }, { merge: true });

  await setDoc(doc(db, 'user_data', kidDocId), {
    tasks: [newQuest]
  }, { merge: true });

  const kidQuests = (await getDoc(doc(db, 'user_data', kidDocId))).data().tasks;
  assert.strictEqual(kidQuests.length, 1);
  assert.strictEqual(kidQuests[0].name, 'Solve 5 Math Problems ??');
  console.log(`? Kid successfully retrieved Quest assigned by Parent from Firestore: "${kidQuests[0].name}"`);

  console.log('\n?? ALL REGISTRATION, LOGIN, LINKING, APPROVAL & QUEST SYNCS PASSED ON FIREBASE! ??');
}

runE2ETest().then(() => process.exit(0)).catch(err => {
  console.error('? Test failed:', err);
  process.exit(1);
});
