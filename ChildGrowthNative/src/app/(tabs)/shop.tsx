import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Coins, Lock, X } from 'lucide-react-native';
import { Colors, ThemeKey, WORLD_THEMES } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import QuestHero from '../../components/QuestHero';

export interface QuestAvatar {
  id: string;
  name: string;
  price: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  skillName: string;
  skillDesc: string;
  color: string;
  emoji?: string;
}

const hero = (id: string, name: string, price: number, rarity: QuestAvatar['rarity'], skillName: string, skillDesc: string, color: string): QuestAvatar => ({
  id, name, price, rarity, skillName, skillDesc, color,
});

export const AVAILABLE_AVATARS: QuestAvatar[] = [
  hero('quest_sprout', 'Sprout Hero', 0, 'Common', 'Beginner luck', '+10% coins on easy quests', '#3270EB'),
  hero('quest_ember', 'Ember Hero', 350, 'Common', 'Daily spark', '+15% XP from daily quests', '#FF806C'),
  hero('quest_drift', 'Drift Hero', 700, 'Common', 'Steady steps', 'Protect one missed-day streak', '#6EABDE'),
  hero('quest_forge', 'Forge Hero', 1400, 'Rare', 'Ready to help', 'Extra coins for home chores', '#D9A34E'),
  hero('quest_coral', 'Coral Hero', 2100, 'Rare', 'Kindness boost', 'Bonus on helping quests', '#E68DAC'),
  hero('quest_dusk', 'Dusk Hero', 2800, 'Rare', 'Focus time', 'Faster progress on focus quests', '#9B83D5'),
  hero('quest_jade', 'Jade Hero', 3500, 'Epic', 'Growing strong', '+25% XP across quests', '#55AD84'),
  hero('quest_nova', 'Nova Hero', 4200, 'Epic', 'Learning light', 'Bonus coins for reading and math', '#7887DA'),
  hero('quest_pulse', 'Pulse Hero', 4900, 'Epic', 'Momentum', '+50 XP after a full quest day', '#48BFD5'),
  hero('quest_prism', 'Prism Hero', 5600, 'Legendary', 'Bright outlook', 'A bonus family reward chance', '#B485D3'),
  hero('quest_frost', 'Frost Hero', 6300, 'Legendary', 'Stay cool', 'One automatic streak saver', '#8CCDD4'),
  hero('quest_sunrise', 'Sunrise Hero', 7000, 'Legendary', 'Fresh start', '+50% coins and XP on a perfect day', '#EAC263'),
];

