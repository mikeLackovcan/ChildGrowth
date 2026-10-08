const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'src', 'store', 'useAppStore.ts');
let content = fs.readFileSync(storePath, 'utf8');

// 1. Patch loginWithEmail
const loginStart = content.indexOf('  loginWithEmail: async (email, password) => {');
const magicStart = content.indexOf('  sendMagicLink: async', loginStart);

if (loginStart === -1 || magicStart === -1) {
  console.error('Login indices not found');
  process.exit(1);
}

const newLogin = `  loginWithEmail: async (email, password) => {
    const cleanInput = email.trim().toLowerCase().replace(/^@/, '');
    
    if (!cleanInput || !password) {
      return { success: false, message: i18n.t('fill_all_fields', 'Please enter Email/Nickname and Password!') };
    }

    const cleanEmail = cleanInput.includes('@') ? cleanInput : \`\${cleanInput}@questblox.app\`;
    const userTag = cleanInput.split('@')[0];

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      const meta = user.displayName ? { full_name: user.displayName, nickname: user.displayName } : {};
      let restoredRole: UserRole = get().role || 'child';
      
      try {
        const savedRole = await AsyncStorage.getItem(\`user_role_\${userTag}\`);
        if (savedRole === 'parent' || savedRole === 'child') {
          restoredRole = savedRole as UserRole;
        }
      } catch (e) {}

      set({
        userEmail: user.email || cleanEmail,
        userId: user.uid,
        fullName: meta.full_name || userTag,
        nickname: meta.nickname || userTag,
        role: restoredRole
      });

      await AsyncStorage.setItem('active_user_tag', userTag);
      await get().loadMockState();
      return { success: true, message: 'Welcome back! Synced with server.' };
    } catch (err: any) {
      console.warn('Firebase Auth note (checking Firestore profile fallback):', err?.message || err);

      try {
        const docId = \`usr_\${userTag}\`;
        let profileData: any = null;

        const pSnap = await getDoc(doc(db, 'profiles', docId));
        if (pSnap.exists()) {
          profileData = pSnap.data();
        } else {
          const q = query(collection(db, 'profiles'), where('nickname', '==', userTag));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            profileData = qSnap.docs[0].data();
          }
        }

        if (profileData) {
          const chosenRole: UserRole = profileData.role === 'parent' ? 'parent' : 'child';
          set({
            userEmail: profileData.email || cleanEmail,
            userId: docId,
            fullName: profileData.full_name || userTag,
            nickname: userTag,
            role: chosenRole,
            coins: typeof profileData.coins === 'number' ? profileData.coins : 0,
            xp: typeof profileData.xp === 'number' ? profileData.xp : 0,
            level: typeof profileData.level === 'number' ? profileData.level : 1,
            currentAvatar: profileData.current_avatar || 'default'
          });

          await AsyncStorage.setItem('active_user_tag', userTag);
          await AsyncStorage.setItem(\`user_role_\${userTag}\`, chosenRole);
          await get().loadMockState();
          return { success: true, message: 'Welcome back! Synced with server.' };
        }
      } catch (firestoreErr) {
        console.warn('Firestore fallback note:', firestoreErr);
      }

      try {
        const localPass = await AsyncStorage.getItem(\`user_pass_\${cleanInput}\`) || await AsyncStorage.getItem(\`user_pass_\${cleanEmail}\`);
        if (localPass && localPass === password) {
          const localRole = await AsyncStorage.getItem(\`user_role_\${userTag}\`) as UserRole || 'child';
          const localName = await AsyncStorage.getItem(\`user_name_\${userTag}\`) || userTag;
          set({
            userEmail: cleanEmail,
            userId: \`usr_\${userTag}\`,
            fullName: localName,
            nickname: userTag,
            role: localRole
          });
          await AsyncStorage.setItem('active_user_tag', userTag);
          await get().loadMockState();
          return { success: true, message: 'Welcome back!' };
        }
      } catch (localErr) {}

      return { success: false, message: err?.message || 'Login failed. Please check your credentials.' };
    }
  },

`;

