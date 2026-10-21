import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';
import ActionSheet from './ActionSheet';

export default function RewardGoalCard({ ownerName }: { ownerName?: string }) {
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
      <Text style={styles.eyebrow}>{ownerName ? `${ownerName}’s next goal` : 'MY NEXT GOAL'}</Text>
      <View style={styles.heading}>
        <Text style={styles.icon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{goal?.title || 'Something to look forward to'}</Text>
          <Text style={styles.meta}>{goal ? goal.claimed ? 'Added to your reward shelf ✓' : `${progress} / ${goal.target} coins earned` : 'Choose a reward with your family.'}</Text>
        </View>
      </View>
      {goal && !goal.claimed && <>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: goal.target, now: progress }}>
          <View style={[styles.fill, { width: `${progress / goal.target * 100}%` }]} />
        </View>
        <Text style={styles.hint}>Shop purchases never reduce this progress.</Text>
      </>}
      {ready ? <Pressable style={styles.primary} accessibilityRole="button" onPress={claimGoal}><Text style={styles.primaryText}>🎁 Collect reward</Text></Pressable> : null}
      <Pressable style={styles.link} accessibilityRole="button" onPress={() => { setTitle(''); setTarget('300'); setError(''); setEditing(true); }}>
        <Text style={styles.linkText}>{!goal ? 'Choose a goal' : goal.claimed ? 'Choose my next goal' : 'Change goal…'}</Text>
      </Pressable>
    </View>
    <ActionSheet visible={editing} title="My next goal" onClose={() => setEditing(false)}>
      <Text style={styles.hint}>{goal && !goal.claimed ? 'A new goal starts from zero. Your wallet stays the same.' : 'What would you like to work toward?'}</Text>
      <TextInput style={styles.input} accessibilityLabel="Reward goal name" placeholder="Movie night together" value={title} onChangeText={setTitle} maxLength={80} placeholderTextColor={Colors.textSecondary} />
      <Text style={styles.label}>Coins to earn</Text>
      <TextInput style={styles.input} accessibilityLabel="Reward goal coin target" value={target} onChangeText={setTarget} keyboardType="number-pad" maxLength={6} />
      <Text style={styles.hint}>Up to 100 coins from your daily quests. Agree family rewards together.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} accessibilityRole="button" onPress={() => {
        if (!title.trim() || !/^\d+$/.test(target) || Number(target) < 1) { setError('Add a name and a target of at least 1 coin.'); return; }
        setGoal(title, Number(target)); setEditing(false);
      }}><Text style={styles.primaryText}>{goal && !goal.claimed ? 'Start a new goal' : 'Save goal'}</Text></Pressable>
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
