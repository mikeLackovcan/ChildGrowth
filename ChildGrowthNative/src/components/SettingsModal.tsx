import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import ActionSheet from './ActionSheet';
import LanguageSwitcher from './LanguageSwitcher';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { useExperienceSettings } from '../store/useExperienceSettings';
import { requestNotificationPermissions, scheduleTaskReminders } from '../lib/notifications';

export default function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const state = useAppStore();
  const preferences = useExperienceSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [unlink, setUnlink] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState('');
  const close = () => { setConfirmReset(false); setUnlink(null); onClose(); };
  return <ActionSheet visible={visible} title="Settings" onClose={close}>
    <Text style={styles.name}>{state.fullName || state.nickname || 'Hero'}</Text>
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.label}>App sounds</Text><Text style={styles.hint}>Celebrations and button sounds</Text></View>
      <Switch accessibilityLabel="App sounds" value={preferences.soundEnabled} onValueChange={preferences.setSoundEnabled} trackColor={{ false: '#CFD8E3', true: Colors.primary }} />
    </View>
    <View style={styles.row}>
      <View style={styles.copy}><Text style={styles.label}>Less movement</Text><Text style={styles.hint}>Keep your hero still</Text></View>
      <Switch accessibilityLabel="Less movement" value={preferences.reducedMotion} onValueChange={preferences.setReducedMotion} trackColor={{ false: '#CFD8E3', true: Colors.primary }} />
    </View>
    <Text style={styles.hint}>Reminder sounds follow your phone’s notification settings.</Text>
    {Platform.OS !== 'web' && <Pressable style={styles.link} accessibilityRole="button" onPress={async () => {
      const granted = await requestNotificationPermissions();
      setNotificationStatus(granted ? 'Notifications are allowed.' : 'Allow notifications in your phone settings.');
      if (granted && state.role !== 'parent') await scheduleTaskReminders(state.tasks, state.currentAvatar);
      if (!granted) await Linking.openSettings();
    }}><Text style={styles.linkText}>Allow phone reminders</Text></Pressable>}
    {notificationStatus ? <Text style={styles.hint}>{notificationStatus}</Text> : null}
    <View style={styles.row}><Text style={styles.label}>Language</Text><LanguageSwitcher /></View>
    <Pressable style={styles.link} accessibilityRole="button" onPress={() => { close(); router.push('/link-account'); }}><Text style={styles.linkText}>{state.linkedParents.length ? 'Family connection' : 'Connect with a parent'}</Text></Pressable>
    {state.linkedParents.map(parent => <View key={parent}>
      <Pressable style={styles.link} accessibilityRole="button" onPress={() => setUnlink(parent)}><Text style={styles.hint}>Connected to @{parent} · Manage</Text></Pressable>
      {unlink === parent && <>
        <Text style={styles.hint}>Disconnect from @{parent}? Shared updates will stop.</Text>
        <Pressable style={styles.link} accessibilityRole="button" onPress={() => { state.removeParent(parent); setUnlink(null); }}><Text style={styles.danger}>Disconnect parent</Text></Pressable>
        <Pressable style={styles.link} accessibilityRole="button" onPress={() => setUnlink(null)}><Text style={styles.linkText}>Keep connected</Text></Pressable>
      </>}
    </View>)}
    <Pressable style={styles.link} accessibilityRole="button" onPress={() => { close(); void state.logout(); }}><Text style={styles.linkText}>Sign out</Text></Pressable>
    {!confirmReset ? <Pressable style={styles.link} accessibilityRole="button" onPress={() => setConfirmReset(true)}><Text style={styles.danger}>Reset local data…</Text></Pressable> :
      <View style={{ gap: 12 }}>
        <Text style={styles.hint}>This removes this app’s saved data from this device. Cloud accounts are not deleted.</Text>
        <Pressable accessibilityRole="button" style={styles.link} onPress={async () => { await state.clearAllData(); close(); router.replace('/'); }}><Text style={styles.danger}>Yes, reset local data</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.link} onPress={() => setConfirmReset(false)}><Text style={styles.linkText}>Keep my data</Text></Pressable>
      </View>}
  </ActionSheet>;
}
const styles = StyleSheet.create({
  name: { fontSize: 20, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, gap: 12 },
  copy: { flex: 1 },
  label: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  hint: { fontSize: 13, lineHeight: 19, fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, marginTop: 3 },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: Colors.primary },
  danger: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#AF332A' },
});
