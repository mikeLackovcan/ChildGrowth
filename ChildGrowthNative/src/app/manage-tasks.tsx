import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { useAppStore, Task } from '../store/useAppStore';
import { ChevronLeft, Plus, Trash2, Edit2, Check, Calendar, CheckCircle2, Circle } from 'lucide-react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';

const FREQUENCY_OPTIONS: { id: Task['freq']; key: string; label: string }[] = [
  { id: 'daily', key: 'freq_daily', label: 'Everyday 🔄' },
  { id: 'monday', key: 'freq_monday', label: 'Mondays 📅' },
  { id: 'tuesday', key: 'freq_tuesday', label: 'Tuesdays 📅' },
  { id: 'wednesday', key: 'freq_wednesday', label: 'Wednesdays 📅' },
  { id: 'thursday', key: 'freq_thursday', label: 'Thursdays 📅' },
  { id: 'friday', key: 'freq_friday', label: 'Fridays 📅' },
  { id: 'saturday', key: 'freq_saturday', label: 'Saturdays 📅' },
  { id: 'sunday', key: 'freq_sunday', label: 'Sundays 📅' },
  { id: 'weekdays', key: 'freq_weekdays', label: 'Weekdays 🎒' },
  { id: 'weekends', key: 'freq_weekends', label: 'Weekends 🎈' },
];

const HABIT_ICONS = [
  { icon: '🪥', key: 'habit_brush_teeth', label: 'Brushing Teeth' },
  { icon: '📚', key: 'habit_reading', label: 'Reading & Learning' },
  { icon: '🧹', key: 'habit_cleaning', label: 'Cleaning & Tidying' },
  { icon: '🥦', key: 'habit_eating', label: 'Healthy Eating' },
  { icon: '🌙', key: 'habit_sleep', label: 'Sleep & Bedtime' },
  { icon: '⚽', key: 'habit_sports', label: 'Sports & Fitness' },
  { icon: '🧠', key: 'habit_homework', label: 'Homework & Math' },
  { icon: '🎹', key: 'habit_music', label: 'Music Practice' },
  { icon: '🐶', key: 'habit_pet', label: 'Pet Care' },
  { icon: '💖', key: 'habit_kindness', label: 'Kindness & Help' },
  { icon: '🛁', key: 'habit_bath', label: 'Bath & Hygiene' },
  { icon: '💧', key: 'habit_water', label: 'Drink Water' },
];

