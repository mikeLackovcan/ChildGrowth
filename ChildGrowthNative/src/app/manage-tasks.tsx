import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, BellRing, Check, ChevronLeft, Clock3, Network, Pencil, Plus, Timer, Trash2, Volume2, X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../lib/notifications';
import { Task, useAppStore } from '../store/useAppStore';

const CATEGORIES = [
  { icon: '📚', label: 'Homework', focus: 30 },
  { icon: '🪥', label: 'Brush teeth', focus: 2 },
  { icon: '🧸', label: 'Tidy toys' },
  { icon: '👕', label: 'Get dressed' },
  { icon: '🐶', label: 'Pet care' },
  { icon: '💖', label: 'Help someone' },
  { icon: '＋', label: 'My own' },
];
const REPEATS: Array<{ id: Task['freq']; label: string }> = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
];
const QUICK_TIMES = ['07:00', '15:00', '18:00', '20:00'];
const FOCUS_DURATIONS = [2, 10, 15, 30, 60, 120];

function normalizeTime(value: string): string {
  const [rawHour = '18', rawMinute = '00'] = value.split(':');
  const hour = Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function ManageTasksScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧹');
  const [frequency, setFrequency] = useState<Task['freq']>('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [reminderMode, setReminderMode] = useState<'notification' | 'alarm'>('notification');
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(15);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const setReminder = async (enabled: boolean) => {
    if (!enabled) {
      setReminderEnabled(false);
      return;
    }
    const granted = await requestNotificationPermissions();
    setReminderEnabled(granted);
  };

  const createQuest = () => {
    if (!name.trim()) return;
    const values = {
      name: name.trim(),
      icon,
      freq: frequency,
      diff: 'med',
      mystery: false,
      reminderEnabled,
      reminderTime: reminderEnabled ? normalizeTime(reminderTime) : undefined,
      reminderMode: reminderEnabled ? reminderMode : undefined,
      focusDurationMinutes: focusEnabled ? focusDurationMinutes : undefined,
      requiresApproval,
    } as const;
    if (editingId) updateTask(editingId, values);
    else addTask(values);
    setEditingId(null);
    setName('');
    router.back();
  };

  const editQuest = (task: Task) => {
    setEditingId(task.id);
    setName(task.name);
    setIcon(task.icon || '🧹');
    setFrequency(task.freq);
    setReminderEnabled(Boolean(task.reminderEnabled));
    setReminderTime(task.reminderTime || '18:00');
    setReminderMode(task.reminderMode || 'notification');
    setFocusEnabled(Boolean(task.focusDurationMinutes));
    setFocusDurationMinutes(task.focusDurationMinutes || 15);
    setRequiresApproval(Boolean(task.requiresApproval));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Back"><ChevronLeft size={24} color={Colors.text} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{editingId ? 'Edit quest' : 'New quest'}</Text>
          <Text style={styles.subtitle}>{editingId ? 'Update the quest, timer, or reminder.' : 'Choose a small win for today.'}</Text>
        </View>
        {editingId && <TouchableOpacity style={styles.back} onPress={() => { setEditingId(null); setName(''); }} accessibilityLabel="Cancel editing"><X size={22} color={Colors.textSecondary} /></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.mapLink} onPress={() => router.push('/quest-map' as never)}>
          <Network size={18} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mapLinkTitle}>Build a Quest Map</Text>
            <Text style={styles.mapLinkText}>Break a bigger goal into small steps</Text>
          </View>
          <ChevronLeft size={18} color={Colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <Text style={styles.label}>Quick quest</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((category) => {
            const selected = icon === category.icon || (category.label === 'My own' && icon === '⭐');
            return (
              <TouchableOpacity key={category.label} style={[styles.category, selected && styles.categorySelected]} onPress={() => {
                setIcon(category.icon === '＋' ? '⭐' : category.icon);
                setName(category.label === 'My own' ? '' : category.label);
                setFocusEnabled(Boolean(category.focus));
                if (category.focus) setFocusDurationMinutes(category.focus);
              }}>
                <Text style={styles.categoryEmoji}>{category.icon}</Text>
                <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Quest name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="E.g. Tidy my room" placeholderTextColor={Colors.textMuted} maxLength={80} />

        <Text style={styles.label}>Repeat</Text>
        <View style={styles.repeatRow}>
          {REPEATS.map((item) => {
            const selected = frequency === item.id;
            return (
              <TouchableOpacity key={item.id} style={[styles.repeatChip, selected && styles.repeatChipSelected]} onPress={() => setFrequency(item.id)}>
                <Text style={[styles.repeatText, selected && styles.repeatTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}><BellRing size={20} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.approvalTitle}>Alarm & notification</Text>
            <Text style={styles.approvalText}>A sound reminder at the quest time</Text>
          </View>
          <Switch value={reminderEnabled} onValueChange={setReminder} trackColor={{ false: '#D9E2EF', true: Colors.primary }} thumbColor="#FFFFFF" />
        </View>

        {reminderEnabled && (
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Reminder style</Text>
            <View style={styles.modeChoiceRow}>
              <TouchableOpacity style={[styles.modeChoice, reminderMode === 'notification' && styles.modeChoiceSelected]} onPress={() => setReminderMode('notification')}>
                <Bell size={17} color={reminderMode === 'notification' ? '#FFFFFF' : Colors.textSecondary} />
                <Text style={[styles.modeChoiceText, reminderMode === 'notification' && styles.modeChoiceTextSelected]}>Notification</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeChoice, reminderMode === 'alarm' && styles.modeChoiceSelected]} onPress={() => setReminderMode('alarm')}>
                <Volume2 size={17} color={reminderMode === 'alarm' ? '#FFFFFF' : Colors.textSecondary} />
                <Text style={[styles.modeChoiceText, reminderMode === 'alarm' && styles.modeChoiceTextSelected]}>Alarm</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeHeading}>
              <Clock3 size={18} color={Colors.textSecondary} />
              <Text style={styles.timeLabel}>Quest time</Text>
            </View>
            <TextInput
              style={styles.timeInput}
              value={reminderTime}
              onChangeText={setReminderTime}
              onBlur={() => setReminderTime(normalizeTime(reminderTime))}
              placeholder="18:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              accessibilityLabel="Quest reminder time"
            />
            <View style={styles.quickTimes}>
              {QUICK_TIMES.map((time) => (
                <TouchableOpacity key={time} style={[styles.timeChip, reminderTime === time && styles.timeChipSelected]} onPress={() => setReminderTime(time)}>
                  <Text style={[styles.timeChipText, reminderTime === time && styles.timeChipTextSelected]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.timeHint}>Uses your device time. Android may deliver within a short window to save battery.</Text>
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}><Timer size={20} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.approvalTitle}>Focus session</Text>
            <Text style={styles.approvalText}>A fun countdown with your hero</Text>
          </View>
          <Switch value={focusEnabled} onValueChange={setFocusEnabled} trackColor={{ false: '#D9E2EF', true: Colors.primary }} thumbColor="#FFFFFF" />
        </View>

        {focusEnabled && (
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Focus time</Text>
            <View style={styles.focusTimes}>
              {FOCUS_DURATIONS.map((minutes) => (
                <TouchableOpacity key={minutes} style={[styles.durationChip, focusDurationMinutes === minutes && styles.timeChipSelected]} onPress={() => setFocusDurationMinutes(minutes)}>
                  <Text style={[styles.timeChipText, focusDurationMinutes === minutes && styles.timeChipTextSelected]}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.approvalTitle}>Parent approval</Text>
            <Text style={styles.approvalText}>Optional for linked families</Text>
          </View>
          <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ false: '#D9E2EF', true: Colors.primary }} thumbColor="#FFFFFF" />
        </View>

        <View style={styles.tipRow}>
          <Check size={18} color={Colors.primary} />
          <Text style={styles.tipText}>Short, specific quests are easier to complete and more rewarding.</Text>
        </View>

        {tasks.length > 0 && (
          <View style={styles.existingSection}>
            <Text style={styles.existingTitle}>Current quests</Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.existingCard}>
                <Text style={styles.existingEmoji}>{task.icon || '✓'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.existingName}>{task.name}</Text>
                  <Text style={styles.existingMeta}>{task.freq === 'daily' ? 'Every day' : task.freq}{task.reminderEnabled && task.reminderTime ? `  ·  ${task.reminderMode === 'alarm' ? 'Alarm' : 'Notify'} ${task.reminderTime}` : ''}{task.focusDurationMinutes ? `  ·  Focus ${task.focusDurationMinutes}m` : ''}</Text>
                </View>
                <TouchableOpacity accessibilityLabel={`Edit ${task.name}`} style={styles.editButton} onPress={() => editQuest(task)}>
                  <Pencil size={17} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={`Delete ${task.name}`} style={styles.deleteButton} onPress={() => removeTask(task.id)}>
                  <Trash2 size={18} color={Colors.red} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.createButton, !name.trim() && styles.createButtonDisabled]} disabled={!name.trim()} onPress={createQuest}>
          <Plus size={21} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{editingId ? 'Save changes' : 'Create quest'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: Colors.background },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.text },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mapLinkTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.primary },
  mapLinkText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text, marginBottom: 9, marginTop: 16 },
  categories: { gap: 6, paddingRight: 20 },
  category: { width: 78, height: 82, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categorySelected: { backgroundColor: Colors.blueDim },
  categoryEmoji: { fontSize: 28, marginBottom: 7 },
  categoryLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: Colors.textSecondary },
  categoryLabelSelected: { color: Colors.primary },
  input: { minHeight: 56, borderWidth: 1.5, borderColor: Colors.border2, borderRadius: 16, backgroundColor: Colors.surface, paddingHorizontal: 16, fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text },
  repeatRow: { flexDirection: 'row', gap: 8 },
  repeatChip: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2, borderRadius: 14, backgroundColor: Colors.surface },
  repeatChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  repeatText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textSecondary },
  repeatTextSelected: { color: '#FFFFFF' },
  settingRow: { minHeight: 72, marginTop: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingIcon: { width: 38, height: 38, borderRadius: 19, marginRight: 11, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  approvalTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text },
  approvalText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  timeSection: { paddingLeft: 49, paddingTop: 10, paddingBottom: 8 },
  modeChoiceRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 14 },
  modeChoice: { minHeight: 42, flex: 1, borderRadius: 13, borderWidth: 1, borderColor: Colors.border2, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modeChoiceSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeChoiceText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: Colors.textSecondary },
  modeChoiceTextSelected: { color: '#FFFFFF' },
  timeHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  timeLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: Colors.textSecondary },
  timeInput: { width: 112, height: 48, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 15, fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: Colors.text, letterSpacing: 1.4 },
  quickTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  focusTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  durationChip: { minWidth: 68, height: 38, paddingHorizontal: 10, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  timeChip: { minWidth: 62, height: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  timeChipSelected: { backgroundColor: Colors.primary },
  timeChipText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: Colors.textSecondary },
  timeChipTextSelected: { color: '#FFFFFF' },
  timeHint: { marginTop: 8, fontFamily: 'Nunito_600SemiBold', fontSize: 11, lineHeight: 15, color: Colors.textMuted, paddingRight: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14 },
  tipText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 17, color: Colors.textSecondary },
  existingSection: { marginTop: 26 },
  existingTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 19, color: Colors.text, marginBottom: 10 },
  existingCard: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 },
  existingEmoji: { fontSize: 23, width: 42 },
  existingName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  existingMeta: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  deleteButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.redDim, alignItems: 'center', justifyContent: 'center' },
  editButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  createButton: { maxWidth: 580, width: '100%', alignSelf: 'center', minHeight: 56, borderRadius: 17, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createButtonDisabled: { opacity: 0.45 },
  createButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
});
