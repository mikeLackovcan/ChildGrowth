import { fighterImage } from '../constants/fighterImages';
import { useReminderStore } from '../store/useReminderStore';
import { reminderAccount, syncQuestReminders } from '../lib/notifications';
import { confirmAction } from '../lib/dialogs';
import React, { useState } from 'react';
import { personName } from '../utils/displayName';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAppStore } from '../store/useAppStore';
import { AVAILABLE_AVATARS } from '../constants/fighters';
import { Bell, LogOut, Users, X, Globe, RotateCcw, ChevronRight, Unlink, Archive, Pencil, Check } from 'lucide-react-native';
import LanguageSwitcher from './LanguageSwitcher';

export default function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const s = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(s.nickname || '');
  const [nicknameMessage, setNicknameMessage] = useState('');
  const guest = s.userId === 'guest-local';
  const fighter = AVAILABLE_AVATARS.find(item => item.id === s.currentAvatar) || AVAILABLE_AVATARS[0];
  const go = (path: '/link-account' | '/reminders' | '/parent-dashboard' | '/sync-recovery') => { onClose(); router.push(path); };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(false);
    try { await action(); } catch { setError(true); } finally { setBusy(false); }
  };
  const leave = () => { void run(async () => { await s.logout(); onClose(); router.replace('/login'); }); };
  const saveNickname = () => { void run(async () => {
    setNicknameMessage('');
    const result = await s.updateAccountNickname(nicknameDraft);
    if (!result.success) { setNicknameMessage(result.message || t('settings_failed')); return; }
    setEditingNickname(false); setNicknameMessage(t('nickname_saved'));
  }); };
  const resetGuest = () => { void run(async () => {
    if (useAppStore.getState().userId !== 'guest-local') return;
    const guestAccount = reminderAccount();
    // Reset only guest preferences; signed-in family accounts keep their settings.
    useReminderStore.setState(state => {
      const accounts = { ...state.accounts }; delete accounts[guestAccount];
      return { accounts };
    });
    await s.clearAllData(); await syncQuestReminders(); onClose(); router.replace('/login');
  }); };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings_title')}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('settings_close')} onPress={onClose} style={styles.iconButton}><X color="#aab8cf" size={24} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ gap: 22, paddingBottom: 12 }}>
          <View style={styles.profile}>
            <Image source={fighterImage(fighter.id, s.fighterOutfits[fighter.id])} style={{ width: 84, height: 84 }} contentFit="contain" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={2} style={styles.name}>{guest ? t('settings_guest') : personName(s.fullName, s.nickname, t('profile_champion'))}</Text>
              {!!s.nickname && !guest && !editingNickname && <View style={styles.nicknameRow}>
                <Text numberOfLines={1} style={[styles.meta, { flex: 1 }]}>@{s.nickname}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('nickname_edit')} style={styles.smallIcon}
                  onPress={() => { setNicknameDraft(s.nickname || ''); setNicknameMessage(''); setEditingNickname(true); }}>
                  <Pencil color="#ffc857" size={18} />
                </TouchableOpacity>
              </View>}
              {!guest && editingNickname && <View style={styles.nicknameEditor}>
                <TextInput value={nicknameDraft} onChangeText={setNicknameDraft} editable={!busy} autoCapitalize="none" autoCorrect={false}
                  maxLength={24} placeholder={t('nickname_placeholder_short')} placeholderTextColor="#72829b" accessibilityLabel={t('auth_field_nickname')}
                  style={styles.nicknameInput} onSubmitEditing={saveNickname} returnKeyType="done" />
                <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel={t('nickname_save')} style={styles.smallIcon} onPress={saveNickname}>
                  <Check color="#5ee6a8" size={21} />
                </TouchableOpacity>
              </View>}
              {!!nicknameMessage && <Text accessibilityLiveRegion="polite" style={styles.meta}>{nicknameMessage}</Text>}
              {!!s.userEmail && !guest && <Text numberOfLines={1} style={styles.meta}>{s.userEmail}</Text>}
              <Text style={styles.meta}>{t(s.role === 'parent' ? 'settings_parent' : 'settings_child')} · 🪙 {s.coins.toLocaleString(i18n.language)}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.row} onPress={() => go(s.role === 'parent' ? '/parent-dashboard' : '/link-account')}>
              <Users size={24} color="#ffc857" /><Text style={styles.rowText}>{t('settings_family')}</Text><ChevronRight color="#aab8cf" size={20} />
            </TouchableOpacity>
            {s.role !== 'parent' && s.linkedParents.map(name => <View key={name} style={styles.row}>
              <Text style={[styles.meta, { flex: 1 }]}>@{name}</Text>
              <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings_unlink', { name })} style={styles.iconButton}
                onPress={() => confirmAction(t('settings_unlink_confirm', { name }), () => { void run(async () => { if (!await s.removeParent(name)) throw Error('unlink'); }); })}>
                <Unlink color="#aab8cf" size={21} />
              </TouchableOpacity>
            </View>)}
            <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.row} onPress={() => go('/reminders')}>
              <Bell size={24} color="#ffc857" /><Text style={styles.rowText}>{t('notification_channel')}</Text><ChevronRight color="#aab8cf" size={20} />
            </TouchableOpacity>
          </View>
          {!guest && <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.row} onPress={() => go('/sync-recovery')}>
            <Archive size={24} color="#ffc857" /><Text style={styles.rowText}>{t('recovery_title')}</Text><ChevronRight color="#aab8cf" size={20} />
          </TouchableOpacity>}
          <View style={{ gap: 10 }}>
            <View style={styles.row}><Globe size={24} color="#aab8cf" /><Text style={styles.rowText}>{t('settings_language')}</Text></View>
            <LanguageSwitcher />
          </View>
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.meta}>{t('settings_failed')}</Text>}
          {busy && <Text accessibilityLiveRegion="polite" style={styles.meta}>{t('settings_wait')}</Text>}
          <View style={styles.section}>
            <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.row} onPress={leave}>
              <LogOut size={24} color="#aab8cf" /><Text style={styles.rowText}>{t(guest ? 'settings_leave_guest' : 'settings_logout')}</Text>
            </TouchableOpacity>
            {guest && <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.row} onPress={() => confirmAction(t('settings_reset_confirm'), resetGuest)}>
              <RotateCcw size={22} color="#aab8cf" /><Text style={styles.meta}>{t('settings_reset_guest')}</Text>
            </TouchableOpacity>}
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: '#0e1422', borderRadius: 22, padding: 20, width: '100%', maxWidth: 440, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { flex: 1, fontFamily: 'Nunito_900Black', color: '#f6f7fd', fontSize: 24 },
  name: { fontFamily: 'Nunito_800ExtraBold', color: '#f6f7fd', fontSize: 18 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  section: { borderTopWidth: 1, borderTopColor: '#2b3950', paddingTop: 10, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  rowText: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#f6f7fd' },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#aab8cf', flexShrink: 1 },
  iconButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  nicknameEditor: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  nicknameInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderColor: '#43516a', borderRadius: 12, paddingHorizontal: 12, color: '#f6f7fd', fontFamily: 'Nunito_700Bold', fontSize: 15 },
  smallIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
});
