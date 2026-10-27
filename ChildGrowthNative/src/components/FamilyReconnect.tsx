import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';

export default function FamilyReconnect() {
  const { t } = useTranslation();
  const s = useAppStore();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!s.userId || s.userId === 'guest-local' || !s.familyReconnectTags.length) return null;
  return <View style={{ gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#2b3950' }}>
    <Text style={{ color: '#ffc857', fontFamily: 'Nunito_800ExtraBold', fontSize: 17 }}>👨‍👩‍👧 {t('family_reconnect_title')}</Text>
    <Text style={{ color: '#aab8cf', fontFamily: 'Nunito_600SemiBold', fontSize: 14 }}>{t('family_reconnect_body')}</Text>
    {s.familyReconnectTags.map(name => <Pressable key={name} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }}
      onPress={async () => {
        setBusy(true); setFailed(false);
        try { if (!await (s.role === 'parent' ? s.addChildByNickname(name) : s.sendParentInvite(name))) setFailed(true); }
        finally { setBusy(false); }
      }} style={{ minHeight: 48, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
      <Text style={{ color: '#f6f7fd', fontFamily: 'Nunito_800ExtraBold', fontSize: 15 }}>{t('family_reconnect_send', { name })}</Text>
    </Pressable>)}
    {failed && <Text accessibilityLiveRegion="polite" style={{ color: '#aab8cf' }}>{t('family_link_error')}</Text>}
  </View>;
}
