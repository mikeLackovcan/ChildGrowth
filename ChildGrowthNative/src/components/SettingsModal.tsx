import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import ActionSheet from './ActionSheet';
import LanguageSwitcher from './LanguageSwitcher';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { useExperienceSettings } from '../store/useExperienceSettings';
import { requestNotificationPermissions, scheduleTaskReminders, testQuestReminder } from '../lib/notifications';
import { disconnectManagedDevice } from '../lib/disconnectManagedDevice';
import { listManagedGuardians } from '../lib/devicePairing';

export default function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [testingReminder, setTestingReminder] = useState(false);
  const state = useAppStore();
  const preferences = useExperienceSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [unlink, setUnlink] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState('');
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  useEffect(() => {
    if (!visible || state.deviceConnection !== 'linked' || !state.userId) return;
    void listManagedGuardians(state.userId).then(guardians => {
      const names = guardians.map(item => item.parent_name);
      if (names.length) useAppStore.setState({ linkedParents: names, parentEmail: names[0], approvalStatus: 'approved' });
    }).catch(() => {});
  }, [visible, state.deviceConnection, state.userId]);
  const close = () => { setConfirmReset(false); setConfirmDelete(false); setDeleteStatus(''); setUnlink(null); onClose(); };
  return <ActionSheet visible={visible} title={t('settings_title')} onClose={close}>
    <Text style={styles.name}>{state.fullName || state.nickname || t('hero_fallback')}</Text>
    <Pressable style={styles.familyAction} accessibilityRole="button" onPress={() => { close(); router.push('/link-account'); }}>
      <View style={styles.copy}>
        <Text style={styles.familyTitle}>{t(state.deviceConnection === 'linked' ? 'guardian_child_title' : 'family_code_action')}</Text>
        <Text style={styles.familyHint}>{state.deviceConnection === 'linked'
          ? t('guardian_connected_count', { count: Math.max(1, state.linkedParents.length) })
          : t('family_code_hint')}</Text>
      </View>
      <Text style={styles.familyArrow}>›</Text>
    </Pressable>
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.label}>{t('sounds_label')}</Text><Text style={styles.hint}>{t('sounds_hint')}</Text></View>
      <Switch accessibilityLabel={t('sounds_label')} value={preferences.soundEnabled} onValueChange={preferences.setSoundEnabled} trackColor={{ false: '#CFD8E3', true: Colors.primary }} />
    </View>
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.label}>{t('motion_label')}</Text><Text style={styles.hint}>{t('motion_hint')}</Text></View>
      <Switch accessibilityLabel={t('motion_label')} value={preferences.reducedMotion} onValueChange={preferences.setReducedMotion} trackColor={{ false: '#CFD8E3', true: Colors.primary }} />
    </View>
    <Text style={styles.hint}>{t('notification_settings_hint')}</Text>
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.label}>{t('simple_view')}</Text><Text style={styles.hint}>{t('simple_view_hint')}</Text></View>
      <Switch accessibilityLabel={t('simple_view')} value={preferences.simpleView} onValueChange={preferences.setSimpleView} />
    </View>
    {Platform.OS !== 'web' && <Pressable style={styles.link} accessibilityRole="button" onPress={async () => {
      const granted = await requestNotificationPermissions();
      setNotificationStatus(granted ? t('notification_allowed') : t('notification_denied'));
      if (granted && state.role !== 'parent') await scheduleTaskReminders(state.tasks, state.currentAvatar);
      if (!granted) await Linking.openSettings();
    }}><Text style={styles.linkText}>{t('notification_enable')}</Text></Pressable>}
    <Pressable style={styles.link} accessibilityRole="button" disabled={testingReminder} onPress={async () => {
      setTestingReminder(true);
      try {
        const result = await testQuestReminder(state.currentAvatar);
        setNotificationStatus(t(result === 'scheduled' ? 'notification_test_sent' : result === 'denied' ? 'notification_denied' : 'notification_web'));
      } catch {
        setNotificationStatus(t('notification_test_failed'));
      } finally {
        setTestingReminder(false);
      }
    }}><Text style={styles.linkText}>{t(testingReminder ? 'processing' : 'notification_test')}</Text></Pressable>
    {notificationStatus ? <Text style={styles.hint}>{notificationStatus}</Text> : null}
    <View style={[styles.row, { flexWrap: 'wrap', gap: 12 }]}><Text style={styles.label}>{t('language_label')}</Text><LanguageSwitcher /></View>
    <Pressable style={styles.link} accessibilityRole="link" onPress={() => { close(); router.push('/privacy'); }}><Text style={styles.linkText}>{t('privacy_label')}</Text></Pressable>
    <Pressable style={styles.link} accessibilityRole="link" onPress={() => { close(); router.push('/support'); }}><Text style={styles.linkText}>{t('support_label')}</Text></Pressable>
    {state.deviceConnection === 'local' && <Text style={styles.hint}>{t('device_local')}</Text>}
    {state.deviceConnection === 'linked' && <>
      {!confirmDisconnect ? <Pressable accessibilityRole="button" style={styles.link} disabled={deviceBusy}
        onPress={() => setConfirmDisconnect(true)}><Text style={styles.linkText}>{t('device_disconnect')}</Text></Pressable> : <>
        <Text style={styles.hint}>{t('device_disconnect_hint')}</Text>
        <Pressable accessibilityRole="button" style={styles.link} disabled={deviceBusy} onPress={async () => {
          setDeviceBusy(true); setDeviceError(false);
          try { await disconnectManagedDevice(); setConfirmDisconnect(false); }
          catch { setDeviceError(true); }
          finally { setDeviceBusy(false); }
        }}><Text style={styles.danger}>{t(deviceBusy ? 'processing' : 'device_disconnect_confirm')}</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.link} disabled={deviceBusy}
          onPress={() => setConfirmDisconnect(false)}><Text style={styles.linkText}>{t('keep_connected')}</Text></Pressable>
      </>}
    </>}
    {!state.deviceConnection && state.linkedParents.map(parent => <View key={parent}>
      <Pressable style={styles.link} accessibilityRole="button" onPress={() => setUnlink(parent)}><Text style={styles.hint}>{t('connected_manage', { parent })}</Text></Pressable>
      {unlink === parent && <>
        <Text style={styles.hint}>{t('disconnect_prompt', { parent })}</Text>
        <Pressable style={styles.link} accessibilityRole="button" onPress={() => { state.removeParent(parent); setUnlink(null); }}><Text style={styles.danger}>{t('disconnect_parent')}</Text></Pressable>
        <Pressable style={styles.link} accessibilityRole="button" onPress={() => setUnlink(null)}><Text style={styles.linkText}>{t('keep_connected')}</Text></Pressable>
      </>}
    </View>)}
    {deviceError && <Text accessibilityRole="alert" style={styles.danger}>{t('device_disconnect_failed')}</Text>}
    <Pressable style={styles.link} accessibilityRole="button" disabled={deviceBusy} onPress={async () => {
      setDeviceBusy(true); setDeviceError(false);
      try { await state.logout(); close(); router.replace('/'); }
      catch { setDeviceError(true); }
      finally { setDeviceBusy(false); }
    }}><Text style={styles.linkText}>{t('sign_out')}</Text></Pressable>
    {!confirmReset ? <Pressable style={styles.link} accessibilityRole="button" onPress={() => setConfirmReset(true)}><Text style={styles.danger}>{t('reset_local')}</Text></Pressable> :
      <View style={{ gap: 12 }}>
        <Text style={styles.hint}>{t('reset_local_hint')}</Text>
        <Pressable accessibilityRole="button" style={styles.link} disabled={deviceBusy} onPress={async () => {
          setDeviceBusy(true); setDeviceError(false);
          try {
            if (state.deviceConnection === 'linked') await disconnectManagedDevice();
            await state.clearAllData(); close(); router.replace('/');
          } catch { setDeviceError(true); }
          finally { setDeviceBusy(false); }
        }}><Text style={styles.danger}>{t('reset_local_yes')}</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.link} onPress={() => setConfirmReset(false)}><Text style={styles.linkText}>{t('keep_data')}</Text></Pressable>
      </View>}
    {!state.deviceConnection && state.userId && state.userId !== 'guest-local' && (!confirmDelete ?
      <Pressable style={styles.link} accessibilityRole="button" onPress={() => { setDeleteStatus(''); setConfirmDelete(true); }}><Text style={styles.danger}>{t('delete_account')}</Text></Pressable> :
      <View style={{ gap: 12 }}>
        <Text style={styles.hint}>{t('delete_account_hint')}</Text>
        <Pressable accessibilityRole="button" style={styles.link} onPress={async () => {
          setDeleteStatus(t('deleting'));
          const result = await state.deleteAccount();
          if (!result.success) { setDeleteStatus(result.message || t('delete_failed')); return; }
          close();
          router.replace('/');
        }}><Text style={styles.danger}>{t('delete_account_yes')}</Text></Pressable>
        {deleteStatus ? <Text style={styles.hint}>{deleteStatus}</Text> : null}
        <Pressable accessibilityRole="button" style={styles.link} onPress={() => { setConfirmDelete(false); setDeleteStatus(''); }}><Text style={styles.linkText}>{t('keep_account')}</Text></Pressable>
      </View>)}
  </ActionSheet>;
}
const styles = StyleSheet.create({
  name: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  familyAction: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.blueDim, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  familyTitle: { fontSize: 17, lineHeight: 23, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  familyHint: { fontSize: 14, lineHeight: 20, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, marginTop: 2 },
  familyArrow: { fontSize: 30, color: Colors.primary, fontFamily: 'Nunito_700Bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, gap: 12 },
  copy: { flex: 1 },
  label: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  hint: { fontSize: 15, lineHeight: 22, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, marginTop: 3 },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: Colors.primary },
  danger: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#AF332A' },
});
