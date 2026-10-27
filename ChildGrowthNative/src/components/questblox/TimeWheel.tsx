import { validReminderTime } from '../../utils/reminderPlan';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';

const ROW = 52;
const pad = (value: number) => String(value).padStart(2, '0');
function Wheel({ initial, count, start = 0, label, onChange }: { initial: number; count: number; start?: number; label: string; onChange: (value: number) => void }) {
  const scroll = useRef<ScrollView>(null);
  const initialized = useRef(false);
  const [selected, setSelected] = useState(initial);
  const select = (index: number) => { setSelected(index + start); onChange(index + start); };
  return <View style={{ flex: 1 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={{ height: ROW * 3 }}>
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView ref={scroll} nestedScrollEnabled onContentSizeChange={() => { if (!initialized.current) { initialized.current = true; scroll.current?.scrollTo({ y: (initial - start) * ROW, animated: false }); } }} snapToInterval={ROW} decelerationRate="fast" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ROW }} scrollEventThrottle={16}
        onScroll={event => { if (initialized.current) select(Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.y / ROW)))); }}>
        {Array.from({ length: count }, (_, index) => { const value = index + start; return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${label}: ${pad(value)}`} accessibilityState={{ checked: selected === value }} aria-checked={selected === value}
          onPress={() => { select(index); scroll.current?.scrollTo({ y: index * ROW, animated: false }); }} style={styles.numberRow}>
          <Text style={[styles.number, { color: selected === value ? Colors.amber : Colors.textMuted }]}>{pad(value)}</Text>
        </Pressable>; })}
      </ScrollView>
    </View>
  </View>;
}
export default function TimeWheel({ value, onChange, label, optional = false, disabled = false }: {
  value: string; onChange: (value: string) => void; label: string; optional?: boolean; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const draft = useRef([18, 0]);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || t('time_default')}`} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => { draft.current = validReminderTime(value) ? value.split(':').map(Number) : [18, 0]; setOpen(true); }}
      style={[styles.trigger, disabled && { opacity: 0.5 }]}>
      <Text accessible={false} style={{ fontSize: 28 }}>⏰</Text><Text style={styles.time}>{value || t('time_default')}</Text><Text style={{ color: Colors.amber, fontSize: 22 }}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      {open && <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.label}>{t('time_scroll')}</Text>
        <Text style={[styles.label, { marginTop: 6 }]}>{t('reminder_hours')}</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginVertical: 18 }}>
          <Wheel initial={draft.current[0]} count={13} start={7} label={t('time_hour')} onChange={hour => { draft.current[0] = hour; }} />
          <Wheel initial={draft.current[1]} count={60} label={t('time_minute')} onChange={minute => { draft.current[1] = minute; }} />
        </View>
        {optional && <Pressable accessibilityRole="button" onPress={() => { onChange(''); setOpen(false); }} style={styles.action}><Text style={styles.label}>{t('time_use_default')}</Text></Pressable>}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={[styles.action, { flex: 1 }]}><Text style={styles.label}>{t('action_cancel')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { onChange(draft.current.map(pad).join(':')); setOpen(false); }} style={[styles.action, { flex: 1, backgroundColor: Colors.amber, borderRadius: 14 }]}><Text style={[styles.label, { color: '#121212' }]}>{t('action_save')}</Text></Pressable>
        </View>
      </View></View>}
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: { minHeight: 64, borderRadius: 14, backgroundColor: Colors.surface2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  time: { flexShrink: 1, fontSize: 24, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: Colors.background, padding: 22, borderRadius: 24 },
  title: { fontSize: 21, fontFamily: 'Nunito_800ExtraBold', color: Colors.text, marginBottom: 8 },
  label: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: Colors.textMuted, textAlign: 'center' },
  selection: { position: 'absolute', top: ROW, height: ROW, left: 0, right: 0, backgroundColor: Colors.amberDim, borderRadius: 12 },
  numberRow: { height: ROW, justifyContent: 'center', alignItems: 'center' },
  number: { fontSize: 32, fontFamily: 'Nunito_800ExtraBold' },
  action: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 8 },
});