export default function ShopScreen() {
  const coins = useAppStore((state) => state.coins);
  const unlocked = useAppStore((state) => state.unlockedAvatars);
  const current = useAppStore((state) => state.currentAvatar);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const unlockedThemes = useAppStore((state) => state.unlockedThemes);
  const spendCoins = useAppStore((state) => state.spendCoins);
  const unlockAvatar = useAppStore((state) => state.unlockAvatar);
  const setCurrentAvatar = useAppStore((state) => state.setCurrentAvatar);
  const unlockTheme = useAppStore((state) => state.unlockTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const [selected, setSelected] = useState<QuestAvatar | null>(null);

  const isUnlocked = (id: string) => id === 'quest_sprout' || id === 'default' || unlocked.includes(id);
  const chooseHero = () => {
    if (!selected) return;
    if (isUnlocked(selected.id)) {
      setCurrentAvatar(selected.id);
      setSelected(null);
      return;
    }
    if (spendCoins(selected.price)) {
      unlockAvatar(selected.id);
      setCurrentAvatar(selected.id);
      setSelected(null);
    }
  };
  const chooseTheme = (key: ThemeKey) => {
    const theme = WORLD_THEMES[key];
    if (unlockedThemes.includes(key) || theme.price === 0) setActiveTheme(key);
    else if (unlockTheme(key, theme.price)) setActiveTheme(key);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hero shop</Text>
            <Text style={styles.subtitle}>Use quest coins to personalize your journey.</Text>
          </View>
          <View style={styles.wallet}><Coins size={18} color={Colors.amber} /><Text style={styles.walletText}>{coins}</Text></View>
        </View>

        <View style={styles.activeCard}>
          <QuestHero id={current} style={styles.activeHero} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>YOUR QUEST HERO</Text>
            <Text style={styles.activeName}>{AVAILABLE_AVATARS.find((item) => item.id === current)?.name || 'Sprout Hero'}</Text>
            <Text style={styles.activeText}>A friendly companion for every small win.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Meet the heroes</Text>
        <View style={styles.grid}>
          {AVAILABLE_AVATARS.map((avatar) => {
            const owned = isUnlocked(avatar.id);
            const equipped = current === avatar.id || (current === 'default' && avatar.id === 'quest_sprout');
            return (
              <TouchableOpacity key={avatar.id} style={[styles.heroCard, equipped && styles.heroCardEquipped]} onPress={() => setSelected(avatar)}>
                <QuestHero id={avatar.id} style={styles.heroPortrait} />
                <Text style={styles.heroName}>{avatar.name}</Text>
                <Text style={styles.heroSkill} numberOfLines={1}>{avatar.skillName}</Text>
                {equipped ? (
                  <View style={styles.equippedPill}><Check size={13} color={Colors.text} /><Text style={styles.equippedText}>Active</Text></View>
                ) : owned ? (
                  <Text style={styles.ownedText}>Tap to equip</Text>
                ) : (
                  <View style={styles.priceRow}><Lock size={12} color={Colors.textMuted} /><Text style={styles.priceText}>{avatar.price}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Color worlds</Text>
        <Text style={styles.sectionSub}>Choose a look that feels like yours.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {(Object.keys(WORLD_THEMES) as ThemeKey[]).map((key) => {
            const theme = WORLD_THEMES[key];
            const active = activeTheme === key;
            const owned = unlockedThemes.includes(key) || theme.price === 0;
            return (
              <TouchableOpacity key={key} onPress={() => chooseTheme(key)} style={[styles.themeCard, { backgroundColor: theme.background }, active && styles.themeCardActive]}>
                <Text style={styles.themeIcon}>{theme.icon}</Text>
                <Text style={[styles.themeName, { color: theme.text }]}>{theme.name}</Text>
                <Text style={[styles.themePrice, { color: theme.textSecondary }]}>{active ? 'Active' : owned ? 'Owned' : `${theme.price} coins`}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {selected && (
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.close} onPress={() => setSelected(null)}><X size={20} color={Colors.textSecondary} /></TouchableOpacity>
              <QuestHero id={selected.id} style={styles.modalHero} />
              <Text style={styles.modalName}>{selected.name}</Text>
              <Text style={styles.modalSkill}>{selected.skillName}</Text>
              <Text style={styles.modalDescription}>{selected.skillDesc}</Text>
              <TouchableOpacity disabled={!isUnlocked(selected.id) && coins < selected.price} style={[styles.primaryButton, !isUnlocked(selected.id) && coins < selected.price && { opacity: 0.45 }]} onPress={chooseHero}>
                <Text style={styles.primaryButtonText}>{isUnlocked(selected.id) ? 'Use this hero' : `Unlock for ${selected.price} coins`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 29, color: Colors.text },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 72, justifyContent: 'center', height: 42, borderRadius: 21, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  walletText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  activeCard: { minHeight: 128, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, backgroundColor: Colors.primary, marginBottom: 27, overflow: 'hidden' },
  activeHero: { width: 102, height: 102, marginRight: 15 },
  eyebrow: { fontFamily: 'Nunito_800ExtraBold', color: '#DCE8FF', fontSize: 10, letterSpacing: 1.1 },
  activeName: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 22, marginTop: 3 },
  activeText: { fontFamily: 'Nunito_600SemiBold', color: '#DCE8FF', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 21, color: Colors.text, marginBottom: 3 },
  sectionSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9, marginBottom: 28 },
  heroCard: { width: '31.5%', minWidth: 104, alignItems: 'center', padding: 10, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  heroCardEquipped: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.blueDim },
  heroPortrait: { width: 72, height: 72 },
  heroName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: Colors.text, textAlign: 'center', marginTop: 6 },
  heroSkill: { fontFamily: 'Nunito_600SemiBold', fontSize: 9, color: Colors.textSecondary, marginTop: 2 },
  equippedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#CBF250' },
  equippedText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 9, color: Colors.text },
  ownedText: { fontFamily: 'Nunito_700Bold', fontSize: 9, color: Colors.primary, marginTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  priceText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: Colors.textMuted },
  themeRow: { gap: 10, paddingBottom: 6 },
  themeCard: { width: 138, minHeight: 110, padding: 14, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  themeCardActive: { borderColor: '#CBF250' },
  themeIcon: { fontSize: 25 },
  themeName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, marginTop: 8 },
  themePrice: { fontFamily: 'Nunito_700Bold', fontSize: 10, marginTop: 3 },
  overlay: { flex: 1, backgroundColor: 'rgba(8,26,75,0.56)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 24, borderRadius: 28, backgroundColor: Colors.surface },
  close: { alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  modalHero: { width: 145, height: 145 },
  modalName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: Colors.text, marginTop: 10 },
  modalSkill: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.primary, marginTop: 4 },
  modalDescription: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  primaryButton: { width: '100%', minHeight: 54, backgroundColor: Colors.primary, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 },
});
