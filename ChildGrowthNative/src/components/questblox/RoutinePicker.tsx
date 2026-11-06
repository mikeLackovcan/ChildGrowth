import React, { useState, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { enqueueProgress } from '../../lib/progressQueue';
import { localDay } from '../../utils/questDay';
import { Button, ui, palette } from './UI';
const routines = {
  morning: [['🪥', 'habit_brush_teeth_short'], ['💧', 'habit_water_short']],
  afternoon: [['🧠', 'habit_homework_short'], ['🧹', 'habit_cleaning_short']],
  bedtime: [['🛁', 'habit_bath_short'], ['📚', 'habit_reading_short']],
} as const;
export default function RoutinePicker() {
  const { t } = useTranslation();
  const s = useAppStore();
  const [routine, setRoutine] = useState<keyof typeof routines>('morning');
  const [targets, setTargets] = useState<string[]>(s.selectedChildId ? [s.selectedChildId] : []);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  if (s.role !== 'parent') return null;
  const children = s.children.filter(child => child.isApproved);
  const assign = async () => {
    if (lock.current || !s.userId) return;
    lock.current = true; setBusy(true); setMessage('');
    const uid = s.userId;
    try {
      for (const child of children.filter(child => targets.includes(child.id))) {
        for (const [index, [icon, name]] of routines[routine].entries()) {
          if (useAppStore.getState().userId !== uid) return;
          const id = `routine_${routine}_${index}`;
          if (child.tasks.some(task => task.id === id)) continue;
          await enqueueProgress(uid, child.id, 'task.create', { id, name, icon, diff: 'easy', freq: 'daily', mystery: false, requiresApproval: true, ownerRole: 'parent', done: false, date: localDay() });
        }
      }
      await useAppStore.getState().syncToServer();
      if (useAppStore.getState().userId !== uid) return;
      setMessage(useAppStore.getState().syncError || 'routine_added');
      if (!useAppStore.getState().syncError) { await useAppStore.getState().loadMockState(); setOpen(false); }
    } catch { if (useAppStore.getState().userId === uid) setMessage('quest_create_retry'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <Button secondary label={t('routine_title')} disabled={busy} onPress={() => setOpen(!open)} />
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t(message)}</Text>}
    {open && <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(Object.keys(routines) as (keyof typeof routines)[]).map(key => <Pressable key={key} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: key === routine }} onPress={() => setRoutine(key)} style={{ minHeight: 48, justifyContent: 'center', padding: 10, borderRadius: 12, backgroundColor: key === routine ? palette.gold : palette.panel }}><Text style={[ui.text, { color: key === routine ? palette.bg : palette.ink }]}>{t(`routine_${key}`)}</Text></Pressable>)}</View>
      {routines[routine].map(([icon, name]) => <Text key={name} style={ui.text}>{icon} {t(name)}</Text>)}
      <Text style={ui.meta}>{t('routine_children')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children.map(child => <Pressable key={child.id} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: targets.includes(child.id) }} onPress={() => setTargets(values => values.includes(child.id) ? values.filter(id => id !== child.id) : [...values, child.id])} style={{ minHeight: 48, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: targets.includes(child.id) ? palette.gold : palette.line }}><Text style={ui.text}>{targets.includes(child.id) ? '✓ ' : ''}{child.name || child.nickname}</Text></Pressable>)}</View>
      <Button disabled={busy || !children.some(child => targets.includes(child.id))} label={t(busy ? 'reminder_saving' : 'routine_assign')} onPress={() => { void assign(); }} />
    </>}
  </View>;
}
