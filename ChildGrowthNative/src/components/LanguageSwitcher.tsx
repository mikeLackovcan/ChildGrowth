import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Colors } from '../constants/theme';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
  { code: 'cs', flag: '🇨🇿', label: 'CS', name: 'Čeština' },
  { code: 'es', flag: '🇪🇸', label: 'ES', name: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
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
            accessibilityRole="button"
            accessibilityLabel={lang.name}
            accessibilityState={{ selected: isActive }}
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
    flexWrap: 'wrap',
    maxWidth: '100%',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pill: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: Colors.red,
  },
  text: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.text,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
