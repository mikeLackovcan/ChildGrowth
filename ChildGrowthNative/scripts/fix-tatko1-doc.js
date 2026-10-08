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

async function fixTatko1Doc() {
  const ref = doc(db, 'user_data', 'usr_tatko1');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const updatedChildren = (data.children || []).map(c => ({
      ...c,
      isApproved: true,
      linkedParents: ['maty']
    }));

    await setDoc(ref, {
      approval_status: 'approved',
      parent_email: 'maty',
      linked_parents: ['maty'],
      children: updatedChildren,
      updated_at: new Date().toISOString()
    }, { merge: true });

    console.log('✅ usr_tatko1 updated: children[0].isApproved is now TRUE');
  }
}

fixTatko1Doc().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
