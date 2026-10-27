import FamilyReconnect from '../FamilyReconnect';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { AVAILABLE_AVATARS } from '../../constants/fighters';
import { WORLD_THEMES } from '../../constants/theme';
import SettingsModal from '../SettingsModal';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { personName } from '../../utils/displayName';

export const palette = { bg: '#0e1422', panel: '#192235', ink: '#f6f7fd', muted: '#aab8cf', line: '#2b3950', gold: '#ffc857', green: '#88e4bb' };
export const fighterFor = (id: string) => AVAILABLE_AVATARS.find(f => f.id === id) || AVAILABLE_AVATARS[0];
export function SceneArt({ source, centered = false, prominent = false }: { source: number; centered?: boolean; prominent?: boolean }) {
  const fadeId = React.useId().replace(/:/g, '');
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image source={source} contentFit={centered ? "contain" : "cover"} contentPosition="center" style={{ position: 'absolute', right: 0, width: centered ? '100%' : prominent ? '62%' : '70%', height: '100%' }} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${fadeId}side`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.bg} /><Stop offset={centered ? '0.15' : prominent ? '0.38' : '0.35'} stopColor={palette.bg} stopOpacity={centered ? 0 : 1} />
          <Stop offset={prominent ? "0.58" : "0.8"} stopColor={palette.bg} stopOpacity="0" /><Stop offset="1" stopColor={palette.bg} stopOpacity={centered ? 1 : 0} />
        </LinearGradient>
        <LinearGradient id={`${fadeId}edge`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.bg} stopOpacity={1} /><Stop offset={prominent ? "0.08" : "0.2"} stopColor={palette.bg} stopOpacity="0" />
          <Stop offset={prominent ? "0.9" : "0.75"} stopColor={palette.bg} stopOpacity="0" /><Stop offset="1" stopColor={palette.bg} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${fadeId}side)`} />
      <Rect width="100%" height="100%" fill={`url(#${fadeId}edge)`} />
    </Svg>
  </View>;
}
export function Screen({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const state = useAppStore();
  const pathname = usePathname();
  const [settings, setSettings] = useState(false);
  const fullName = state.fullName?.trim();
  const nickname = state.nickname?.trim();
  const displayName = personName(fullName, nickname, t('profile_champion'));
  return <SafeAreaView edges={['top', 'left', 'right']} style={[ui.safe, state.activeTheme !== 'classic' && { backgroundColor: WORLD_THEMES[state.activeTheme].background }]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
      <View style={ui.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile_open')} onPress={() => setSettings(true)} style={[ui.row, { flex: 1 }]}>
          <Image source={require('../../../assets/images/app-icon-v2.png')} style={ui.avatar} />
          <View style={{ flex: 1 }}><Text style={ui.brand}>Questblox</Text><Text numberOfLines={1} style={ui.meta}>{displayName} · {t('profile_level', { level: state.level })}</Text></View>
        </Pressable>
        <Text accessibilityLabel={t('coin_count', { count: state.coins })} style={ui.balance}>🪙 {state.coins.toLocaleString()}</Text>
      </View>
      {state.syncError && <Text accessibilityLiveRegion="polite" style={ui.meta}>{t(state.syncError)}</Text>}
      {state.syncError && <Button secondary label={t('sync_retry')} onPress={() => { void state.retryFamilySync(); }} />}
      {pathname !== '/sync-recovery' && (state.syncIssueCount > 0 || state.syncError === 'progress_legacy_pending') && <Button secondary label={`🗂️ ${t('recovery_title')}`} onPress={() => router.push('/sync-recovery')} />}
      <FamilyReconnect />{children}
    </ScrollView>
    </KeyboardAvoidingView>
    <SettingsModal visible={settings} onClose={() => setSettings(false)} />
  </SafeAreaView>;
}
export function ChoiceTabs<T extends string>({ choices, selected, onSelect }: { choices: readonly T[]; selected: T; onSelect: (value: T) => void }) {
  return <View style={ui.row}>{choices.map(choice => <Pressable key={choice} accessibilityRole="tab" accessibilityState={{ selected: selected === choice }} aria-selected={selected === choice} onPress={() => onSelect(choice)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderColor: selected === choice ? palette.gold : 'transparent' }}><Text style={[ui.text, { color: selected === choice ? palette.gold : palette.muted }]}>{choice}</Text></Pressable>)}</View>;
}
export function Button({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, disabled && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}><Text style={[ui.buttonText, secondary && { color: palette.ink }]}>{label}</Text></Pressable>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.max(0, Math.min(100, value))) }} style={ui.track}><View style={[ui.fill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>;
}
export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg }, page: { padding: 20, gap: 22, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 15 },
  brand: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 19 }, balance: { color: palette.gold, backgroundColor: palette.panel, padding: 10, borderRadius: 20, fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  title: { color: palette.ink, fontFamily: 'Nunito_900Black', fontSize: 29 }, heading: { color: palette.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 19 }, text: { color: palette.ink, fontFamily: 'Nunito_700Bold', fontSize: 16, lineHeight: 23 },
  meta: { color: palette.muted, fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 20 }, label: { color: palette.gold, fontFamily: 'Nunito_900Black', fontSize: 12, letterSpacing: 1.4 },
  card: { gap: 14, paddingVertical: 12 },
  button: { backgroundColor: palette.gold, minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, buttonText: { color: palette.bg, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, textAlign: 'center' }, secondary: { backgroundColor: 'transparent' },
  track: { height: 8, backgroundColor: palette.line, borderRadius: 6, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: palette.gold, borderRadius: 6 },
  art: { width: '100%', aspectRatio: 1, borderRadius: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '48%', paddingBottom: 12, gap: 8, borderBottomWidth: 2, borderColor: 'transparent' },
});
