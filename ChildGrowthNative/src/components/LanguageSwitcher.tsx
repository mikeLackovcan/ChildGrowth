import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'cs', flag: '🇨🇿', label: 'CS', name: 'Čeština' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
] as const;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  if (compact) {
    const current = LANGUAGES.find(item => item.code === language) || LANGUAGES[0];
    return <View style={{ alignItems: 'flex-end' }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('language_choose')}
        accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}
        style={{ minHeight: 44, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[styles.text, { fontSize: 14 }]}>{current.flag} {current.label} {expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {expanded && <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {LANGUAGES.map(lang => <TouchableOpacity key={lang.code} accessibilityRole="button"
          accessibilityLabel={t('settings_language_option', { language: lang.name })} accessibilityState={{ selected: language === lang.code }} aria-pressed={language === lang.code}
          onPress={() => { setLanguage(lang.code); setExpanded(false); }}
          style={{ minHeight: 48, minWidth: 60, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.text, { fontSize: 14, color: language === lang.code ? '#ffc857' : Colors.textMuted }]}>{lang.flag} {lang.label}</Text>
        </TouchableOpacity>)}
      </View>}
    </View>;
  }

  return (
    <View style={styles.container}>
      {LANGUAGES.map((lang) => {
        const isActive = language === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            accessibilityRole="button" accessibilityLabel={t('settings_language_option', { language: lang.name })} accessibilityState={{ selected: isActive }} aria-pressed={isActive}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {lang.flag} {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    minWidth: 64, minHeight: 48,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: '#33405a',
  },
  text: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.textMuted,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
