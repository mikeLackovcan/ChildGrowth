const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

// 1. Update syncKidApproval inside approveChildByParent
const oldKidApproval = `        const syncKidApproval = async (kDocId: string) => {
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
        };`;

const newKidApproval = `        const syncKidApproval = async (kDocId: string) => {
          try {
            const kidSnap = await getDoc(doc(db, 'user_data', kDocId));
            const existingParents = kidSnap.exists() ? (kidSnap.data()?.linked_parents || []) : [];
            const existingChildren = kidSnap.exists() ? (kidSnap.data()?.children || []) : [];
            const updatedChildren = existingChildren.map((c: any) => ({ ...c, isApproved: true, linkedParents: Array.from(new Set([...(c.linkedParents || []), parentTag])) }));
            await setDoc(doc(db, 'user_data', kDocId), {
              approval_status: 'approved',
              parent_email: parentTag,
              linked_parents: Array.from(new Set([...existingParents, parentTag])),
              children: updatedChildren,
              updated_at: new Date().toISOString()
            }, { merge: true });
            console.log(\`✅ Firestore: Parent @\${parentTag} approved Kid @\${kidTag} (doc: \${kDocId})\`);
          } catch (e) {
            console.warn('Firestore kid approve update notice:', e);
          }
        };`;

if (content.includes(oldKidApproval)) {
  content = content.replace(oldKidApproval, newKidApproval);
  console.log('Updated syncKidApproval in store');
}

// 2. Update loadMockState
const loadStart = content.indexOf('  loadMockState: async () => {');
const clearStart = content.indexOf('  clearAllData: async () => {', loadStart);

if (loadStart === -1 || clearStart === -1) {
  console.error('loadMockState indices not found');
  process.exit(1);
}