export default function ManageTasksScreen() {
  const { t } = useTranslation();
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);

  const [newTaskName, setNewTaskName] = useState('');
  const [selectedFreq, setSelectedFreq] = useState<Task['freq']>('daily');
  const [selectedIcon, setSelectedIcon] = useState<string>('🪥');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const handleAddTask = () => {
    if (newTaskName.trim().length === 0) return;
    addTask({
      name: newTaskName.trim(),
      diff: 'med',
      freq: selectedFreq,
      mystery: false,
      icon: selectedIcon,
      requiresApproval: requiresApproval,
    });
    setNewTaskName('');
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingTaskId(id);
    setEditingTaskName(currentName);
  };

  const saveEdit = () => {
    if (editingTaskId && editingTaskName.trim().length > 0) {
      updateTask(editingTaskId, { name: editingTaskName.trim() });
    }
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const getFreqLabel = (freq: Task['freq']) => {
    const found = FREQUENCY_OPTIONS.find((f) => f.id === freq);
    return found ? t(found.key) : t('freq_daily');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { flex: 1 }]}>{t('manage_quests_title')}</Text>
          <LanguageSwitcher />
        </View>

        {/* Add Quest Section */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('create_new_quest')}</Text>
          <View style={styles.addCard}>
            <Text style={styles.labelSub}>{t('select_habit_icon')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.freqScroll} contentContainerStyle={{ gap: 8 }}>
              {HABIT_ICONS.map((item) => (
                <TouchableOpacity
                  key={item.icon}
                  style={[
                    styles.freqPill,
                    { flexDirection: 'row', alignItems: 'center', gap: 6 },
                    selectedIcon === item.icon && styles.freqPillActive
                  ]}
                  onPress={() => {
                    setSelectedIcon(item.icon);
                    if (!newTaskName.trim()) {
                      setNewTaskName(t(item.key));
                    }
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  <Text style={[styles.freqPillText, selectedIcon === item.icon && styles.freqPillTextActive]}>
                    {t(item.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.labelSub}>{t('quest_name_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. Brush Teeth 🪥"
              placeholderTextColor={Colors.textMuted}
              value={newTaskName}
              onChangeText={setNewTaskName}
            />

            <Text style={styles.labelSub}>{t('repeat_schedule_on')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.freqScroll} contentContainerStyle={{ gap: 8 }}>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.freqPill,
                    selectedFreq === option.id && styles.freqPillActive
                  ]}
                  onPress={() => setSelectedFreq(option.id)}
                >
                  <Text style={[styles.freqPillText, selectedFreq === option.id && styles.freqPillTextActive]}>
                    {t(option.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Verification Toggle */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: requiresApproval ? Colors.purpleDim : Colors.surface2, borderWidth: 1, borderColor: requiresApproval ? Colors.purple : Colors.border2, borderRadius: 12, padding: 12, marginBottom: 12 }}
              onPress={() => setRequiresApproval(!requiresApproval)}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: requiresApproval ? Colors.purple : Colors.border2, backgroundColor: requiresApproval ? Colors.purple : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {requiresApproval && <Check size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: requiresApproval ? Colors.purple : Colors.text, fontSize: 13 }}>
                  Requires Parent Approval 📸
                </Text>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 11 }}>
                  Kid must submit for parent review before receiving XP & Coins
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.addButtonText}>{t('add_quest_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Quests Section */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>{t('active_quests')} ({tasks.length})</Text>
          {tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_quests_yet')}</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                {editingTaskId === task.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editingTaskName}
                      onChangeText={setEditingTaskName}
                      autoFocus
                    />
                    <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                      <Check size={18} color="#121212" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.taskRow}>
                    <TouchableOpacity 
                      style={[styles.statusToggleBtn, task.done && styles.statusToggleBtnDone]} 
                      onPress={() => toggleTaskDone(task.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {task.done ? (
                        <CheckCircle2 size={24} color={Colors.green} />
                      ) : (
                        <Circle size={24} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.iconBox}>
                        <Text style={{ fontSize: 22 }}>{task.icon || '⭐'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskName, task.done && styles.taskNameDone]}>{task.name}</Text>
                        <View style={styles.badgeRow}>
                          <Calendar size={12} color={Colors.red} />
                          <Text style={styles.freqBadgeText}>{getFreqLabel(task.freq || 'daily')}</Text>
                          <Text style={[styles.statusBadgeText, { color: task.done ? Colors.green : Colors.amber }]}>
                            • {task.done ? 'DONE ✅' : 'PENDING ⏳'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => startEditing(task.id, task.name)}
                      >
                        <Edit2 size={16} color={Colors.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: Colors.redDim }]} 
                        onPress={() => removeTask(task.id)}
                      >
                        <Trash2 size={16} color={Colors.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 18,
    paddingBottom: 60,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  secTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  addCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    height: 46,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    marginBottom: 14,
  },
  labelSub: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  freqScroll: {
    marginBottom: 14,
  },
  freqPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  freqPillActive: {
    backgroundColor: Colors.redDim,
    borderColor: Colors.red,
  },
  freqPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  freqPillTextActive: {
    color: Colors.red,
    fontFamily: 'Nunito_800ExtraBold',
  },
  addButton: {
    backgroundColor: Colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.textMuted,
  },
  taskCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freqBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.red,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleBtn: {
    paddingRight: 8,
  },
  statusToggleBtnDone: {
    opacity: 0.9,
  },
  taskNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  statusBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
