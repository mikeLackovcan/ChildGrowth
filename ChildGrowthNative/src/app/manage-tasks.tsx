import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Bell, ChevronLeft, Network, Repeat, Timer } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../lib/notifications';
import { Task, useAppStore } from '../store/useAppStore';

const TEMPLATES: Array<{ icon: string; name: string; minutes?: number }> = [
  { icon: '🪥', name: 'Brush teeth', minutes: 2 }, { icon: '📚', name: 'Homework', minutes: 15 },
  { icon: '🧸', name: 'Tidy toys' }, { icon: '📖', name: 'Read a book', minutes: 10 },
  { icon: '👕', name: 'Get dressed' }, { icon: '🎒', name: 'Pack my bag' },
  { icon: '🌱', name: 'Water plants' }, { icon: '💖', name: 'Help someone' },
  { icon: '＋', name: '' },
];
const REPEATS: Array<{ id: Task['freq']; name: string }> = [
  { id: 'daily', name: 'Every day' }, { id: 'weekdays', name: 'School days' }, { id: 'weekends', name: 'Weekends' },
];

export default function ManageTasksScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const state = useAppStore();
  const original = state.tasks.find(task => task.id === taskId);
  const [chosen, setChosen] = useState(Boolean(original));
  const [name, setName] = useState(original?.name || '');
  const [icon, setIcon] = useState(original?.icon || '⭐');
  const [frequency, setFrequency] = useState<Task['freq']>(original?.freq || 'daily');
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(original?.reminderEnabled));
  const [reminderTime, setReminderTime] = useState(original?.reminderTime || '18:00');
  const [reminderMode, setReminderMode] = useState<'notification' | 'alarm'>(original?.reminderMode || 'notification');
  const [focusEnabled, setFocusEnabled] = useState(Boolean(original?.focusDurationMinutes));
  const [minutes, setMinutes] = useState(original?.focusDurationMinutes || 15);
  const [requiresApproval, setRequiresApproval] = useState(Boolean(original?.requiresApproval));
  const [error, setError] = useState('');
  const canApprove = state.linkedParents.length > 0 || state.role === 'parent';

  const setReminder = async (enabled: boolean) => {
    if (!enabled) { setReminderEnabled(false); return; }
    if (Platform.OS === 'web' || state.role === 'parent') { setReminderEnabled(true); return; }
    const granted = await requestNotificationPermissions();
    setReminderEnabled(granted);
    if (!granted) setError('Allow notifications in your phone settings to receive reminders.');
  };
  const save = () => {
    if (!name.trim()) { setError('Give your quest a name.'); return; }
    if (reminderEnabled && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) { setError('Choose a time like 07:30 or 18:00.'); return; }
    const values = { name: name.trim(), icon, freq: frequency, diff: original?.diff || 'med', mystery: false,
      reminderEnabled, reminderTime: reminderEnabled ? reminderTime : undefined,
      reminderMode: reminderEnabled ? reminderMode : undefined,
      focusDurationMinutes: focusEnabled ? minutes : undefined, requiresApproval: canApprove && requiresApproval,
    } as const;
    if (taskId && !original) { setError('This quest was removed. Go back and create a new one.'); return; }
    if (original) state.updateTask(original.id, values);
    else state.addTask(values);
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  };
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.back} onPress={() => router.back()}><ChevronLeft color={Colors.text} size={24} /></Pressable>
        <Text style={styles.title}>{original ? 'Edit quest' : 'New quest'}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!chosen ? <>
          <Text style={styles.intro}>What will you do?</Text>
          <View style={styles.grid}>
            {TEMPLATES.map(template => <Pressable key={template.icon} accessibilityRole="button" accessibilityLabel={template.name || 'Create my own quest'} style={styles.template} onPress={() => {
              setName(template.name); setIcon(template.icon === '＋' ? '⭐' : template.icon);
              setFocusEnabled(Boolean(template.minutes)); setMinutes(template.minutes || 15); setChosen(true);
            }}><Text style={styles.templateIcon}>{template.icon}</Text>{template.name ? <Text style={styles.templateName}>{template.name}</Text> : null}</Pressable>)}
          </View>
        </> : <>
          <View style={styles.nameRow}>
            <Text style={styles.chosenIcon}>{icon}</Text>
            <TextInput style={styles.nameInput} accessibilityLabel="Quest name" placeholder="My quest" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={value => { setName(value); setError(''); }} maxLength={80} />
          </View>
          {!original && <Pressable style={styles.link} onPress={() => setChosen(false)} accessibilityRole="button"><Text style={styles.linkText}>Choose another picture</Text></Pressable>}
          <View style={styles.row}><Repeat color={Colors.primary} size={22} /><Text style={styles.rowTitle}>Repeat</Text></View>
          <View style={styles.choices}>
            {REPEATS.map(repeat => <Pressable accessibilityRole="button" accessibilityState={{ selected: frequency === repeat.id }} key={repeat.id} style={[styles.chip, frequency === repeat.id && styles.selected]} onPress={() => setFrequency(repeat.id)}><Text style={[styles.chipText, frequency === repeat.id && styles.selectedText]}>{repeat.name}</Text></Pressable>)}
            {!REPEATS.some(item => item.id === frequency) && <Text style={styles.hint}>Every {frequency}</Text>}
          </View>
          <View style={styles.row}><Bell color={Colors.primary} size={22} /><Text style={styles.rowTitle}>Remind me</Text><Switch accessibilityLabel="Remind me" value={reminderEnabled} onValueChange={setReminder} trackColor={{ false: '#CFD8E3', true: Colors.primary }} /></View>
          {reminderEnabled && <View style={styles.reveal}>
            <TextInput accessibilityLabel="Reminder time in 24-hour format" style={styles.time} value={reminderTime} onChangeText={setReminderTime} keyboardType="numbers-and-punctuation" maxLength={5} />
            <View style={styles.choices}>{(['notification', 'alarm'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: reminderMode === mode }} onPress={() => setReminderMode(mode)} style={[styles.chip, reminderMode === mode && styles.selected]}><Text style={[styles.chipText, reminderMode === mode && styles.selectedText]}>{mode === 'notification' ? '🔔 Notification' : '⏰ Alarm sound'}</Text></Pressable>)}</View>
            <Text style={styles.hint}>{Platform.OS === 'web' ? 'Preview only. Reminders are delivered by the Android app.' : reminderMode === 'alarm' ? 'A louder reminder. Your phone’s sound settings still apply.' : 'A gentle reminder with Start, Done and Later.'}</Text>
          </View>}
          <View style={styles.row}><Timer color={Colors.primary} size={22} /><Text style={styles.rowTitle}>Use a timer</Text><Switch accessibilityLabel="Use a timer" value={focusEnabled} onValueChange={setFocusEnabled} trackColor={{ false: '#CFD8E3', true: Colors.primary }} /></View>
          {focusEnabled && <View style={styles.reveal}><View style={styles.choices}>
            {[2, 10, 15, 30, 60, 120].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: minutes === value }} style={[styles.chip, minutes === value && styles.selected]} onPress={() => setMinutes(value)}><Text style={[styles.chipText, minutes === value && styles.selectedText]}>{value < 60 ? `${value} min` : `${value / 60} hr`}</Text></Pressable>)}
          </View><Text style={styles.hint}>A little sound when time is up.</Text></View>}
          {canApprove && <View style={styles.row}><Text style={styles.rowTitle}>Parent checks when done</Text><Switch accessibilityLabel="Parent checks when done" value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ false: '#CFD8E3', true: Colors.primary }} /></View>}
          <Pressable style={styles.mapLink} accessibilityRole="button" onPress={() => router.push('/quest-map')}><Network size={20} color={Colors.primary} /><Text style={styles.linkText}>Bigger goal? Make small steps</Text></Pressable>
        </>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </ScrollView>
      {chosen && <View style={styles.footer}><Pressable style={styles.save} onPress={save} accessibilityRole="button"><Text style={styles.saveText}>{original ? 'Save changes' : 'Add quest'}</Text></Pressable></View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 620, alignSelf: 'center', padding: 10 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 25 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24, paddingTop: 12 },
  intro: { fontFamily: 'Nunito_800ExtraBold', fontSize: 23, color: Colors.text, marginBottom: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  template: { width: '30%', minHeight: 116, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5FC', padding: 8, gap: 8 },
  templateIcon: { fontSize: 36, color: Colors.primary },
  templateName: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: Colors.text, textAlign: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  chosenIcon: { fontSize: 38 },
  nameInput: { flex: 1, minHeight: 60, borderBottomWidth: 2, borderColor: Colors.border, fontFamily: 'Nunito_800ExtraBold', fontSize: 23, color: Colors.text },
  link: { minHeight: 48, justifyContent: 'center', marginBottom: 10 },
  linkText: { color: Colors.primary, fontFamily: 'Nunito_800ExtraBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 72, gap: 12, borderTopWidth: 1, borderColor: '#E5EBF2', marginTop: 10 },
  rowTitle: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, minWidth: 64, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#F0F4FA', justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: Colors.primary },
  chipText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.text },
  selectedText: { color: '#FFFFFF' },
  reveal: { gap: 12, paddingBottom: 6 },
  time: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: Colors.text, borderBottomWidth: 1, borderColor: Colors.border, width: 120, minHeight: 56 },
  hint: { color: Colors.textSecondary, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 19 },
  mapLink: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 56, marginTop: 20 },
  error: { color: '#AF332A', fontFamily: 'Nunito_700Bold', fontSize: 15, marginTop: 14 },
  footer: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 12 },
  save: { minHeight: 56, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 17 },
});
