import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BellRing, ChevronLeft, Clock3, Network, Sparkles } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../lib/notifications';
import { Task, useAppStore } from '../store/useAppStore';

type MapStep = { name: string; time: string };

const REPEATS: Array<{ id: Task['freq']; label: string }> = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
];

function normalizeOptionalTime(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const [rawHour = '0', rawMinute = '0'] = value.split(':');
  const hour = Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function QuestMapScreen() {
  const addTask = useAppStore((state) => state.addTask);
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState<Task['freq']>('daily');
  const [steps, setSteps] = useState<MapStep[]>([
    { name: '', time: '' },
    { name: '', time: '' },
    { name: '', time: '' },
  ]);

  const updateStep = (index: number, updates: Partial<MapStep>) => {
    setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...updates } : step));
  };

  const createQuestMap = async () => {
    if (!goal.trim()) return;
    const namedSteps = steps.filter((step) => step.name.trim());
    const plan = namedSteps.length ? namedSteps : [{ name: goal.trim(), time: '' }];
    const wantsReminders = plan.some((step) => Boolean(normalizeOptionalTime(step.time)));
    const notificationsGranted = wantsReminders ? await requestNotificationPermissions() : false;

    plan.forEach((step) => {
      const reminderTime = normalizeOptionalTime(step.time);
      addTask({
        name: step.name.trim(),
        icon: '🧭',
        freq: frequency,
        diff: 'med',
        mystery: false,
        questMapGoal: goal.trim(),
        reminderEnabled: Boolean(reminderTime && notificationsGranted),
        reminderTime,
        requiresApproval: false,
      });
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Quest Map</Text>
          <Text style={styles.subtitle}>Turn one big goal into small wins.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Network size={20} color={Colors.primary} />
          <Text style={styles.introText}>Start with what you want to achieve. Then add up to three steps you can actually do.</Text>
        </View>

        <Text style={styles.eyebrow}>MY BIG GOAL</Text>
        <View style={styles.goalNode}>
          <Sparkles size={21} color={Colors.amber} />
          <TextInput
            style={styles.goalInput}
            value={goal}
            onChangeText={setGoal}
            placeholder="E.g. Keep my room tidy"
            placeholderTextColor="#AFC1E8"
            maxLength={80}
            accessibilityLabel="Big goal"
          />
        </View>

        <View style={styles.connector} />
        <Text style={styles.eyebrow}>SMALL STEPS</Text>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>{index + 1}</Text></View>
                {index < steps.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepFields}>
                <TextInput
                  style={styles.stepInput}
                  value={step.name}
                  onChangeText={(name) => updateStep(index, { name })}
                  placeholder={index === 0 ? 'First small action' : 'Another small action (optional)'}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={80}
                  accessibilityLabel={`Step ${index + 1}`}
                />
                <View style={styles.timeRow}>
                  <Clock3 size={15} color={step.time ? Colors.primary : Colors.textMuted} />
                  <TextInput
                    style={styles.timeInput}
                    value={step.time}
                    onChangeText={(time) => updateStep(index, { time })}
                    onBlur={() => updateStep(index, { time: normalizeOptionalTime(step.time) || '' })}
                    placeholder="Optional time, e.g. 18:00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel={`Reminder time for step ${index + 1}`}
                  />
                  {step.time ? <BellRing size={15} color={Colors.primary} /> : null}
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.eyebrow}>REPEAT</Text>
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
        <Text style={styles.note}>Times are optional. If you add one, Quest Hero will ask permission and schedule a notification with sound.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.createButton, !goal.trim() && styles.createButtonDisabled]} disabled={!goal.trim()} onPress={createQuestMap}>
          <Network size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create quest map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 25, color: Colors.text },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 28 },
  intro: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  introText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  eyebrow: { marginTop: 20, marginBottom: 9, fontFamily: 'Nunito_800ExtraBold', fontSize: 11, letterSpacing: 1.2, color: Colors.textMuted },
  goalNode: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 17, borderRadius: 22, backgroundColor: Colors.primary },
  goalInput: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF', paddingVertical: 16 },
  connector: { width: 2, height: 20, marginLeft: 23, backgroundColor: '#B8CAF2' },
  steps: { marginTop: 2 },
  stepRow: { minHeight: 82, flexDirection: 'row' },
  stepRail: { width: 48, alignItems: 'center' },
  stepBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.primary },
  stepLine: { width: 2, flex: 1, backgroundColor: '#D4DEF2' },
  stepFields: { flex: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepInput: { minHeight: 39, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text, paddingVertical: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timeInput: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.primary, paddingVertical: 4 },
  repeatRow: { flexDirection: 'row', gap: 8 },
  repeatChip: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.surface },
  repeatChipSelected: { backgroundColor: Colors.primary },
  repeatText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: Colors.textSecondary },
  repeatTextSelected: { color: '#FFFFFF' },
  note: { marginTop: 12, fontFamily: 'Nunito_600SemiBold', fontSize: 11, lineHeight: 16, color: Colors.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  createButton: { maxWidth: 580, width: '100%', alignSelf: 'center', minHeight: 56, borderRadius: 18, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createButtonDisabled: { opacity: 0.42 },
  createButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#FFFFFF' },
});
