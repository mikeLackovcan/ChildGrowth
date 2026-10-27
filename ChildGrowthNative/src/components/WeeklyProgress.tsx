import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { type ChildProfile, useAppStore } from '../store/useAppStore';
import { weeklyProgress } from '../lib/weeklyProgress';
import { questName } from '../lib/questTemplates';
import { Colors } from '../constants/theme';

export default function WeeklyProgress({ child }: { child: ChildProfile }) {
  const { t, i18n } = useTranslation();
  const summary = weeklyProgress(child.activityHistory || []);
  const waiting = child.wonPrizes.filter(prize => !prize.redeemed);
  const label = (date: string) => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(date + 'T12:00:00'));
  const maximum = Math.max(1, ...summary.days.map(day => day.completed));
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>{t('weekly_title', { name: child.name })}</Text>
    <Text style={styles.hint}>{t('weekly_subtitle')}</Text>
    {summary.hasRecords ? <>
      <View style={styles.days}>{summary.days.map(day => <View key={day.date} style={styles.day} accessible accessibilityLabel={t('weekly_day', { date: label(day.date), count: day.completed })}>
        <Text style={styles.dayCount}>{day.completed || '—'}</Text>
        <View style={styles.track}><View style={[styles.bar, { height: 4 + day.completed / maximum * 44 }]} /></View>
        <Text style={styles.dayLabel}>{label(day.date)}</Text>
      </View>)}</View>
      <Text style={styles.summary}>{t('weekly_completed', { count: summary.completed })} · {t('weekly_postponed', { count: summary.postponed })}</Text>
      <Text style={styles.hint}>{t('weekly_recorded')}</Text>
      {summary.tasks.map(item => {
        const current = child.tasks.find(task => task.id === item.taskId);
        return <View key={item.taskId} style={styles.row}>
          <View style={styles.copy}><Text style={styles.name}>{questName(current || item)}</Text>
            <Text style={styles.hint}>{t('weekly_completed', { count: item.completed })} · {t('weekly_postponed', { count: item.postponed })}</Text>
            {item.postponed > 1 && <Text style={styles.hint}>{t('weekly_help')}</Text>}
            {!current && <Text style={styles.hint}>{t('weekly_deleted')}</Text>}
          </View>
          {current && <Pressable accessibilityRole="button" accessibilityLabel={t('quest_edit_named', { name: questName(current) })} style={styles.action} onPress={() => {
            useAppStore.getState().selectChild(child.id);
            router.push({ pathname: '/manage-tasks', params: { taskId: current.id } });
          }}><Text style={styles.link}>{t('quest_edit')}</Text></Pressable>}
        </View>;
      })}
    </> : <Text style={[styles.hint, { marginVertical: 18 }]}>{t('weekly_empty')}</Text>}
    <Text style={styles.summary}>{t('weekly_waiting', { count: waiting.length })}</Text>
    {waiting.map(prize => <View key={prize.id} style={styles.row}>
      <Text style={styles.copy}>🎁 {prize.prize}</Text>
      <Pressable accessibilityRole="button" style={styles.action} onPress={() => {
        useAppStore.getState().selectChild(child.id);
        router.push('/milestones');
      }}><Text style={styles.link}>{t('weekly_deliver')}</Text></Pressable>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  section: { paddingVertical: 24, borderTopWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 23 },
  hint: { color: Colors.textSecondary, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 19, marginTop: 4 },
  summary: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, marginTop: 16 },
  days: { flexDirection: 'row', gap: 4, marginTop: 22 },
  day: { flex: 1, alignItems: 'center', gap: 5 },
  dayCount: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 16 },
  track: { height: 48, width: 20, justifyContent: 'flex-end' },
  bar: { backgroundColor: Colors.primary, borderRadius: 5 },
  dayLabel: { color: Colors.textSecondary, fontFamily: 'Nunito_600SemiBold', fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: Colors.border, paddingVertical: 14 },
  copy: { flex: 1, color: Colors.text, fontFamily: 'Nunito_700Bold', fontSize: 15 },
  name: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 16 },
  action: { minHeight: 48, justifyContent: 'center', maxWidth: '35%' },
  link: { color: Colors.primary, fontFamily: 'Nunito_800ExtraBold', fontSize: 14 },
});
