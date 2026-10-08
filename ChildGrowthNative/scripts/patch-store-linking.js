const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

const approveStart = content.indexOf('  approveChildByParent: (childId: string) => {');
const dailyMoodStart = content.indexOf('  setDailyMood: (mood) => {', approveStart);

if (approveStart === -1 || dailyMoodStart === -1) {
  console.error('Indices not found');
  process.exit(1);
}

const replacement = `  approveChildByParent: (childId: string) => {
    const updatedChildren = get().children.map(c => c.id === childId ? { ...c, isApproved: true } : c);
    const approvedChild = updatedChildren.find(c => c.id === childId);
    
    set({
      children: updatedChildren,
      selectedChildId: childId,
      approvalStatus: 'approved',
      tasks: approvedChild?.tasks || [],
      coins: approvedChild?.coins || 0,
      xp: approvedChild?.xp || 0,
      level: approvedChild?.level || 1
    });
    get().saveMockState();

    const parentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = \`usr_\${parentTag}\`;

    if (approvedChild) {
      const kidTag = (approvedChild.nickname || '').toLowerCase().replace(/^@/, '');
      const kidDocId = \`usr_\${kidTag}\`;

      // Cross-user local mock sync (Parent approves -> Kid)
      AsyncStorage.getItem(\`mockState_\${kidTag}\`).then(str => {
        if (str) {
          try {
            const kidData = JSON.parse(str);
            kidData.approvalStatus = 'approved';
            kidData.parentEmail = parentTag;
            kidData.linkedParents = Array.from(new Set([...(kidData.linkedParents || []), parentTag]));
            if (kidData.children && kidData.children.length > 0) {
              kidData.children = kidData.children.map((c: any) => ({ ...c, isApproved: true, linkedParents: kidData.linkedParents }));
            }
            AsyncStorage.setItem(\`mockState_\${kidTag}\`, JSON.stringify(kidData));
          } catch(e){}
        }
      });

      // Cross-Device FIRESTORE Cloud Sync (Parent approves -> Kid)
      try {
        // 1. Update Parent's own Firestore user_data document
        setDoc(doc(db, 'user_data', parentDocId), {
          children: updatedChildren,
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(e => console.warn('Firestore parent children update notice:', e));

        // 2. Update Kid's Firestore user_data document
        const syncKidApproval = async (kDocId: string) => {
          try {
            const kidSnap = await getDoc(doc(db, 'user_data', kDocId));
            const existingParents = kidSnap.exists() ? (kidSnap.data()?.linked_parents || []) : [];
            await setDoc(doc(db, 'user_data', kDocId), {
              approval_status: 'approved',
              parent_email: parentTag,
              linked_parents: Array.from(new Set([...existingParents, parentTag])),
              updated_at: new Date().toISOString()
            }, { merge: true });
            console.log(\`✅ Firestore: Parent @\${parentTag} approved Kid @\${kidTag} (doc: \${kDocId})\`);
          } catch (e) {
            console.warn('Firestore kid approve update notice:', e);
          }
        };

        syncKidApproval(kidDocId);

        const kQuery = query(collection(db, 'profiles'), where('nickname', '==', kidTag));
        getDocs(kQuery).then(snap => {
          if (!snap.empty) {
            const customKidId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (customKidId !== kidDocId) {
              syncKidApproval(customKidId);
            }
          }
        }).catch(e => console.warn('Firestore kid lookup notice:', e));
      } catch(e) {}
    }
  },

  acceptParentInvite: (parentTag?: string) => {
    const currentParentTag = (parentTag || get().parentEmail || 'parent_boss').toLowerCase().replace(/^@/, '');
    const updatedLinked = Array.from(new Set([...get().linkedParents, currentParentTag]));
    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const kidDocId = \`usr_\${currentKidTag}\`;
    const parentDocId = \`usr_\${currentParentTag}\`;
    
    // Mark matching child (or unapproved child) as approved in children list
    const updatedChildren = get().children.map(c => {
      const isMatch = !currentKidTag || c.nickname.toLowerCase() === currentKidTag || c.isApproved === false;
      if (isMatch) {
        return {
          ...c,
          isApproved: true,
          linkedParents: Array.from(new Set([...(c.linkedParents || []), currentParentTag]))
        };
      }
      return c;
    });

    set({
      approvalStatus: 'approved',
      parentEmail: currentParentTag,
      linkedParents: updatedLinked,
      children: updatedChildren
    });
    get().saveMockState();
    
    // Cross-user local mock sync (Kid accepts -> Parent)
    AsyncStorage.getItem(\`mockState_\${currentParentTag}\`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.map((c: any) => c.nickname.toLowerCase() === currentKidTag ? { ...c, isApproved: true } : c);
            AsyncStorage.setItem(\`mockState_\${currentParentTag}\`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Cross-Device FIRESTORE Cloud Sync
    try {
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: 'approved',
        parent_email: currentParentTag,
        linked_parents: updatedLinked,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid accept notice:', e));

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.map((c: any) => (c.nickname || '').toLowerCase() === currentKidTag ? { ...c, isApproved: true } : c);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(\`✅ Firestore: Kid @\${currentKidTag} accepted Parent @\${currentParentTag}\`);
        }
      }).catch(e => console.warn('Firestore parent accept update notice:', e));
    } catch(e) {}
  },

  denyParentInvite: (parentTag?: string) => {
    const currentKidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const pTag = (parentTag || get().parentEmail || 'parent_boss').toLowerCase().replace(/^@/, '');
    const kidDocId = \`usr_\${currentKidTag}\`;
    const parentDocId = \`usr_\${pTag}\`;

    const updatedChildren = get().children.filter(c => {
      if (!c.isApproved && (!currentKidTag || c.nickname.toLowerCase() === currentKidTag)) {
        return false;
      }
      return true;
    });
    set({ parentEmail: null, approvalStatus: null, children: updatedChildren });
    get().saveMockState();
    
    // Cross-user local mock sync (Kid denies -> Parent)
    AsyncStorage.getItem(\`mockState_\${pTag}\`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== currentKidTag);
            AsyncStorage.setItem(\`mockState_\${pTag}\`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Cross-Device FIRESTORE Cloud Sync
    try {
      setDoc(doc(db, 'user_data', kidDocId), {
        approval_status: null,
        parent_email: null,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore kid deny notice:', e));

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.filter((c: any) => (c.nickname || '').toLowerCase() !== currentKidTag);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }).catch(e => console.warn('Firestore parent deny update notice:', e));
    } catch(e) {}
  },

  // Multi-Child & Multi-Parent Actions Implementation
  addChildByNickname: (rawNickname: string, name?: string) => {
    const cleanTag = rawNickname.replace(/^@/, '').trim().toLowerCase();
    if (!cleanTag) return;
    
    const existing = get().children.find(c => c.nickname.toLowerCase() === cleanTag);
    const currentParentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = \`usr_\${currentParentTag}\`;

    let updatedChildren = [...get().children];
    if (existing) {
      const updatedLinked = Array.from(new Set([...(existing.linkedParents || []), currentParentTag]));
      updatedChildren = updatedChildren.map(c => c.id === existing.id ? { ...c, linkedParents: updatedLinked, isApproved: false, initiatedBy: ('parent' as const) } : c);
      set({ children: updatedChildren });
    } else {
      const newChild: ChildProfile = {
        id: 'usr_' + cleanTag,
        name: name || cleanTag,
        nickname: cleanTag,
        level: 1,
        xp: 0,
        coins: 0,
        tasks: [],
        wonPrizes: [],
        unlockedAvatars: ['default'],
        currentAvatar: 'default',
        linkedParents: [currentParentTag],
        isApproved: false,
        initiatedBy: 'parent'
      };
      updatedChildren = [...get().children, newChild];
      set({ children: updatedChildren });
    }
    get().saveMockState();
    
    // Cross-user local mock sync (Parent -> Kid)
    AsyncStorage.getItem(\`mockState_\${cleanTag}\`).then(async str => {
      let kidData: any = {};
      if (str) {
        try { kidData = JSON.parse(str); } catch(e){}
      } else {
        const kEmail = await AsyncStorage.getItem(\`user_email_\${cleanTag}\`) || \`\${cleanTag}@growth.app\`;
        kidData = {
          userEmail: kEmail,
          nickname: cleanTag,
          fullName: name || cleanTag,
          role: 'child',
          children: [],
          linkedParents: [currentParentTag],
          approvalStatus: 'pending',
          parentEmail: currentParentTag
        };
      }
      kidData.approvalStatus = 'pending';
      kidData.parentEmail = currentParentTag;
      kidData.linkedParents = Array.from(new Set([...(kidData.linkedParents || []), currentParentTag]));
      if (kidData.children && kidData.children.length > 0) {
        kidData.children = kidData.children.map((c: any) => ({ ...c, isApproved: false, initiatedBy: 'parent', linkedParents: kidData.linkedParents }));
      } else {
        kidData.children = [{
          id: 'usr_' + cleanTag,
          name: kidData.fullName || cleanTag,
          nickname: cleanTag,
          level: 1, xp: 0, coins: 0, tasks: [], wonPrizes: [], unlockedAvatars: ['default'], currentAvatar: 'default',
          linkedParents: kidData.linkedParents,
          isApproved: false,
          initiatedBy: 'parent'
        }];
      }
      await AsyncStorage.setItem(\`mockState_\${cleanTag}\`, JSON.stringify(kidData));
    });

    // Cross-Device FIRESTORE Cloud Sync (Parent adds Kid)
    try {
      // 1. Save updated children in Parent's Firestore user_data
      setDoc(doc(db, 'user_data', parentDocId), {
        children: updatedChildren,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(e => console.warn('Firestore parent add child notice:', e));

      // 2. Direct write & query Kid's Firestore user_data
      const kidDocId = \`usr_\${cleanTag}\`;
      const syncKidPending = async (kDocId: string) => {
        try {
          const kidSnap = await getDoc(doc(db, 'user_data', kDocId));
          const existingParents = kidSnap.exists() ? (kidSnap.data()?.linked_parents || []) : [];
          await setDoc(doc(db, 'user_data', kDocId), {
            approval_status: 'pending',
            parent_email: currentParentTag,
            linked_parents: Array.from(new Set([...existingParents, currentParentTag])),
            updated_at: new Date().toISOString()
          }, { merge: true });
          console.log(\`✅ Firestore: Parent @\${currentParentTag} added Kid @\${cleanTag} (doc: \${kDocId})\`);
        } catch (err) {
          console.warn('Firestore kid pending sync error:', err);
        }
      };

      syncKidPending(kidDocId);

      const kQuery = query(collection(db, 'profiles'), where('nickname', '==', cleanTag));
      getDocs(kQuery).then(snap => {
        if (!snap.empty) {
          const customDocId = snap.docs[0].id.replace(/[^a-zA-Z0-9_-]/g, '_');
          if (customDocId !== kidDocId) {
            syncKidPending(customDocId);
          }
        }
      }).catch(e => console.warn('Firestore kid add lookup notice:', e));
    } catch(e) {}
  },

  removeChild: (childId: string) => {
    const childToRemove = get().children.find(c => c.id === childId);
    const filtered = get().children.filter(c => c.id !== childId);
    const newSelected = filtered.length > 0 ? filtered[0].id : null;
    const newTasks = filtered.length > 0 ? filtered[0].tasks : [];
    set({ children: filtered, selectedChildId: newSelected, tasks: newTasks });
    get().saveMockState();
    
    const parentTag = (get().nickname || get().userEmail?.split('@')[0] || 'parent_boss').toLowerCase().replace(/^@/, '');
    const parentDocId = \`usr_\${parentTag}\`;

    // Cross-user local mock sync (Parent removes -> Kid)
    if (childToRemove) {
      const kidTag = childToRemove.nickname.toLowerCase().replace(/^@/, '');
      const kidDocId = \`usr_\${kidTag}\`;

      AsyncStorage.getItem(\`mockState_\${kidTag}\`).then(str => {
        if (str) {
          try {
            const kidData = JSON.parse(str);
            kidData.linkedParents = (kidData.linkedParents || []).filter((p: string) => p !== parentTag);
            if (kidData.parentEmail === parentTag) kidData.parentEmail = kidData.linkedParents[0] || null;
            if (kidData.linkedParents.length === 0) kidData.approvalStatus = null;
            AsyncStorage.setItem(\`mockState_\${kidTag}\`, JSON.stringify(kidData));
          } catch(e){}
        }
      });

      // Firestore Cloud Sync
      try {
        setDoc(doc(db, 'user_data', parentDocId), {
          children: filtered,
          updated_at: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        getDoc(doc(db, 'user_data', kidDocId)).then(async snap => {
          if (snap.exists()) {
            const kData = snap.data();
            const parents = (kData.linked_parents || []).filter((p: string) => p !== parentTag);
            await setDoc(doc(db, 'user_data', kidDocId), {
              linked_parents: parents,
              parent_email: parents[0] || null,
              approval_status: parents.length > 0 ? kData.approval_status : null,
              updated_at: new Date().toISOString()
            }, { merge: true });
          }
        }).catch(() => {});
      } catch(e) {}
    }
  },

  removeParent: (parentNickname: string) => {
    const cleanPTag = parentNickname.toLowerCase().replace(/^@/, '');
    const filtered = get().linkedParents.filter(p => p.toLowerCase().replace(/^@/, '') !== cleanPTag);
    set({ linkedParents: filtered, parentEmail: filtered.length > 0 ? filtered[0] : null });
    get().saveMockState();
    
    const kidTag = (get().nickname || get().userEmail?.split('@')[0] || '').toLowerCase().replace(/^@/, '');
    const kidDocId = \`usr_\${kidTag}\`;
    const parentDocId = \`usr_\${cleanPTag}\`;

    // Local AsyncStorage
    AsyncStorage.getItem(\`mockState_\${cleanPTag}\`).then(str => {
      if (str) {
        try {
          const parentData = JSON.parse(str);
          if (parentData.children) {
            parentData.children = parentData.children.filter((c: any) => c.nickname.toLowerCase() !== kidTag);
            AsyncStorage.setItem(\`mockState_\${cleanPTag}\`, JSON.stringify(parentData));
          }
        } catch(e){}
      }
    });

    // Firestore Cloud Sync
    try {
      setDoc(doc(db, 'user_data', kidDocId), {
        linked_parents: filtered,
        parent_email: filtered[0] || null,
        approval_status: filtered.length > 0 ? get().approvalStatus : null,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(() => {});

      getDoc(doc(db, 'user_data', parentDocId)).then(async snap => {
        if (snap.exists()) {
          const pChildren = snap.data()?.children || [];
          const updatedPChildren = pChildren.filter((c: any) => (c.nickname || '').toLowerCase() !== kidTag);
          await setDoc(doc(db, 'user_data', parentDocId), {
            children: updatedPChildren,
            updated_at: new Date().toISOString()
          }, { merge: true });
        }
      }).catch(() => {});
    } catch(e) {}
  },

  selectChild: (childId: string) => {
    const child = get().children.find(c => c.id === childId);
    if (child) {
      set({
        selectedChildId: childId,
        tasks: child.tasks || [],
        wonPrizes: child.wonPrizes || [],
        coins: child.coins || 0,
        level: child.level || 1,
        xp: child.xp || 0,
        epicBossTask: child.epicBossTask || get().epicBossTask || '30-min deep focus block 🧠',
        epicBossXP: child.epicBossXP || get().epicBossXP || 35,
      });
    }
  },
`;

content = content.slice(0, approveStart) + replacement + content.slice(dailyMoodStart);
fs.writeFileSync(storePath, content, 'utf8');
console.log('approveChildByParent and linking actions patched successfully');
