import { questName } from '../lib/questTemplates';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';
import UndoNotice, { Notice } from '../components/UndoNotice';

export default function QuestListScreen() {
  const { t } = useTranslation();
  const tasks = useAppStore(state => state.tasks);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dismiss = useCallback(() => setNotice(null), []);
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={t('onboard_back')} onPress={() => router.back()}><ChevronLeft size={24} color={Colors.text} /></Pressable>
      <Text style={styles.title}>{t('quest_all')}</Text>
      <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={t('quest_add_accessible')} onPress={() => router.push('/manage-tasks')}><Plus size={24} color={Colors.primary} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.list}>
      {tasks.length === 0 && <Text style={styles.meta}>{t('quest_empty')}</Text>}
      {tasks.map(task => <View key={task.id} style={styles.row}>
        <Text style={styles.emoji}>{task.icon || '⭐'}</Text>
        <View style={{ flex: 1 }}><Text style={styles.name}>{questName(task)}</Text><Text style={styles.meta}>{t('freq_' + task.freq)}{task.reminderEnabled ? ` · ${task.reminderTime}` : ''}</Text></View>
        <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={`Edit ${questName(task)}`} onPress={() => router.push({ pathname: '/manage-tasks', params: { taskId: task.id } })}><Pencil size={20} color={Colors.primary} /></Pressable>
        <Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={`Delete ${questName(task)}`} onPress={() => {
          useAppStore.getState().removeTask(task.id);
          setNotice({ key: Date.now(), text: t('quest_removed'), undo: () => useAppStore.getState().restoreTask({ ...task, activeFocusStartedAt: undefined, focusNotificationId: undefined }) });
        }}><Trash2 size={20} color="#AF332A" /></Pressable>
      </View>)}
    </ScrollView>
    <UndoNotice notice={notice} onDismiss={dismiss} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', maxWidth: 620, width: '100%', alignSelf: 'center', padding: 12 },
  title: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.text },
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, maxWidth: 620, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: Colors.border, gap: 6 },
  emoji: { fontSize: 28, marginRight: 10 },
  name: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
});
