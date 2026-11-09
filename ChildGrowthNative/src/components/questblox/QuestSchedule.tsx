import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { localDay } from '../../utils/questDay';
import type { Task } from '../../types/progress';
export type Schedule = Pick<Task, 'freq' | 'scheduledDate' | 'repeatDays'>;
export default function QuestSchedule({ value, onChange }: { value: Schedule; onChange: (value: Schedule) => void }) {
  const { t, i18n } = useTranslation();
  const today = new Date(), tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [calendar, setCalendar] = useState(false);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const once = value.freq === 'once';
  const choose = (freq: Task['freq']) => onChange({ freq, ...(freq === 'once' ? { scheduledDate: value.scheduledDate || localDay(today) } : freq === 'custom' ? { repeatDays: value.repeatDays?.length ? value.repeatDays : [today.getDay()] } : {}) });
  const chip = (label: string, selected: boolean, action: () => void, key = label) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={action} style={[styles.chip, selected && styles.selected]}><Text style={[styles.text, selected && { color: Colors.amber }]}>{label}</Text></Pressable>;
  const weekdayKeys = ['day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'];
  return <View style={styles.root}>
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('schedule_kind')}>
      {chip(`📅 ${t('schedule_once')}`, once, () => choose('once'))}
      {chip(`🔁 ${t('schedule_repeat')}`, !once, () => choose('daily'))}
    </View>
    {once ? <>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('quest_choose_when')}>
        {[['schedule_today', today], ['schedule_tomorrow', tomorrow]].map(([key, date]) => chip(t(key as string), value.scheduledDate === localDay(date as Date), () => { onChange({ freq: 'once', scheduledDate: localDay(date as Date) }); setCalendar(false); }, key as string))}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: calendar }} onPress={() => setCalendar(!calendar)} style={styles.chip}><Text style={styles.text}>📆 {t('schedule_pick_day')}</Text></Pressable>
      </View>
      {!!value.scheduledDate && <Text style={styles.summary}>{new Date(`${value.scheduledDate}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
      {calendar && <View>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('schedule_previous_month')} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.arrow}><Text style={styles.text}>‹</Text></Pressable>
          <Text style={[styles.text, { flex: 1, textAlign: 'center' }]}>{month.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('schedule_next_month')} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.arrow}><Text style={styles.text}>›</Text></Pressable>
        </View>
        <View style={styles.calendar}>
          {weekdayKeys.map(key => <Text key={key} style={[styles.day, styles.summary]}>{t(key)}</Text>)}
          {Array.from({ length: month.getDay() }, (_, i) => <View key={`blank${i}`} style={styles.day} />)}
          {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => {
            const date = new Date(month.getFullYear(), month.getMonth(), i + 1), day = localDay(date), disabled = day < localDay(today);
            return <Pressable key={day} accessibilityRole="radio" accessibilityLabel={date.toLocaleDateString(i18n.language, { dateStyle: 'full' })} accessibilityState={{ checked: value.scheduledDate === day, disabled }} aria-checked={value.scheduledDate === day} disabled={disabled} style={[styles.day, styles.dayButton, value.scheduledDate === day && styles.selected, disabled && { opacity: 0.3 }]} onPress={() => { onChange({ freq: 'once', scheduledDate: day }); setCalendar(false); }}><Text style={styles.text}>{i + 1}</Text></Pressable>;
          })}
        </View>
      </View>}
    </> : <>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('repeat_schedule_on')}>
        {(['daily', 'weekdays', 'weekends', 'custom'] as const).map(freq => chip(t(freq === 'custom' ? 'schedule_choose_days' : `freq_${freq}`), value.freq === freq, () => choose(freq), freq))}
      </View>
      {(value.freq === 'custom' || !['daily', 'weekdays', 'weekends'].includes(value.freq)) && <View style={styles.row}>
        {weekdayKeys.map((key, day) => { const selected = value.freq === 'custom' ? !!value.repeatDays?.includes(day) : value.freq === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
          return <Pressable key={key} accessibilityRole="checkbox" accessibilityLabel={t(key)} accessibilityState={{ checked: selected }} aria-checked={selected} style={[styles.chip, selected && styles.selected]} onPress={() => { const days = value.freq === 'custom' ? value.repeatDays || [] : [(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as string[]).indexOf(value.freq)]; const next = selected ? days.filter(d => d !== day) : [...days, day]; if (next.length) onChange({ freq: 'custom', repeatDays: next }); }}><Text style={styles.text}>{t(key)}</Text></Pressable>;
        })}
      </View>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 12, marginBottom: 18, width: '100%', minWidth: 0 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { minHeight: 48, flexGrow: 1, flexShrink: 1, maxWidth: '100%', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Colors.border2, backgroundColor: Colors.surface2 },
  selected: { borderColor: Colors.amber, backgroundColor: Colors.amberDim }, text: { color: Colors.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, flexShrink: 1, textAlign: 'center' },
  summary: { color: Colors.textMuted, fontFamily: 'Nunito_600SemiBold', fontSize: 14, textAlign: 'center' }, calendar: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  day: { width: '14.2857%', textAlign: 'center' }, dayButton: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, arrow: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
