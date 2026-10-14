import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/theme';
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

export default function ManageTasksScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const removeTask = useAppStore((state) => state.removeTask);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧹');
  const [frequency, setFrequency] = useState<Task['freq']>('daily');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const createQuest = () => {
    if (!name.trim()) return;
    addTask({ name: name.trim(), icon, freq: frequency, diff: 'med', mystery: false, requiresApproval });
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

        <View style={styles.approvalCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.approvalTitle}>Parent approval</Text>
            <Text style={styles.approvalText}>Optional for linked families</Text>
          </View>
          <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ false: '#D9E2EF', true: Colors.primary }} thumbColor="#FFFFFF" />
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}><Check size={20} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Make it clear and achievable.</Text>
            <Text style={styles.tipText}>Short, specific quests are easier to complete and more rewarding.</Text>
          </View>
        </View>

        {tasks.length > 0 && (
          <View style={styles.existingSection}>
            <Text style={styles.existingTitle}>Current quests</Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.existingCard}>
                <Text style={styles.existingEmoji}>{task.icon || '✓'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.existingName}>{task.name}</Text>
                  <Text style={styles.existingMeta}>{task.freq === 'daily' ? 'Every day' : task.freq}</Text>
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
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.text },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30 },
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text, marginBottom: 9, marginTop: 16 },
  categories: { gap: 10, paddingRight: 20 },
  category: { width: 86, height: 90, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  categorySelected: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.blueDim },
  categoryEmoji: { fontSize: 28, marginBottom: 7 },
  categoryLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: Colors.textSecondary },
  categoryLabelSelected: { color: Colors.primary },
  input: { minHeight: 56, borderWidth: 1.5, borderColor: Colors.border2, borderRadius: 16, backgroundColor: Colors.surface, paddingHorizontal: 16, fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text },
  repeatRow: { flexDirection: 'row', gap: 8 },
  repeatChip: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2, borderRadius: 14, backgroundColor: Colors.surface },
  repeatChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  repeatText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textSecondary },
  repeatTextSelected: { color: '#FFFFFF' },
  approvalCard: { minHeight: 72, marginTop: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18 },
  approvalTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text },
  approvalText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  tipCard: { flexDirection: 'row', gap: 12, padding: 15, marginTop: 14, backgroundColor: Colors.blueDim, borderRadius: 18, borderWidth: 1, borderColor: '#C9D9FA' },
  tipIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  tipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 17, color: Colors.textSecondary, marginTop: 2 },
  existingSection: { marginTop: 26 },
  existingTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 19, color: Colors.text, marginBottom: 10 },
  existingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 12, marginBottom: 8 },
  existingEmoji: { fontSize: 23, width: 42 },
  existingName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.text },
  existingMeta: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  deleteButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.redDim, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  createButton: { maxWidth: 580, width: '100%', alignSelf: 'center', minHeight: 56, borderRadius: 17, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createButtonDisabled: { opacity: 0.45 },
  createButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
});