content = content.slice(0, loginStart) + newLogin + content.slice(magicStart);

// 2. Patch syncToServer and loadMockState
const syncStart = content.indexOf('  syncToServer: async () => {');
const clearStart = content.indexOf('  clearAllData: async () => {', syncStart);

if (syncStart === -1 || clearStart === -1) {
  console.error('Sync/Load indices not found');
  process.exit(1);
}

const newSyncAndLoad = `  syncToServer: async () => {
    try {
      const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
      const { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP } = get();
      if (!userEmail) return;

      const profileData = { userEmail, fullName, nickname, role, coins, xp, level, currentAvatar, tasks, prizes, wonPrizes, unlockedAvatars, userId, children, linkedParents, epicBossTask, epicBossXP };
      await AsyncStorage.setItem(\`user_profile_\${userEmail}\`, JSON.stringify(profileData));

      if (isOnline) {
        const userTag = (nickname || userEmail.split('@')[0] || '').toLowerCase().replace(/^@/, '');
        const docId = (userId || \`usr_\${userTag}\`).replace(/[^a-zA-Z0-9_-]/g, '_');

        await setDoc(doc(db, 'profiles', docId), {
          email: userEmail,
          full_name: fullName,
          nickname: nickname,
          role: role,
          coins: coins,
          xp: xp,
          level: level,
          current_avatar: currentAvatar,
          updated_at: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(db, 'user_data', docId), {
          tasks: tasks,
          prizes: prizes,
          won_prizes: wonPrizes,
          unlocked_avatars: unlockedAvatars,
          children: children,
          linked_parents: linkedParents,
          epicBossTask: epicBossTask,
          epicBossXP: epicBossXP,
          updated_at: new Date().toISOString()
        }, { merge: true });

        // If Parent: Also sync assigned tasks and epic boss to each child's own user_data doc
        if (role === 'parent' && Array.isArray(children)) {
          for (const child of children) {
            if (child.nickname) {
              const childTag = child.nickname.toLowerCase().replace(/^@/, '');
              const childDocId = \`usr_\${childTag}\`;
              setDoc(doc(db, 'user_data', childDocId), {
                tasks: child.tasks || [],
                epicBossTask: child.epicBossTask || epicBossTask,
                epicBossXP: typeof child.epicBossXP === 'number' ? child.epicBossXP : epicBossXP,
                updated_at: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          }
        }

        // If Child: Sync quest completion and XP up to each linked parent's user_data doc
        if (role === 'child' && Array.isArray(linkedParents) && linkedParents.length > 0) {
          for (const parentTag of linkedParents) {
            const cleanPTag = parentTag.toLowerCase().replace(/^@/, '');
            const pDocId = \`usr_\${cleanPTag}\`;
            getDoc(doc(db, 'user_data', pDocId)).then(async pSnap => {
              if (pSnap.exists()) {
                const pData = pSnap.data();
                const pChildren = Array.isArray(pData.children) ? pData.children : [];
                const idx = pChildren.findIndex((c: any) => (c.nickname || '').toLowerCase() === userTag);
                if (idx >= 0) {
                  pChildren[idx] = {
                    ...pChildren[idx],
                    xp,
                    level,
                    coins,
                    tasks,
                    wonPrizes,
                    currentAvatar,
                    updated_at: new Date().toISOString()
                  };
                  await setDoc(doc(db, 'user_data', pDocId), { children: pChildren }, { merge: true });
                }
              }
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('Offline mode active - server sync deferred until online:', err);
    }
  },
  
  loadMockState: async () => {
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
                const currentKids = get().children;
                if (currentKids.length > 0) {
                  updates.children = currentKids.map(c => ({ ...c, isApproved: true }));
                }
              }
              if (Object.keys(updates).length > 0) {
                set(updates);
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

content = content.slice(0, syncStart) + newSyncAndLoad + content.slice(clearStart);

fs.writeFileSync(storePath, content, 'utf8');
console.log('Successfully patched loginWithEmail, syncToServer, and loadMockState');
