const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

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

async function syncLiveAccounts() {
  console.log('🔄 Syncing live Firestore documents for @maty and @tatko1...');

  // 1. Set @tatko1 in user_data
  await setDoc(doc(db, 'user_data', 'usr_tatko1'), {
    approval_status: 'pending',
    parent_email: 'maty',
    linked_parents: ['maty'],
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log('   ✅ Updated usr_tatko1 with approval_status = "pending", linked to "maty"');

  // 2. Set @tatko1 in @maty children list
  const kidItem = {
    id: 'usr_tatko1',
    name: 'tatko',
    nickname: 'tatko1',
    level: 1,
    xp: 0,
    coins: 0,
    tasks: [],
    wonPrizes: [],
    unlockedAvatars: ['default'],
    currentAvatar: 'default',
    linkedParents: ['maty'],
    isApproved: false,
    initiatedBy: 'kid'
  };

  const matySnap = await getDoc(doc(db, 'user_data', 'usr_maty'));
  let matyChildren = [];
  if (matySnap.exists()) {
    matyChildren = matySnap.data()?.children || [];
  }
  const idx = matyChildren.findIndex(c => (c.nickname || '').toLowerCase() === 'tatko1');
  if (idx >= 0) {
    matyChildren[idx] = { ...matyChildren[idx], ...kidItem };
  } else {
    matyChildren.push(kidItem);
  }

  await setDoc(doc(db, 'user_data', 'usr_maty'), {
    children: matyChildren,
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log('   ✅ Updated usr_maty with pending child @tatko1 in children list');

  console.log('\n🎉 Live sync complete! The pending approval card will now show on @maty dashboard!');
}

syncLiveAccounts().then(() => process.exit(0)).catch(e => {
  console.error('Failed to sync live accounts:', e);
  process.exit(1);
});
