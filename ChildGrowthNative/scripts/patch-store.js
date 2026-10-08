const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

// 1. Update sendParentInvite
const sendInviteStart = content.indexOf('  sendParentInvite: (parentEmail) => {');
const sendInviteEnd = content.indexOf('  approveChildByParent: (childId: string) => {', sendInviteStart);

if (sendInviteStart === -1 || sendInviteEnd === -1) {
  console.error('Could not find sendParentInvite block');
  process.exit(1);
}

const newSendInvite = `  sendParentInvite: (parentEmail) => {
    const cleanParentTag = parentEmail.replace(/^@/, '').trim().toLowerCase();
    if (!cleanParentTag) return;

    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || 'kid_hero').toLowerCase().replace(/^@/, '');
    const currentKidName = get().fullName || currentKidTag;
    const existing = get().children.find(c => c.nickname.toLowerCase() === cleanParentTag);

    let updatedChildren = [...get().children];
    if (existing) {
      const updatedLinked = Array.from(new Set([...(existing.linkedParents || []), cleanParentTag]));
      updatedChildren = updatedChildren.map(c => c.id === existing.id ? { ...c, linkedParents: updatedLinked, isApproved: false, initiatedBy: 'kid' } : c);
    } else {
      const newChild: ChildProfile = {
        id: 'usr_' + currentKidTag,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };
      updatedChildren.push(newChild);
    }

    set({
      parentEmail: cleanParentTag,
      approvalStatus: 'pending',
      linkedParents: Array.from(new Set([...get().linkedParents, cleanParentTag])),
      children: updatedChildren
    });
    get().saveMockState();
    
    // Cross-user local mock sync (Kid -> Parent)
    AsyncStorage.getItem(\`mockState_\${cleanParentTag}\`).then(async str => {
      let parentData: any = {};
      if (str) {
        try { parentData = JSON.parse(str); } catch(e){}
      } else {
        const pEmail = await AsyncStorage.getItem(\`user_email_\${cleanParentTag}\`) || \`\${cleanParentTag}@growth.app\`;
        parentData = {
          userEmail: pEmail,
          nickname: cleanParentTag,
          fullName: cleanParentTag,
          role: 'parent',
          children: [],
          linkedParents: [],
          tasks: [],
          prizes: ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑']
        };
      }

      const childExists = parentData.children?.find((c: any) => c.nickname.toLowerCase() === currentKidTag);
      const kidItem = {
        id: 'usr_' + currentKidTag,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };
      if (childExists) {
        parentData.children = parentData.children.map((c: any) => c.nickname.toLowerCase() === currentKidTag ? { ...c, isApproved: false, initiatedBy: 'kid' } : c);
      } else {
        parentData.children = parentData.children || [];
        parentData.children.push(kidItem);
      }
      await AsyncStorage.setItem(\`mockState_\${cleanParentTag}\`, JSON.stringify(parentData));
    });

    // Cross-Device FIRESTORE Cloud Sync (Kid -> Parent)
    try {
      const kidDocId = \`usr_\${currentKidTag}\`;
      const parentDocId = \`usr_\${cleanParentTag}\`;

      // 1. Update Kid's user_data document in Firestore
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: 'pending',
        parent_email: cleanParentTag,
        linked_parents: Array.from(new Set([...get().linkedParents, cleanParentTag])),
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid doc update notice:', e));

      // 2. Direct write & query Parent in Firestore
      const kidItem = {
        id: kidDocId,
        name: currentKidName,
        nickname: currentKidTag,
        level: get().level || 1,
        xp: get().xp || 0,
        coins: get().coins || 0,
        tasks: get().tasks || [],
        wonPrizes: get().wonPrizes || [],
        unlockedAvatars: get().unlockedAvatars || ['default'],
        currentAvatar: get().currentAvatar || 'default',
        linkedParents: [cleanParentTag],
        isApproved: false,
        initiatedBy: 'kid'
      };

      const syncParentDoc = async (pDocId: string) => {
        try {
          const parentDocSnap = await getDoc(doc(db, 'user_data', pDocId));
          let parentChildren: any[] = [];
          if (parentDocSnap.exists()) {
            parentChildren = parentDocSnap.data()?.children || [];
          }
          const idx = parentChildren.findIndex((c: any) => (c.nickname || '').toLowerCase() === currentKidTag);
          if (idx >= 0) {
            parentChildren[idx] = { ...parentChildren[idx], ...kidItem };
          } else {
            parentChildren.push(kidItem);
          }
          await setDoc(doc(db, 'user_data', pDocId), {
            children: parentChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(\`✅ Firestore: Linked Kid @\${currentKidTag} pending to Parent @\${cleanParentTag} (doc: \${pDocId})\`);
        } catch (err) {
          console.warn('Firestore sync parent error:', err);
        }
      };

      syncParentDoc(parentDocId);

      const pQuery = query(collection(db, 'profiles'), where('nickname', '==', cleanParentTag));
      getDocs(pQuery).then(snap => {
        if (!snap.empty) {
          const customDocId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (customDocId !== parentDocId) {
            syncParentDoc(customDocId);
          }
        }
      }).catch(e => console.warn('Firestore parent lookup notice:', e));
    } catch(e) {}
  },
`;

content = content.slice(0, sendInviteStart) + newSendInvite + content.slice(sendInviteEnd);
console.log('sendParentInvite updated successfully');
fs.writeFileSync(storePath, content, 'utf8');
