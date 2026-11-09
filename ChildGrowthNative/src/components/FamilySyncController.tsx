import React, { useEffect, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';

// Subscribe to server-owned records; snapshots invalidate the read model, never
// bypass consent or overwrite the pending operation queue with raw documents.
export default function FamilySyncController() {
  const uid = useAppStore(s => s.userId);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    setNotice(null);
    if (!uid || uid === 'guest-local') return;
    let disposed = false, busy = false, dirty = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const childStops = new Map<string, () => void>();
    const refresh = async () => {
      if (disposed || auth.currentUser?.uid !== uid || useAppStore.getState().userId !== uid) return;
      dirty = true;
      if (busy) return;
      busy = true;
      try {
        do {
          dirty = false;
          await useAppStore.getState().syncToServer();
          if (!disposed && useAppStore.getState().userId === uid) await useAppStore.getState().loadMockState();
        } while (dirty && !disposed && useAppStore.getState().userId === uid);
      } catch { /* Retry on reconnect and the fallback timer. */ }
      finally { busy = false; }
    };
    const changed = () => { clearTimeout(debounce); debounce = setTimeout(() => { void refresh(); }, 150); };
    const error = () => { if (!disposed) changed(); };
    const stops = ['profiles', 'user_data'].map(name => {
      let previous: string | undefined, previousRewards: string | undefined;
      return onSnapshot(doc(db, name, uid), snapshot => {
        if (snapshot.metadata.fromCache) return;
        if (name === 'user_data') {
          const data = snapshot.data();
          const signature = JSON.stringify([data?.prizes, data?.tasks?.map((task: any) => [task.id, task.revision])]);
          if (previous !== undefined && previous !== signature && useAppStore.getState().role === 'child') setNotice('family_live_quests_rewards');
          const rewards = JSON.stringify(data?.won_prizes);
          if (previousRewards !== undefined && previousRewards !== rewards) setNotice('family_live_rewards');
          previousRewards = rewards;
          previous = signature;
        }
        changed();
      }, error);
    });
    let initialized = false;
    const statuses = new Map<string, string>();
    stops.push(onSnapshot(query(collection(db, 'familyLinks'), where('participants', 'array-contains', uid)), snapshot => {
      if (snapshot.metadata.fromCache) return;
      const accepted = new Set<string>();
      for (const item of snapshot.docs) {
        const link = item.data();
        const previous = statuses.get(item.id);
        if (initialized && previous !== link.status && ['pending', 'accepted', 'declined', 'unlinked'].includes(link.status)) setNotice(link.status === 'pending' && link.childUid === uid ? 'family_live_invitation' : `family_live_${link.status}`);
        statuses.set(item.id, link.status);
        if (link.parentUid === uid && link.status === 'accepted') accepted.add(link.childUid);
      }
      initialized = true;
      for (const [id, stop] of childStops) if (!accepted.has(id)) { stop(); childStops.delete(id); }
      for (const id of accepted) if (!childStops.has(id)) {
        let previousRewards: string | undefined;
        const listeners = ['profiles', 'user_data'].map(name => onSnapshot(doc(db, name, id), snapshot => {
          if (name === 'user_data' && !snapshot.metadata.fromCache) {
            const rewards = JSON.stringify(snapshot.data()?.won_prizes);
            if (previousRewards !== undefined && previousRewards !== rewards) setNotice('family_live_rewards');
            previousRewards = rewards;
          }
          changed();
        }, error));
        childStops.set(id, () => listeners.forEach(stop => stop()));
      }
      changed();
    }, error));
    // A network interruption or a snapshot arriving while an offline edit is
    // queued must not leave the UI stuck. Foreground and periodic reads recover.
    const timer = setInterval(() => { if (AppState.currentState !== 'background') void refresh(); }, 15000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') changed(); });
    changed();
    return () => { disposed = true; clearTimeout(debounce); clearInterval(timer); stops.forEach(stop => stop()); childStops.forEach(stop => stop()); appState.remove(); };
  }, [uid]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 6500); return () => clearTimeout(timer); }, [notice]);
  if (!notice) return null;
  return <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 1000 }}><Pressable accessibilityRole="button" accessibilityLabel={`${t(notice)}. ${t('action_close')}`} onPress={() => setNotice(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.amber, backgroundColor: Colors.surface }}><Text style={{ fontSize: 24 }}>🔔</Text><Text accessibilityLiveRegion="polite" style={{ flex: 1, minWidth: 0, color: Colors.text, fontSize: 16, fontFamily: 'Nunito_800ExtraBold' }}>{t(notice)}</Text><Text style={{ color: Colors.text }}>×</Text></Pressable></View>;
}
