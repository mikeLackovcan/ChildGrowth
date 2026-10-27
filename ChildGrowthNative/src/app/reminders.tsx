import { questDevice } from '../lib/questDevice';
import TimeWheel from '../components/questblox/TimeWheel';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Text, View, Switch, Platform, Linking } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Screen, Button, ui, palette } from '../components/questblox/UI';
import { useAppStore } from '../store/useAppStore';
import { useReminderStore, defaultReminders } from '../store/useReminderStore';
import { requestNotificationPermissions, syncQuestReminders, testQuestReminder, testQuestAlarm } from '../lib/notifications';
import { validReminderTime } from '../utils/reminderPlan';
import { syncFamilyPushDevice } from '../lib/pushDevices';
export default function RemindersScreen() {
  const uid = useAppStore(s => s.userId);
  const hydrated = useReminderStore(state => state.hydrated);
  return <AccountReminders key={`${uid || 'signed-out'}:${hydrated}`} />;
}
function AccountReminders() {
  const { t } = useTranslation();
  const account = useAppStore(s => s.userEmail?.toLowerCase() || '');
  const role = useAppStore(s => s.role);
  const uid = useAppStore(s => s.userId);
  const language = useAppStore(s => s.language);
  const state = useReminderStore();
  const saved = state.accounts[account] || defaultReminders;
  const [time, setTime] = useState(saved.time);
  const [sound, setSound] = useState(saved.sound);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sameAccount = () => useAppStore.getState().userId === uid && useAppStore.getState().userEmail?.toLowerCase() === account;
  const supported = Platform.OS !== 'web' && role === 'child' && !!account;
  async function enable() {
    if (!validReminderTime(time)) { setMessage(t('reminder_time_error')); return; }
    setBusy(true); setMessage('');
    try {
      if (!await requestNotificationPermissions()) { setMessage(t('notification_blocked')); return; }
      if (!sameAccount()) return;
      state.update(account, { enabled: true, time, sound });
      await syncQuestReminders();
    } catch { setMessage(t('notification_retry')); }
    finally { setBusy(false); }
  }
  if (!account) return <Redirect href="/login" />;
  return <Screen>
    <Button secondary label={t('action_back')} onPress={() => router.back()} />
    <Text style={{ fontSize: 52 }}>🔔</Text><Text style={ui.title}>{t('notifications_title')}</Text>
    {role === 'child' && <Text style={ui.text}>{t('reminder_subtitle')}</Text>}
    {Platform.OS === 'web' && <Text style={ui.meta}>{t('notification_native')}</Text>}
    <Text style={ui.heading}>{t('push_channel')}</Text>
    <Text style={ui.meta}>{t('push_description')}</Text>
    {uid === 'guest-local' && <Text style={ui.meta}>{t('push_sign_in')}</Text>}
    <Button label={t(saved.familyAlerts ? 'push_disable' : 'push_enable')} disabled={Platform.OS === 'web' || busy || !state.hydrated || !uid || uid === 'guest-local'} onPress={async () => {
      const enabled = !saved.familyAlerts;
      setBusy(true); setMessage('');
      try {
        if (enabled && !await requestNotificationPermissions()) { setMessage(t('notification_blocked')); return; }
        if (!sameAccount()) return;
        state.update(account, { familyAlerts: enabled, sound });
        const pushStatus = await syncFamilyPushDevice(uid, language, enabled, sound, true);
        if (sameAccount()) useReminderStore.setState({ pushStatus });
      } catch { if (sameAccount()) useReminderStore.setState({ pushStatus: 'push_retry' }); }
      finally { setBusy(false); }
    }} />
    {!!state.pushStatus && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t(state.pushStatus)}</Text>}
    {role === 'parent' && !!message && <Text accessibilityLiveRegion="polite" style={ui.meta}>{message}</Text>}
    {state.pushStatus === 'push_retry' && <Button secondary disabled={busy} label={t('sync_retry')} onPress={async () => {
      setBusy(true);
      try {
        const pushStatus = await syncFamilyPushDevice(uid, language, !!saved.familyAlerts, sound, true);
        if (sameAccount()) useReminderStore.setState({ pushStatus });
      } catch { if (sameAccount()) useReminderStore.setState({ pushStatus: 'push_retry' }); }
      finally { setBusy(false); }
    }} />}
    {role === 'child' && <>
    <Text style={ui.meta}>{t('alarm_per_quest')}</Text>
    {!!questDevice && <><Text style={ui.meta}>{t('alarm_description')}</Text><Button secondary label={t('alarm_allow')} onPress={async () => {
      try { await questDevice?.alarmSettings(); setMessage(t('alarm_permission_return')); } catch { setMessage(t('notification_retry')); }
    }} /></>}
    <Text style={ui.heading}>{t('reminder_time')}</Text>
    <TimeWheel disabled={!state.hydrated || busy} label={t('reminder_time')} value={time} onChange={setTime} />
    <Text style={ui.meta}>{t('reminder_hours')}</Text>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.text}>{t('reminder_sound')}</Text><Switch disabled={!state.hydrated || busy} accessibilityLabel={t('reminder_sound')} value={sound} onValueChange={value => { setSound(value); state.update(account, { sound: value }); }} /></View>
    <Button label={busy ? t('reminder_saving') : saved.enabled ? t('reminder_save') : t('reminder_enable')} disabled={!supported || busy || !state.hydrated} onPress={enable} />
    {saved.enabled && <Button secondary label={t('reminder_disable')} disabled={busy} onPress={() => { state.update(account, { enabled: false }); setMessage(t('reminder_off')); void syncQuestReminders(); }} />}
    <Text accessibilityLiveRegion="polite" style={ui.meta}>{message || state.status}</Text>
    <Button secondary label={t('reminder_test')} disabled={!supported || busy} onPress={async () => { setBusy(true); try { await testQuestReminder(); setMessage(t('reminder_test_sent')); } catch (e) { setMessage(t('notification_retry'));  } finally { setBusy(false); } }} />
    {!!questDevice && <Button secondary label={t('alarm_test')} disabled={!supported || busy} onPress={async () => {
      setBusy(true); try { await testQuestAlarm(); setMessage(t('reminder_test_sent')); } catch { setMessage(t('alarm_test_error')); } finally { setBusy(false); }
    }} />}
    </>}
    {role === 'parent' && <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.text}>{t('reminder_sound')}</Text><Switch disabled={!state.hydrated || busy} accessibilityLabel={t('reminder_sound')} value={sound} onValueChange={value => { setSound(value); state.update(account, { sound: value }); }} /></View>}
    {Platform.OS !== 'web' && <Button secondary label={t('reminder_settings')} onPress={() => { void Linking.openSettings(); }} />}
    <Text style={ui.meta}>{t('reminder_details')}</Text>
  </Screen>;
}
