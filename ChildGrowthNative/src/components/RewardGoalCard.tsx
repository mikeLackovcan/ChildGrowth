import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';
import ActionSheet from './ActionSheet';
import ReadableTextInput from './ReadableTextInput';

export default function RewardGoalCard({ ownerName }: { ownerName?: string }) {
  const { t } = useTranslation();
  const goal = useAppStore(state => state.rewardGoal);
  const totalEarned = useAppStore(state => state.totalEarned);
  const setGoal = useAppStore(state => state.setRewardGoal);
  const claimGoal = useAppStore(state => state.claimRewardGoal);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('300');
  const [error, setError] = useState('');
  const progress = goal ? Math.min(goal.target, Math.max(0, totalEarned - goal.startCoins)) : 0;
  const ready = Boolean(goal && !goal.claimed && progress >= goal.target);
  return <>
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{ownerName ? t('goal_owner', { name: ownerName }) : t('goal_title')}</Text>
      <View style={styles.heading}>
        <Text style={styles.icon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{goal?.title || t('goal_empty')}</Text>
          <Text style={styles.meta}>{goal ? goal.claimed ? t('goal_added') : t('goal_progress', { progress, target: goal.target }) : t('goal_family')}</Text>
        </View>
      </View>
      {goal && !goal.claimed && <>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={goal.title} accessibilityValue={{ min: 0, max: goal.target, now: progress }}>
          <View style={[styles.fill, { width: `${progress / goal.target * 100}%` }]} />
        </View>
        <Text style={styles.hint}>{t('goal_spending_hint')}</Text>
      </>}
      {ready ? <Pressable style={styles.primary} accessibilityRole="button" onPress={claimGoal}><Text style={styles.primaryText}>{t('goal_collect')}</Text></Pressable> : null}
      <Pressable style={styles.link} accessibilityRole="button" onPress={() => { setTitle(''); setTarget('300'); setError(''); setEditing(true); }}>
        <Text style={styles.linkText}>{t(!goal ? 'goal_choose' : goal.claimed ? 'goal_next' : 'goal_change')}</Text>
      </Pressable>
    </View>
    <ActionSheet visible={editing} title={t('goal_title')} onClose={() => setEditing(false)}>
      <Text style={styles.hint}>{t(goal && !goal.claimed ? 'goal_restart_hint' : 'goal_prompt')}</Text>
      <Text style={styles.label}>{t('goal_name')}</Text>
      <ReadableTextInput style={[styles.input, { paddingVertical: 12 }]} accessibilityLabel={t('goal_name')} placeholder={t('goal_example')} value={title} onChangeText={setTitle} maxLength={80} placeholderTextColor={Colors.textSecondary} />
      <Text style={styles.label}>{t('goal_coins')}</Text>
      <TextInput style={styles.input} accessibilityLabel={t('goal_target_label')} value={target} onChangeText={setTarget} keyboardType="number-pad" maxLength={6} />
      <Text style={styles.hint}>{t('goal_daily_hint')}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      <Pressable style={styles.primary} accessibilityRole="button" onPress={() => {
        if (!title.trim() || !/^\d+$/.test(target) || Number(target) < 1) { setError('goal_invalid'); return; }
        setGoal(title, Number(target)); setEditing(false);
      }}><Text style={styles.primaryText}>{t(goal && !goal.claimed ? 'goal_start' : 'goal_save')}</Text></Pressable>
    </ActionSheet>
  </>;
}
const styles = StyleSheet.create({
  card: { paddingVertical: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginVertical: 20 },
  eyebrow: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { fontSize: 38 },
  title: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 21 },
  meta: { fontFamily: 'Nunito_700Bold', color: Colors.textSecondary, fontSize: 15, marginTop: 4 },
  track: { height: 10, backgroundColor: '#E1E8EF', borderRadius: 8, overflow: 'hidden', marginTop: 20, marginBottom: 10 },
  fill: { height: '100%', borderRadius: 8, backgroundColor: '#83AE2D' },
  hint: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  link: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  linkText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.primary, fontSize: 15 },
  primary: { minHeight: 56, paddingHorizontal: 16, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 17 },
  input: { minHeight: 56, borderBottomWidth: 1, borderColor: Colors.border, color: Colors.text, fontFamily: 'Nunito_700Bold', fontSize: 19 },
  label: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 16 },
  error: { fontFamily: 'Nunito_700Bold', color: '#AF332A', fontSize: 14 },
});
