import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { saveChildPrizes } from '../lib/saveChildPrizes';
import ReadableTextInput from './ReadableTextInput';

// Mount with a parent/child key: drafts cannot travel across profiles.
export default function ParentPrizeEditor({ parentId, childId, initialPrizes }: {
  parentId: string | null; childId: string; initialPrizes: string[];
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialPrizes.length ? [...initialPrizes] : ['']);
  const [message, setMessage] = useState('');
  return <View style={styles.section}>
    <Text style={styles.title}>{t('prize_settings')}</Text>
    <Text style={styles.hint}>{t('parent_prizes_help')}</Text>
    {draft.map((prize, index) => <View key={index} style={{ gap: 6 }}>
      <Text style={styles.hint}>{t('parent_prize_number', { number: index + 1 })}</Text>
      <ReadableTextInput value={prize}
      style={styles.input} maxLength={160}
      placeholder={t('parent_prize_number', { number: index + 1 })}
      accessibilityLabel={t('parent_prize_number', { number: index + 1 })}
      onChangeText={value => { setDraft(items => items.map((item, i) => i === index ? value : item)); setMessage(''); }} /></View>)}
    <Pressable accessibilityRole="button" style={styles.action} onPress={() => setDraft(items => [...items, ''])}>
      <Text style={styles.link}>{t('parent_prize_add')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" style={styles.action} onPress={() => {
      setMessage(saveChildPrizes(parentId, childId, draft) ? 'parent_prizes_saved' : 'pair_session_changed');
    }}><Text style={styles.link}>{t('save_prizes')}</Text></Pressable>
    {message ? <Text accessibilityRole="alert" style={styles.hint}>{t(message)}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  hint: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  input: { width: '100%', minHeight: 56, paddingVertical: 12, textAlign: 'left', textAlignVertical: 'top', borderBottomWidth: 1, borderColor: Colors.border, fontSize: 16, lineHeight: 24, color: Colors.text },
  action: { minHeight: 48, justifyContent: 'center' },
  link: { fontSize: 16, color: Colors.primary, fontFamily: 'Nunito_800ExtraBold' },
});
