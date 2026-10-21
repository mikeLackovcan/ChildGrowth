import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Coins, Lock, X } from 'lucide-react-native';
import { BackgroundKey, Colors, QUEST_BACKGROUNDS, QuestBackground, ThemeKey, WORLD_THEMES } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import QuestHero from '../../components/QuestHero';
import AnimatedQuestHero from '../../components/AnimatedQuestHero';
import { HEROES } from '../../lib/heroCatalog';
import useReducedMotion from '../../hooks/useReducedMotion';
import ActionSheet from '../../components/ActionSheet';

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

export const AVAILABLE_AVATARS: QuestAvatar[] = HEROES.map(item => hero(
  item.id, item.name, item.price, 'Common', item.personality,
  'Every hero earns the same coins. Choose your favorite!', item.color,
));

export default function ShopScreen() {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [section, setSection] = useState<'Heroes' | 'Backgrounds' | 'Colors'>('Heroes');
  const coins = useAppStore((state) => state.coins);
  const unlocked = useAppStore((state) => state.unlockedAvatars);
  const current = useAppStore((state) => state.currentAvatar);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const unlockedThemes = useAppStore((state) => state.unlockedThemes);
  const activeBackground = useAppStore((state) => state.activeBackground);
  const unlockedBackgrounds = useAppStore((state) => state.unlockedBackgrounds);
  const spendCoins = useAppStore((state) => state.spendCoins);
  const unlockAvatar = useAppStore((state) => state.unlockAvatar);
  const setCurrentAvatar = useAppStore((state) => state.setCurrentAvatar);
  const unlockTheme = useAppStore((state) => state.unlockTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);
  const unlockBackground = useAppStore((state) => state.unlockBackground);
  const setActiveBackground = useAppStore((state) => state.setActiveBackground);
  const [selected, setSelected] = useState<QuestAvatar | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<QuestBackground | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey | null>(null);
  const background = QUEST_BACKGROUNDS[activeBackground] || QUEST_BACKGROUNDS.clean;

  const isUnlocked = (id: string) => id === 'quest_champ' || id === 'quest_sprout' || id === 'default' || unlocked.includes(id);
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
    setSelectedTheme(null);
  };
  const chooseBackground = () => {
    if (!selectedBackground) return;
    if (unlockedBackgrounds.includes(selectedBackground.id)) {
      setActiveBackground(selectedBackground.id);
      setSelectedBackground(null);
      return;
    }
    if (unlockBackground(selectedBackground.id, selectedBackground.price)) setSelectedBackground(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hero shop</Text>
            <Text style={styles.subtitle}>Make it yours.</Text>
          </View>
          <View style={styles.wallet}><Coins size={18} color={Colors.amber} /><Text style={styles.walletText}>{coins}</Text></View>
        </View>

        <View style={[styles.activeCard, { backgroundColor: '#EDF3FF', borderLeftWidth: 4, borderLeftColor: WORLD_THEMES[activeTheme].accent }]}>
          <AnimatedQuestHero id={current} style={styles.activeHero} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>YOUR COMPANION</Text>
            <Text style={styles.activeName}>{AVAILABLE_AVATARS.find((item) => item.id === current)?.name || 'Quest Champ'}</Text>
            <Text style={styles.activeText}>Ready for your next small win.</Text>
          </View>
        </View>

        <View style={styles.sectionTabs}>
          {(['Heroes', 'Backgrounds', 'Colors'] as const).map(item => <TouchableOpacity key={item} style={[styles.sectionTab, section === item && styles.sectionTabSelected]} accessibilityRole="button" accessibilityState={{ selected: section === item }} onPress={() => setSection(item)}><Text style={[styles.sectionTabText, section === item && { color: '#FFFFFF' }]}>{item}</Text></TouchableOpacity>)}
        </View>
        {section === 'Heroes' && <>
        <Text style={styles.sectionSub}>Same rewards. Your favorite character.</Text>
        <View style={styles.grid}>
          {AVAILABLE_AVATARS.map((avatar) => {
            const owned = isUnlocked(avatar.id);
            const equipped = current === avatar.id || (current === 'default' && avatar.id === 'quest_champ');
            return (
              <TouchableOpacity key={avatar.id} accessibilityRole="button" accessibilityLabel={`${avatar.name}, ${equipped ? 'active' : owned ? 'owned' : `${avatar.price} coins`}`} style={[styles.heroCard, { width: width < 500 ? '48%' : '31.5%' }, equipped && styles.heroCardEquipped]} onPress={() => setSelected(avatar)}>
                <QuestHero id={avatar.id} style={styles.heroPortrait} />
                <Text style={styles.heroName}>{avatar.name}</Text>
                <Text style={styles.heroSkill}>{avatar.skillName}</Text>
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
        </>}

        {section === 'Backgrounds' && <>
        <Text style={styles.sectionTitle}>Background worlds</Text>
        <Text style={styles.sectionSub}>50 coins each. White is always free.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {(Object.keys(QUEST_BACKGROUNDS) as BackgroundKey[]).map((key) => {
            const item = QUEST_BACKGROUNDS[key];
            const active = activeBackground === key;
            const owned = unlockedBackgrounds.includes(key);
            return (
              <TouchableOpacity key={key} onPress={() => setSelectedBackground(item)} style={[styles.backgroundCard, { backgroundColor: item.background, borderColor: active ? item.accent : Colors.border }]}>
                <Text style={styles.themeIcon}>{item.icon}</Text>
                <Text style={styles.backgroundName}>{item.name}</Text>
                <Text style={[styles.themePrice, { color: Colors.textSecondary }]}>{active ? '✓ Active' : owned ? 'Owned' : `${item.price} coins`}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </>}

        {section === 'Colors' && <>
        <Text style={styles.sectionTitle}>Hero colors</Text>
        <Text style={styles.sectionSub}>A little color around your companion.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {(Object.keys(WORLD_THEMES) as ThemeKey[]).map((key) => {
            const theme = WORLD_THEMES[key];
            const active = activeTheme === key;
            const owned = unlockedThemes.includes(key) || theme.price === 0;
            return (
              <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`${theme.name}, ${owned ? 'owned' : `${theme.price} coins`}`} onPress={() => setSelectedTheme(key)} style={[styles.themeCard, { backgroundColor: theme.background }, active && styles.themeCardActive]}>
                <Text style={styles.themeIcon}>{theme.icon}</Text>
                <Text style={[styles.themeName, { color: theme.text }]}>{theme.name}</Text>
                <Text style={[styles.themePrice, { color: theme.textSecondary }]}>{active ? 'Active' : owned ? 'Owned' : `${theme.price} coins`}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </>}
      </ScrollView>

      <Modal visible={Boolean(selected)} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {selected && (
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.close} accessibilityLabel="Close hero preview" onPress={() => setSelected(null)}><X size={20} color={Colors.textSecondary} /></TouchableOpacity>
              <AnimatedQuestHero id={selected.id} style={styles.modalHero} motion="celebrate" />
              <Text style={styles.modalName}>{selected.name}</Text>
              <Text style={styles.modalSkill}>{selected.skillName}</Text>
              <Text style={styles.modalDescription}>{selected.skillDesc}</Text>
              {!isUnlocked(selected.id) && coins < selected.price && <Text style={styles.modalDescription}>{selected.price - coins} more coins to go</Text>}
              <TouchableOpacity disabled={!isUnlocked(selected.id) && coins < selected.price} style={[styles.primaryButton, !isUnlocked(selected.id) && coins < selected.price && { opacity: 0.45 }]} onPress={chooseHero}>
                <Text style={styles.primaryButtonText}>{isUnlocked(selected.id) ? 'Use this hero' : `Unlock for ${selected.price} coins`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={Boolean(selectedBackground)} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setSelectedBackground(null)}>
        <View style={styles.overlay}>
          {selectedBackground && (
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.close} onPress={() => setSelectedBackground(null)}><X size={20} color={Colors.textSecondary} /></TouchableOpacity>
              <View style={[styles.backgroundPreview, { backgroundColor: selectedBackground.background, borderColor: selectedBackground.accent }]}>
                <Text style={styles.backgroundPreviewIcon}>{selectedBackground.icon}</Text>
              </View>
              <Text style={styles.modalName}>{selectedBackground.name}</Text>
              <Text style={styles.modalDescription}>A calm background for your main quest tabs.</Text>
              <TouchableOpacity
                disabled={!unlockedBackgrounds.includes(selectedBackground.id) && coins < selectedBackground.price}
                style={[styles.primaryButton, !unlockedBackgrounds.includes(selectedBackground.id) && coins < selectedBackground.price && { opacity: 0.45 }]}
                onPress={chooseBackground}
              >
                <Text style={styles.primaryButtonText}>{unlockedBackgrounds.includes(selectedBackground.id) ? 'Use this background' : `Unlock for ${selectedBackground.price} coins`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
      <ActionSheet visible={Boolean(selectedTheme)} title={selectedTheme ? WORLD_THEMES[selectedTheme].name : 'Hero color'} onClose={() => setSelectedTheme(null)}>
        {selectedTheme && <>
          <View style={[styles.backgroundPreview, { alignSelf: 'center', backgroundColor: WORLD_THEMES[selectedTheme].background, borderColor: WORLD_THEMES[selectedTheme].accent }]}>
            <QuestHero id={current} style={{ width: 108, height: 108 }} />
          </View>
          <Text style={styles.modalDescription}>Your companion’s accent color. Quest screens stay calm and easy to read.</Text>
          <TouchableOpacity accessibilityRole="button"
            disabled={!unlockedThemes.includes(selectedTheme) && coins < WORLD_THEMES[selectedTheme].price}
            style={[styles.primaryButton, !unlockedThemes.includes(selectedTheme) && coins < WORLD_THEMES[selectedTheme].price && { opacity: 0.45 }]}
            onPress={() => chooseTheme(selectedTheme)}>
            <Text style={styles.primaryButtonText}>{unlockedThemes.includes(selectedTheme) ? 'Use this color' : `Unlock for ${WORLD_THEMES[selectedTheme].price} coins`}</Text>
          </TouchableOpacity>
        </>}
      </ActionSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 29, color: Colors.text },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 72, justifyContent: 'center', height: 42, borderRadius: 21, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  walletText: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text },
  activeCard: { minHeight: 128, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, backgroundColor: Colors.primary, marginBottom: 27, overflow: 'hidden' },
  activeHero: { width: 112, height: 112, marginRight: 12 },
  eyebrow: { fontFamily: 'Nunito_800ExtraBold', color: Colors.textSecondary, fontSize: 12, letterSpacing: 1 },
  activeName: { fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 23, marginTop: 3 },
  activeText: { fontFamily: 'Nunito_600SemiBold', color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 21, color: Colors.text, marginBottom: 3 },
  sectionSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  sectionTabs: { flexDirection: 'row', gap: 6, marginBottom: 22 },
  sectionTab: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#EFF3FA' },
  sectionTabSelected: { backgroundColor: Colors.primary },
  sectionTabText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: Colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9, marginBottom: 28 },
  heroCard: { width: '31.5%', minWidth: 104, alignItems: 'center', padding: 10, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  heroCardEquipped: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.blueDim },
  heroPortrait: { width: 108, height: 108 },
  heroName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text, textAlign: 'center', marginTop: 6 },
  heroSkill: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 16, textAlign: 'center', color: Colors.textSecondary, marginTop: 3 },
  equippedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#CBF250' },
  equippedText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: Colors.text },
  ownedText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.primary, marginTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  priceText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.textSecondary },
  themeRow: { gap: 10, paddingBottom: 6 },
  themeCard: { width: 138, minHeight: 110, padding: 14, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  themeCardActive: { borderColor: '#CBF250' },
  backgroundCard: { width: 132, minHeight: 108, padding: 14, borderRadius: 20, borderWidth: 2 },
  backgroundName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: Colors.text, marginTop: 7 },
  backgroundPreview: { width: 150, height: 112, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backgroundPreviewIcon: { fontSize: 52 },
  themeIcon: { fontSize: 25 },
  themeName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, marginTop: 8 },
  themePrice: { fontFamily: 'Nunito_700Bold', fontSize: 14, marginTop: 3 },
  overlay: { flex: 1, backgroundColor: 'rgba(8,26,75,0.56)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 24, borderRadius: 28, backgroundColor: Colors.surface },
  close: { alignSelf: 'flex-end', width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  modalHero: { width: 145, height: 145 },
  modalName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: Colors.text, marginTop: 10 },
  modalSkill: { fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: Colors.primary, marginTop: 4 },
  modalDescription: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  primaryButton: { width: '100%', minHeight: 54, backgroundColor: Colors.primary, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontFamily: 'Nunito_800ExtraBold', color: '#FFFFFF', fontSize: 15 },
});
