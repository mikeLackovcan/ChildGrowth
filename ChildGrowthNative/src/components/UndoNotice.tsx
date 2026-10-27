import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

export type Notice = { key: number; text: string; undo?: () => void };

export default function UndoNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timeout);
  }, [notice, onDismiss]);
  if (!notice) return null;
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{notice.text}</Text>
      <Pressable accessibilityRole="button" style={styles.action} onPress={() => { onDismiss(); notice.undo?.(); }}>
        <Text style={styles.actionText}>{t(notice.undo ? 'undo' : 'ok')}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  notice: { marginHorizontal: 16, marginBottom: 8, paddingLeft: 16, paddingRight: 4, minHeight: 56, backgroundColor: Colors.text, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 620, alignSelf: 'center', width: '94%' },
  text: { flex: 1, color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 15 },
  action: { minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#CBF250', fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
});