const newLoadMockState = `  loadMockState: async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user_language');
      const activeTag = await AsyncStorage.getItem('active_user_tag');
      const currentNick = (get().nickname || get().userEmail?.split('@')[0] || activeTag || '').toLowerCase().replace(/^@/, '');
      
      let lang: 'en' | 'cs' = 'en';
      if (savedLang === 'cs' || savedLang === 'en') {
        lang = savedLang;
      }

      if (!currentNick && !activeTag && !get().userEmail) {
        i18n.changeLanguage(lang);
        set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
        return;
      }

      // ONLY read from AsyncStorage on initial boot/mount when user is not loaded in memory!
      // This prevents 1.5s polling intervals from constantly resetting memory state with stale serialized disk data!
      const isInitialMount = !get().userEmail && !get().nickname;
      if (isInitialMount) {
        let data = currentNick ? await AsyncStorage.getItem(\`mockState_\${currentNick}\`) : null;
        if (!data && activeTag) {
          data = await AsyncStorage.getItem(\`mockState_\${activeTag}\`);
        }
        if (!data) {
          data = await AsyncStorage.getItem('mockState');
        }
        const todayStr = new Date().toISOString().split('T')[0];

        if (data) {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.userEmail) {
              set({ userEmail: null, role: null, nickname: null, fullName: null, userId: null, language: lang });
              return;
            }
            if (!savedLang && (parsed.language === 'cs' || parsed.language === 'en')) {
              lang = parsed.language;
            }
            const rawTasks: Task[] = Array.isArray(parsed.tasks) ? parsed.tasks : [];
            const storedLastDate = parsed.lastActiveDate || null;
            const isNewDay = storedLastDate !== todayStr;

            const validTasks = isNewDay
              ? rawTasks.map((t) => ({ ...t, done: false, date: todayStr }))
              : rawTasks;

            const rawChildren: ChildProfile[] = Array.isArray(parsed.children) ? parsed.children : [];
            const validChildren: ChildProfile[] = isNewDay
              ? rawChildren.map((c: any) => ({ ...c, tasks: c.tasks?.map((t: any) => ({ ...t, done: false, date: todayStr })) } as ChildProfile))
              : rawChildren;

            const rawWonPrizes = Array.isArray(parsed.wonPrizes) ? parsed.wonPrizes : [];
            const normalizedWonPrizes: WonPrize[] = rawWonPrizes.map((wp: any, idx: number) => ({
              id: wp.id || \`won_\${idx}_\${Date.now()}\`,
              prize: typeof wp === 'string' ? wp : (wp.prize || 'Prize 🎁'),
              date: wp.date || new Date().toISOString(),
              redeemed: Boolean(wp.redeemed),
            }));

            const userTag = (parsed.nickname || parsed.userEmail?.split('@')[0] || currentNick).toLowerCase();
            let restoredRole: UserRole = parsed.role || null;
            if (userTag) {
              try {
                const savedRole = await AsyncStorage.getItem(\`user_role_\${userTag}\`);
                if (savedRole === 'parent' || savedRole === 'child') {
                  restoredRole = savedRole as UserRole;
                }
              } catch (e) {}
            }

            i18n.changeLanguage(lang);
            set({
              fullName: parsed.fullName || null,
              nickname: parsed.nickname || null,
              userId: parsed.userId || null,
              userEmail: parsed.userEmail || null,
              role: restoredRole,
              isSick: Boolean(parsed.isSick),
              xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
              level: typeof parsed.level === 'number' ? parsed.level : 1,
              tasks: validTasks,
              children: validChildren,
              selectedChildId: parsed.selectedChildId || (validChildren[0]?.id || null),
              linkedParents: Array.isArray(parsed.linkedParents) ? parsed.linkedParents : [],
              approvalStatus: parsed.approvalStatus || null,
              lastActiveDate: todayStr,
              prizes: Array.isArray(parsed.prizes) && parsed.prizes.length > 0 ? parsed.prizes : ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'],
              wonPrizes: normalizedWonPrizes,
              coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
              unlockedAvatars: Array.isArray(parsed.unlockedAvatars) && parsed.unlockedAvatars.length > 0 ? parsed.unlockedAvatars : ['default'],
              currentAvatar: parsed.currentAvatar || 'default',
              dailyMood: isNewDay ? null : (parsed.dailyMood || null),
              language: lang,
              epicBossTask: parsed.epicBossTask || '30-min deep focus block 🧠',
              epicBossXP: typeof parsed.epicBossXP === 'number' ? parsed.epicBossXP : 35,
            });

            if (isNewDay) {
              get().saveMockState();
            }
          }
        } else if (savedLang === 'cs' || savedLang === 'en') {
          i18n.changeLanguage(savedLang);
          set({ language: savedLang });
        }
      }

      // Cross-Device FIRESTORE Real-Time Sync
      const effectiveTag = (get().nickname || get().userEmail?.split('@')[0] || currentNick || activeTag || '').toLowerCase().replace(/^@/, '');
      if (effectiveTag) {
        try {
          const docId = \`usr_\${effectiveTag}\`;
          const userDocSnap = await getDoc(doc(db, 'user_data', docId));
          if (userDocSnap.exists()) {
            const cloudData = userDocSnap.data();
            const currentRole = get().role;

            if (currentRole === 'parent') {
              if (Array.isArray(cloudData.children)) {
                const cloudChildren: ChildProfile[] = cloudData.children;
                const activeSelected = get().selectedChildId || (cloudChildren[0]?.id || null);
                const activeChild = cloudChildren.find(c => c.id === activeSelected) || cloudChildren[0];
                
                set({
                  children: cloudChildren,
                  selectedChildId: activeSelected,
                  tasks: activeChild?.tasks || get().tasks,
                  epicBossTask: activeChild?.epicBossTask || cloudData.epicBossTask || get().epicBossTask,
                  epicBossXP: typeof activeChild?.epicBossXP === 'number' ? activeChild.epicBossXP : (typeof cloudData.epicBossXP === 'number' ? cloudData.epicBossXP : get().epicBossXP)
                });

                const stateObj = { ...get(), children: cloudChildren };
                AsyncStorage.setItem(\`mockState_\${effectiveTag}\`, JSON.stringify(stateObj)).catch(() => {});
              }
            } else {
              // Child Role Sync
              const updates: any = {};
              if (cloudData.approval_status !== undefined && cloudData.approval_status !== get().approvalStatus) {
                updates.approvalStatus = cloudData.approval_status;
              }
              if (cloudData.parent_email && cloudData.parent_email !== get().parentEmail) {
                updates.parentEmail = cloudData.parent_email;
              }
              if (Array.isArray(cloudData.linked_parents) && cloudData.linked_parents.length > 0) {
                const mergedParents = Array.from(new Set([...(get().linkedParents || []), ...cloudData.linked_parents]));
                updates.linkedParents = mergedParents;
              }
              if (Array.isArray(cloudData.tasks) && cloudData.tasks.length > 0) {
                updates.tasks = cloudData.tasks;
              }
              if (cloudData.epicBossTask) {
                updates.epicBossTask = cloudData.epicBossTask;
                if (typeof cloudData.epicBossXP === 'number') {
                  updates.epicBossXP = cloudData.epicBossXP;
                }
              }
              if (cloudData.approval_status === 'approved') {
                updates.approvalStatus = 'approved';
                const currentKids = get().children;
                if (currentKids.length > 0) {
                  updates.children = currentKids.map(c => ({ ...c, isApproved: true }));
                }
              }
              if (Object.keys(updates).length > 0) {
                set(updates);
                const stateObj = { ...get(), ...updates };
                AsyncStorage.setItem(\`mockState_\${effectiveTag}\`, JSON.stringify(stateObj)).catch(() => {});
              }
            }
          }
        } catch (cloudErr) {
          // Resilient fallback for offline
        }
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  },
`;

content = content.slice(0, loadStart) + newLoadMockState + content.slice(clearStart);
fs.writeFileSync(storePath, content, 'utf8');
console.log('Successfully updated loadMockState in store');
