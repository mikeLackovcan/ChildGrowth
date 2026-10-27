import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function QuestAlertChoice({ value, onChange }: { value: 'notification' | 'alarm'; onChange: (value: 'notification' | 'alarm') => void }) {
  const { t } = useTranslation();
  return <View style={{ gap: 10, width: '100%' }}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('alarm_alert_type')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {(['notification', 'alarm'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityLabel={t(mode === 'alarm' ? 'alarm_mode' : 'alarm_notification')}
        accessibilityState={{ checked: value === mode }} aria-checked={value === mode} onPress={() => onChange(mode)}
        style={{ flexGrow: 1, minHeight: 64, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: value === mode ? Colors.amber : '#555', backgroundColor: value === mode ? '#40361B' : '#252525', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '800' }}>{mode === 'alarm' ? '⏰' : '🔔'} {t(mode === 'alarm' ? 'alarm_mode' : 'alarm_notification')}</Text>
      </Pressable>)}
    </View>
    {value === 'alarm' && <Text style={{ color: Colors.textMuted, fontSize: 15 }}>{t('alarm_description')}</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.push('/reminders')} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: Colors.amber, fontSize: 15 }}>{t('alarm_setup')}</Text>
    </Pressable>
  </View>;
}
