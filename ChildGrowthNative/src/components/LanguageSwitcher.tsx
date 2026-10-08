import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'cs', flag: '🇨🇿', label: 'CS' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
] as const;

export default function LanguageSwitcher() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <View style={styles.container}>
      {LANGUAGES.map((lang) => {
        const isActive = language === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
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
    backgroundColor: Colors.surface2,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: Colors.red,
  },
  text: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
