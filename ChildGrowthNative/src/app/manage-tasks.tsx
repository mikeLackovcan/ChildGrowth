import QuestAlertChoice from '../components/questblox/QuestAlertChoice';
import TaskMicrophone from '../components/questblox/TaskMicrophone';
import { SafeAreaView } from 'react-native-safe-area-context';
import TimeWheel from '../components/questblox/TimeWheel';
import { canManageQuest } from '../utils/accountState';
import { confirmAction, showMessage } from '../lib/dialogs';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, KeyboardAvoidingView, Platform, Modal, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { validReminderTime } from '../utils/reminderPlan';
import { Colors } from '../constants/theme';
import { useAppStore, Task } from '../store/useAppStore';
import { ChevronLeft, X, Plus, Trash2, Edit2, Check, Calendar, CheckCircle2, Circle, ChevronDown } from 'lucide-react-native';
import { personName } from '../utils/displayName';

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
  { icon: '👩‍👧', key: 'habit_mum_quest', label: 'Mum quest' },
  { icon: '👨‍👦', key: 'habit_dad_quest', label: 'Dad quest' },
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
  const role = useAppStore(s => s.role);
  const linkedParents = useAppStore(s => s.linkedParents);
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 430 && fontScale < 1.3 ? 3 : 2;
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const children = useAppStore((state) => state.children);
  const selectedChildId = useAppStore((state) => state.selectedChildId);

  const approvedChildren = children.filter((c) => c.isApproved === true);
  const activeChild = approvedChildren.find((c) => c.id === selectedChildId) || approvedChildren[0] || children[0];
  const childDisplayName = activeChild ? personName(activeChild.name, activeChild.nickname, t('settings_child')) : undefined;

  const [reminderTime, setReminderTime] = useState('');
  const [reminderMode, setReminderMode] = useState<'notification' | 'alarm'>('notification');
  const [editingReminderMode, setEditingReminderMode] = useState<'notification' | 'alarm'>('notification');
  const [voiceMessage, setVoiceMessage] = useState('');
  const [editingReminderTime, setEditingReminderTime] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [showPictures, setShowPictures] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdQuest, setCreatedQuest] = useState<{ name: string; icon: string } | null>(null);
  const [selectedFreq, setSelectedFreq] = useState<Task['freq']>('daily');
  const [selectedIcon, setSelectedIcon] = useState<string>('🪥');
  const [editingRevision, setEditingRevision] = useState<string | number>(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [canPostpone, setCanPostpone] = useState(false);

  const handleAddTask = () => {
    if (newTaskName.trim().length === 0) return;
    if (reminderTime && !validReminderTime(reminderTime)) { setReminderError(t('reminder_time_error')); return; }
    setReminderError('');
    const previousCount = useAppStore.getState().tasks.length;
    addTask({
      reminderTime, reminderMode,
      name: newTaskName.trim(),
      diff: 'med',
      freq: selectedFreq,
      mystery: false,
      icon: selectedIcon,
      requiresApproval: requiresApproval,
      isRolling: isRolling,
      canPostpone: canPostpone,
    });
    if (useAppStore.getState().tasks.length === previousCount) { setReminderError(t('quest_create_retry')); return; }
    setCreated(true); setShowPictures(true);
    Keyboard.dismiss();
    setCreatedQuest({ name: newTaskName.trim(), icon: selectedIcon });
    setNewTaskName('');
    setIsRolling(false);
    setCanPostpone(false);
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingReminderMode(tasks.find(task => task.id === id)?.reminderMode || 'notification');
    setEditingReminderTime(tasks.find(task => task.id === id)?.reminderTime || '');
    setEditingRevision(tasks.find(task => task.id === id)?.revision ?? 0);
    setEditingTaskId(id);
    setEditingTaskName(currentName);
  };

  const saveEdit = () => {
    if (editingReminderTime && !validReminderTime(editingReminderTime)) { setReminderError(t('reminder_time_error')); return; }
    setReminderError('');
    if (editingTaskId && editingTaskName.trim().length > 0) {
      if (!updateTask(editingTaskId, { name: editingTaskName.trim(), reminderTime: editingReminderTime, reminderMode: editingReminderMode }, editingRevision)) {
        showMessage(t('quest_edit_changed')); return;
      }
    }
    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const getFreqLabel = (freq: Task['freq']) => {
    const found = FREQUENCY_OPTIONS.find((f) => f.id === freq);
    return found ? t(found.key) : t('freq_daily');
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardLayer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('action_back')} testID="manage-tasks-back-btn" onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { flex: 1, flexShrink: 1, minWidth: 0 }]}>
            {childDisplayName
              ? t('manage_quests_for', `Manage Quests for ${childDisplayName}`, { name: childDisplayName })
              : t('manage_quests_title', 'Manage Quests 📋')}
          </Text>
        </View>

        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/reminders')} style={{ paddingVertical: 12 }}><Text style={{ color: Colors.amber }}>🔔 {t('notifications_title')}</Text></TouchableOpacity>
        {!!reminderError && <Text accessibilityLiveRegion="polite" style={{ color: Colors.amber }}>{reminderError}</Text>}
        {/* Add Quest Section */}
        <View style={styles.section}>
            <Text style={styles.stepTitle}>{t('quest_name_label')}</Text>
            <View style={styles.nameField}>
            <TextInput
              testID="quest-name-input"
              style={styles.nameInput}
              accessibilityLabel={t('quest_name_label')} placeholder={t('quest_name_example')}
              placeholderTextColor={Colors.textMuted}
              maxLength={100}
              value={newTaskName}
              onChangeText={setNewTaskName}
            />
            <TaskMicrophone onResult={setNewTaskName} onStatus={setVoiceMessage} />
            </View>
            {!!voiceMessage && <Text accessibilityLiveRegion="polite" style={styles.labelSub}>{voiceMessage}</Text>}

          <Text accessibilityRole="header" style={styles.stepTitle}>{t('quest_choose_picture')}</Text>
          {created && <Text accessibilityLiveRegion="polite" style={styles.labelSub}>✓ {t('quest_created_local')}</Text>}
          <View style={styles.addCard}>
            {!showPictures && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('quest_change_picture')} onPress={() => setShowPictures(true)} style={styles.selectedPicture}><Text style={{ fontSize: 64 }}>{selectedIcon}</Text><Text style={[styles.habitLabel, { flex: 1 }]}>{newTaskName}</Text><Edit2 size={24} color={Colors.amber} /></TouchableOpacity>}
            {showPictures && <View accessibilityRole="radiogroup" accessibilityLabel={t('quest_choose_picture')} style={styles.habitGrid}>
              {HABIT_ICONS.map((item) => (
                <TouchableOpacity
                  key={item.icon} accessibilityRole="radio" accessibilityLabel={t(item.key)} accessibilityState={{ checked: selectedIcon === item.icon }} aria-checked={selectedIcon === item.icon}
                  style={[
                    styles.habitTile,
                    { width: columns === 3 ? '31%' : '48%' },
                    selectedIcon === item.icon && styles.freqPillActive
                  ]}
                  onPress={() => {
                    setSelectedIcon(item.icon); setShowPictures(false); setCreated(false);
                    if (!newTaskName.trim() || HABIT_ICONS.some(habit => newTaskName === t(`${habit.key}_short`) )) {
                      setNewTaskName(t(`${item.key}_short`));
                    }
                  }}
                >
                  <Text style={{ fontSize: 56 }}>{item.icon}</Text>
                  <Text style={[styles.habitLabel, selectedIcon === item.icon && styles.freqPillTextActive]}>
                    {t(`${item.key}_short`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>}

            <Text accessibilityRole="header" style={styles.stepTitle}>{t('quest_choose_when')}</Text>
            <Text style={styles.labelSub}>🔔 {t('quest_reminder_optional')}</Text>
            <TimeWheel label={t('quest_reminder_optional')} value={reminderTime} onChange={setReminderTime} optional />
            <QuestAlertChoice value={reminderMode} onChange={setReminderMode} />
            <Text style={styles.labelSub}>{t('repeat_schedule_on')}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('repeat_schedule_on')} style={styles.scheduleGrid}>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selectedFreq === option.id }} aria-checked={selectedFreq === option.id}
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
            </View>

            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showOptions }} onPress={() => setShowOptions(!showOptions)} style={styles.optionsButton}><Text style={styles.habitLabel}>{t('quest_more_options')}</Text><ChevronDown color={Colors.amber} size={24} style={{ transform: [{ rotate: showOptions ? '180deg' : '0deg' }] }} /></TouchableOpacity>
            {showOptions && <View>
            {/* Verification Toggle */}
            <TouchableOpacity
              testID="approval-toggle-btn" accessibilityRole="checkbox" accessibilityState={{ checked: requiresApproval }} aria-checked={requiresApproval}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: requiresApproval ? Colors.purpleDim : Colors.surface2, borderWidth: 1, borderColor: requiresApproval ? Colors.purple : Colors.border2, borderRadius: 12, padding: 12, marginBottom: 10 }}
              onPress={() => setRequiresApproval(!requiresApproval)}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: requiresApproval ? Colors.purple : Colors.border2, backgroundColor: requiresApproval ? Colors.purple : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {requiresApproval && <Check size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: requiresApproval ? Colors.purple : Colors.text, fontSize: 17 }}>
                  {t('quest_approval_label')}
                </Text>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 15 }}>
                  {t('quest_approval_hint')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Rolling Quest Toggle */}
            <TouchableOpacity
              testID="rolling-toggle-btn" accessibilityRole="checkbox" accessibilityState={{ checked: isRolling }} aria-checked={isRolling}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: isRolling ? 'rgba(6, 182, 212, 0.15)' : Colors.surface2,
                borderWidth: 1,
                borderColor: isRolling ? '#06B6D4' : Colors.border2,
                borderRadius: 12,
                padding: 12,
                marginBottom: 10
              }}
              onPress={() => setIsRolling(!isRolling)}
            >
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isRolling ? '#06B6D4' : Colors.border2,
                backgroundColor: isRolling ? '#06B6D4' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isRolling && <Check size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: isRolling ? '#06B6D4' : Colors.text, fontSize: 17 }}>
                  {t('rolling_quest_title', 'Rolling Quest (Stays until done) 🔄')}
                </Text>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 15 }}>
                  {t('rolling_quest_sub', 'If unfinished today, carries over automatically into tomorrow')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Allow Postpone Toggle */}
            <TouchableOpacity
              testID="postpone-toggle-btn" accessibilityRole="checkbox" accessibilityState={{ checked: canPostpone }} aria-checked={canPostpone}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: canPostpone ? 'rgba(56, 189, 248, 0.15)' : Colors.surface2,
                borderWidth: 1,
                borderColor: canPostpone ? '#38BDF8' : Colors.border2,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12
              }}
              onPress={() => setCanPostpone(!canPostpone)}
            >
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: canPostpone ? '#38BDF8' : Colors.border2,
                backgroundColor: canPostpone ? '#38BDF8' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {canPostpone && <Check size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: canPostpone ? '#38BDF8' : Colors.text, fontSize: 17 }}>
                  {t('allow_postpone_title', 'Allow Kid to Postpone ⏩')}
                </Text>
                <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 15 }}>
                  {t('allow_postpone_sub', 'Kid can reschedule this quest to tomorrow if out of time')}
                </Text>
              </View>
            </TouchableOpacity>

            </View>}
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
                  <View style={[styles.editRow, { flexWrap: 'wrap' }]}>
                    <View style={{ width: '100%' }}><TimeWheel label={t('quest_reminder_optional')} value={editingReminderTime} onChange={setEditingReminderTime} optional /><QuestAlertChoice value={editingReminderMode} onChange={setEditingReminderMode} /></View>
                    <TextInput
                      accessibilityLabel={t('quest_name_label')} style={styles.editInput}
                      value={editingTaskName}
                      onChangeText={setEditingTaskName}
                      autoFocus
                    />
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('quest_save_edit')} style={[styles.saveButton, { minWidth: 48, minHeight: 48 }]} onPress={saveEdit}>
                      <Check size={18} color="#121212" />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('action_cancel')} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => { setEditingTaskId(null); setEditingTaskName(''); setReminderError(''); }}>
                      <X size={24} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.taskRow}>
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel={t(task.done ? 'quest_toggle_undo' : 'quest_toggle_done', { name: t(task.name, task.name) })}
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
                        {task.reminderTime ? <Text style={{ color: Colors.amber }}>{task.reminderMode === 'alarm' ? '⏰' : '🔔'} {task.reminderTime}</Text> : null}
                        <Text style={[styles.taskName, task.done && styles.taskNameDone]}>{t(task.name, task.name)}</Text>
                        <View style={[styles.badgeRow, { flexWrap: 'wrap', gap: 6 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} color={Colors.amber} />
                            <Text style={styles.freqBadgeText}>{getFreqLabel(task.freq || 'daily')}</Text>
                          </View>
                          <Text style={[styles.statusBadgeText, { color: task.done ? Colors.green : Colors.amber }]}>
                            • {task.done ? t('done_status', 'DONE ✅') : t('pending_status', 'PENDING ⏳')}
                          </Text>
                          {task.isRolling && (
                            <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#06B6D4' }}>
                              • {t('rolling_badge', 'ROLLING 🔄')}
                            </Text>
                          )}
                          {task.canPostpone && (
                            <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#38BDF8' }}>
                              • {t('postpone_btn', 'POSTPONE ⏩')}
                            </Text>
                          )}
                          {task.postponedUntil && (
                            <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#F59E0B' }}>
                              • {t('postponed_badge', 'POSTPONED ⏩')} ({task.postponedUntil})
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {canManageQuest(task, role, linkedParents) && <View style={styles.actionRow}>
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel={t('quest_edit', { name: t(task.name, task.name) })}
                        style={[styles.actionButton, { backgroundColor: 'transparent', minWidth: 44, minHeight: 44 }]}
                        onPress={() => startEditing(task.id, t(task.name, task.name))}
                      >
                        <Edit2 size={18} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel={t('quest_delete', { name: t(task.name, task.name) })}
                        style={[styles.actionButton, { backgroundColor: 'transparent', minWidth: 44, minHeight: 44 }]}
                        onPress={() => task.pendingApproval ? showMessage(t('quest_review_before_delete')) : confirmAction(t('quest_delete_confirm', { name: t(task.name, task.name) }), () => removeTask(task.id))}
                      >
                        <Trash2 size={18} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </View>}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('quest_add')} accessibilityState={{ disabled: !newTaskName.trim() }} disabled={!newTaskName.trim()} testID="add-quest-submit-btn" style={[styles.addButton, !newTaskName.trim() && { opacity: 0.45 }]} onPress={handleAddTask}>
          <Plus size={32} color="#121212" /><Text style={styles.addButtonText}>{t('quest_add')}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
      <Modal visible={!!createdQuest} transparent animationType="fade" onRequestClose={() => setCreatedQuest(null)}>
        <View style={styles.successBackdrop}>
          <View accessibilityViewIsModal style={styles.successSheet}>
            <View style={styles.successMark}><Check size={36} strokeWidth={4} color="#121212" /></View>
            <Text accessibilityRole="header" style={styles.successTitle}>{t('quest_added_title')}</Text>
            <View style={styles.successQuest}>
              <Text style={styles.successIcon}>{createdQuest?.icon}</Text>
              <Text numberOfLines={2} style={styles.successName}>{createdQuest?.name}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => setCreatedQuest(null)}>
              <Plus size={24} color="#121212" /><Text style={styles.addButtonText}>{t('quest_add_another')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.successDone} onPress={() => { setCreatedQuest(null); router.back(); }}>
              <Text style={styles.successDoneText}>{t('quest_added_done_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  successBackdrop: { flex: 1, backgroundColor: 'rgba(5, 8, 16, 0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successSheet: { width: '100%', maxWidth: 420, backgroundColor: '#171D2E', borderRadius: 28, borderWidth: 2, borderColor: Colors.amber, padding: 24, gap: 16, alignItems: 'center' },
  successMark: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: Colors.text, fontFamily: 'Nunito_900Black', fontSize: 28, textAlign: 'center' },
  successQuest: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.surface2, borderRadius: 18, padding: 16 },
  successIcon: { fontSize: 52 },
  successName: { flex: 1, minWidth: 0, color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 20 },
  successDone: { minHeight: 48, width: '100%', alignItems: 'center', justifyContent: 'center' },
  successDoneText: { color: Colors.textSecondary, fontFamily: 'Nunito_800ExtraBold', fontSize: 17 },
  nameField: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 68, paddingRight: 6, borderRadius: 16, borderWidth: 2, borderColor: Colors.amber, backgroundColor: Colors.surface2, marginBottom: 16 },
  nameInput: { flex: 1, minWidth: 0, minHeight: 64, paddingLeft: 16, paddingVertical: 14, color: Colors.text, fontSize: 24, fontFamily: 'Nunito_800ExtraBold' },
  stepTitle: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold', color: Colors.text, marginTop: 12, marginBottom: 14 },
  selectedPicture: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, paddingVertical: 8 },
  optionsButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.background, width: '100%', maxWidth: 560, alignSelf: 'center' },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardLayer: {
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 96,
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
    width: 44,
    height: 44,
    flexShrink: 0,
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
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  addCard: { paddingVertical: 12 },
  habitGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 22 },
  habitTile: { minHeight: 140, borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface2, borderWidth: 2, borderColor: 'transparent' },
  habitLabel: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', color: Colors.text, textAlign: 'center' },
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  input: {
    minHeight: 54,
    backgroundColor: '#1A2035',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: Colors.text,
    marginBottom: 14,
  },
  labelSub: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  freqScroll: {
    marginBottom: 14,
  },
  freqPill: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1A2035',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  freqPillActive: {
    backgroundColor: Colors.amberDim,
    borderColor: Colors.amber,
  },
  freqPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: Colors.textMuted,
  },
  freqPillTextActive: {
    color: Colors.amber,
    fontFamily: 'Nunito_800ExtraBold',
  },
  addButton: {
    backgroundColor: Colors.amber,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addButtonText: {
    color: '#121212',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
  },
  emptyCard: {
    backgroundColor: '#131726',
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: Colors.textMuted,
  },
  taskCard: {
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 16,
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
    color: Colors.amber,
    fontSize: 15,
  },
  actionRow: {
    width: 44,
    flexShrink: 0,
  },
  actionButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
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
    fontSize: 17,
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
