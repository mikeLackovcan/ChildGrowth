import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QuestHero from '../components/QuestHero';
import { heroFor } from '../lib/heroCatalog';
import { QUEST_TEMPLATES, STARTER_HERO_IDS } from '../lib/questTemplates';
import { useAppStore } from '../store/useAppStore';
import { useExperienceSettings } from '../store/useExperienceSettings';
import { Colors } from '../constants/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const state = useAppStore();
  const preferences = useExperienceSettings();
  const [step, setStep] = useState(0);
  const [hero, setHero] = useState('quest_champ');
  const [name, setName] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (state.userId !== 'guest-local') router.replace('/');
    else if (state.tasks.length || state.totalEarned > 0) router.replace('/(tabs)');
  }, [state.userId, state.tasks.length, state.totalEarned]);

  const finish = async () => {
    setSaving(true);
    setError(false);
    try {
      if (await state.finishGuestOnboarding(name, hero, choices)) router.replace('/(tabs)');
      else setError(true);
    } catch { setError(true); }
    finally { setSaving(false); }
  };
  const valid = step === 0 || (step === 1 ? Boolean(name.trim()) : choices.length === 3);
  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      <View style={styles.steps}>{[0, 1, 2].map(index => <View key={index} style={[styles.dot, index === step && styles.activeDot]} />)}</View>
      <Text accessibilityRole="header" style={styles.title}>{t(['onboard_hero', 'onboard_name', 'onboard_quests'][step])}</Text>
      {step === 0 && <View style={styles.heroes}>{STARTER_HERO_IDS.map(id =>
        <Pressable key={id} accessibilityRole="button" accessibilityLabel={heroFor(id).name} accessibilityState={{ selected: hero === id }}
          onPress={() => setHero(id)} style={[styles.heroChoice, hero === id && styles.selected]}>
          <QuestHero id={id} style={styles.hero} /><Text style={styles.label}>{heroFor(id).name}</Text>
        </Pressable>)}</View>}
      {step === 1 && <>
        <QuestHero id={hero} style={styles.chosenHero} />
        <TextInput value={name} onChangeText={setName} maxLength={30} autoCorrect={false}
          accessibilityLabel={t('onboard_nickname')} placeholder={t('onboard_nickname')} style={styles.input} />
        <View style={styles.preference}><Text style={styles.label}>{t('simple_view')}</Text>
          <Switch accessibilityLabel={t('simple_view')} value={preferences.simpleView} onValueChange={preferences.setSimpleView} /></View>
      </>}
      {step === 2 && <>
        <Text style={styles.count}>{t('onboard_count', { count: choices.length })}</Text>
        <View style={styles.heroes}>{QUEST_TEMPLATES.map(template => {
          const selected = choices.includes(template.key);
          return <Pressable key={template.key} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: !selected && choices.length === 3 }}
            disabled={!selected && choices.length === 3} accessibilityLabel={t(template.key)}
            onPress={() => setChoices(current => selected ? current.filter(key => key !== template.key) : [...current, template.key])}
            style={[styles.template, selected && styles.selected, !selected && choices.length === 3 && styles.dim]}>
            <Text style={styles.emoji}>{template.icon}</Text><Text style={styles.label}>{t(template.key)}{selected ? ' ✓' : ''}</Text>
          </Pressable>;
        })}</View>
      </>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{t('onboard_error')}</Text>}
      <Pressable accessibilityRole="button" disabled={!valid || saving} onPress={() => step < 2 ? setStep(step + 1) : void finish()} style={[styles.next, (!valid || saving) && styles.dim]}>
        <Text style={styles.nextText}>{t(saving ? 'processing' : step === 2 ? 'onboard_ready' : 'onboard_next')}</Text>
      </Pressable>
      {step > 0 && <Pressable accessibilityRole="button" disabled={saving} onPress={() => setStep(step - 1)} style={styles.back}><Text style={styles.label}>{t('onboard_back')}</Text></Pressable>}
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDE4EE' },
  activeDot: { backgroundColor: Colors.primary, width: 24 },
  title: { fontSize: 28, color: Colors.text, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center', marginBottom: 24 },
  heroes: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  heroChoice: { width: 136, padding: 8, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  hero: { width: 110, height: 120 },
  selected: { borderColor: Colors.primary, backgroundColor: '#F0F5FF' },
  chosenHero: { width: 140, height: 160, alignSelf: 'center', marginBottom: 20 },
  label: { fontSize: 16, color: Colors.text, fontFamily: 'Nunito_700Bold', textAlign: 'center', flexShrink: 1 },
  input: { minHeight: 56, borderBottomWidth: 2, borderColor: Colors.primary, fontSize: 24, fontFamily: 'Nunito_700Bold', color: Colors.text },
  preference: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, gap: 16 },
  count: { textAlign: 'center', color: Colors.textSecondary, marginBottom: 16, fontFamily: 'Nunito_700Bold' },
  template: { width: '45%', minHeight: 110, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: 'transparent', padding: 8 },
  emoji: { fontSize: 38, marginBottom: 8 },
  next: { backgroundColor: Colors.primary, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  nextText: { color: '#FFFFFF', fontFamily: 'Nunito_800ExtraBold', fontSize: 18 },
  dim: { opacity: 0.45 },
  back: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  error: { color: '#AF332A', marginTop: 16 },
});
