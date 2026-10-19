import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BellRing, Check, ChevronLeft, Clock3, Network, Plus, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../lib/notifications';
import { Task, useAppStore } from '../store/useAppStore';

const CATEGORIES = [
  { icon: '📚', label: 'Learning' },
  { icon: '🪥', label: 'Health' },
  { icon: '🧹', label: 'Home' },
  { icon: '⚽', label: 'Play' },
  { icon: '🐶', label: 'Pet care' },
  { icon: '💖', label: 'Kindness' },
];
const REPEATS: Array<{ id: Task['freq']; label: string }> = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
];
const QUICK_TIMES = ['07:00', '15:00', '18:00', '20:00'];

function normalizeTime(value: string): string {
  const [rawHour = '18', rawMinute = '00'] = value.split(':');
  const hour = Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function ManageTasksScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧹');
  const [frequency, setFrequency] = useState<Task['freq']>('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
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
    addTask({
      name: name.trim(),
      icon,
      freq: frequency,
      diff: 'med',
      mystery: false,
      reminderEnabled,
      reminderTime: reminderEnabled ? normalizeTime(reminderTime) : undefined,
      requiresApproval,
    });
    setName('');
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Back"><ChevronLeft size={24} color={Colors.text} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>New quest</Text>
          <Text style={styles.subtitle}>Choose a small win for today.</Text>
        </View>
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

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((category) => {
            const selected = icon === category.icon;
            return (
              <TouchableOpacity key={category.label} style={[styles.category, selected && styles.categorySelected]} onPress={() => { setIcon(category.icon); if (!name) setName(category.label === 'Home' ? 'Tidy my room' : category.label); }}>
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
                  <Text style={styles.existingMeta}>{task.freq === 'daily' ? 'Every day' : task.freq}{task.reminderEnabled && task.reminderTime ? `  ·  ${task.reminderTime}` : ''}</Text>
                </View>
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
          <Text style={styles.createButtonText}>Create quest</Text>
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
  timeHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  timeLabel: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: Colors.textSecondary },
  timeInput: { width: 112, height: 48, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 15, fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: Colors.text, letterSpacing: 1.4 },
  quickTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
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
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  createButton: { maxWidth: 580, width: '100%', alignSelf: 'center', minHeight: 56, borderRadius: 17, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createButtonDisabled: { opacity: 0.45 },
  createButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
});
