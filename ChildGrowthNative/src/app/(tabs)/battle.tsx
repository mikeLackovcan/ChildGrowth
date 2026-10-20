import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { 
  Swords, 
  Shield, 
  Zap, 
  Trophy, 
  Sparkles, 
  Flame, 
  ShoppingBag, 
  Clock, 
  Dumbbell, 
  ChevronRight,
  Heart,
  Gauge
} from 'lucide-react-native';

export interface RobloxAvatar {
  id: string;
  name: string;
  price: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  skillName: string;
  skillDesc: string;
  image?: any;
  color: string;
  hp: number;
  attack: number;
  speed: number;
  battleSkill: string;
  battleSkillDesc: string;
  battleClass: string;
  blastIcon: string;
}

export const ALL_ROBLOX_FIGURES: RobloxAvatar[] = [
  { 
    id: 'questblox_hero', 
    name: 'QuestBlox Hero', 
    price: 0, 
    rarity: 'Legendary', 
    skillName: 'Star Power ⭐', 
    skillDesc: '+15% Coins & XP on All Quests',
    image: require('../../assets/images/questblox_hero.png'),
    color: '#FFB800',
    hp: 130,
    attack: 28,
    speed: 26,
    battleSkill: 'Star Blast ⭐',
    battleSkillDesc: 'Strikes with radiant star energy for 32 damage!',
    battleClass: 'Star Champion ⭐',
    blastIcon: '⭐'
  },
  { 
    id: 'roblox_noob', 
    name: 'Roblox Noob', 
    price: 0, 
    rarity: 'Common', 
    skillName: 'Beginner Luck 🍀', 
    skillDesc: '+10% Bonus Coins on Easy Quests',
    image: require('../../assets/images/roblox_noob.png'),
    color: '#FBBF24',
    hp: 100,
    attack: 20,
    speed: 20,
    battleSkill: 'Noob Cannon 👊',
    battleSkillDesc: 'Deals 25 damage with 15% chance to stun opponent.',
    battleClass: 'Brawler 🥊',
    blastIcon: '👊'
  },
  { 
    id: 'roblox_bacon_hair', 
    name: 'Bacon Hair', 
    price: 350, 
    rarity: 'Common', 
    skillName: 'Crispy Focus 🔥', 
    skillDesc: '+15% XP Boost from Daily Quests',
    image: require('../../assets/images/roblox_bacon_hair.png'),
    color: '#EF4444',
    hp: 120,
    attack: 25,
    speed: 25,
    battleSkill: 'Crispy Fireball Cannon 🔥',
    battleSkillDesc: 'Launches a sizzling fireball blast dealing 35 fire damage.',
    battleClass: 'Fire Fighter 🔥',
    blastIcon: '🔥'
  },
  { 
    id: 'roblox_guest', 
    name: 'Roblox Guest', 
    price: 700, 
    rarity: 'Common', 
    skillName: 'Stealth Shield 🛡️', 
    skillDesc: '1-Day Free Sick Mode Streak Protection',
    image: require('../../assets/images/roblox_guest.png'),
    color: '#3B82F6',
    hp: 110,
    attack: 30,
    speed: 45,
    battleSkill: 'Shadow Shuriken Cannon 🥷',
    battleSkillDesc: 'Launches spinning ninja shurikens dealing 40 damage.',
    battleClass: 'Ninja 🥷',
    blastIcon: '🥷'
  },
  { 
    id: 'roblox_builderman', 
    name: 'Builderman', 
    price: 1400, 
    rarity: 'Rare', 
    skillName: 'Master Architect 🏗️', 
    skillDesc: 'Earn 2x Coins on Medium & Hard Quests',
    image: require('../../assets/images/roblox_builderman.png'),
    color: '#F59E0B',
    hp: 180,
    attack: 35,
    speed: 15,
    battleSkill: 'Brick Wall Fortress 🧱',
    battleSkillDesc: 'Shields HP and counters with a heavy brick blast.',
    battleClass: 'Heavy Tank 🏗️',
    blastIcon: '🧱'
  },
  { 
    id: 'roblox_flamingo', 
    name: 'Flamingo', 
    price: 2100, 
    rarity: 'Rare', 
    skillName: 'Chill Vibe 🍨', 
    skillDesc: 'Unlocks Bonus Ice Cream Prize Wheel Slice',
    image: require('../../assets/images/roblox_flamingo.png'),
    color: '#EC4899',
    hp: 140,
    attack: 40,
    speed: 30,
    battleSkill: 'Ice Cream Freeze Beam 🍨',
    battleSkillDesc: 'Restores +30 HP and freezes rival for 1 turn.',
    battleClass: 'Support Mage 🍨',
    blastIcon: '🍨'
  },
  { 
    id: 'roblox_ninja',
    name: 'Roblox Ninja',
    price: 2800,
    rarity: 'Rare',
    skillName: 'Shadow Speed ⚡',
    skillDesc: 'Fast-Charge Hold-to-Claim Boss Quests',
    image: require('../../assets/images/roblox_ninja.png'),
    color: '#8B5CF6',
    hp: 130,
    attack: 50,
    speed: 60,
    battleSkill: 'Shadow Katana Blast ⚡',
    battleSkillDesc: 'Delivers a rapid double energy strike dealing 60 damage.',
    battleClass: 'Speedster ⚡',
    blastIcon: '⚡'
  },
  { 
    id: 'roblox_dominus',
    name: 'Dominus Valkyrie',
    price: 3500,
    rarity: 'Epic',
    skillName: 'Crown of Power 👑',
    skillDesc: '+25% XP Multiplier across ALL Quests',
    image: require('../../assets/images/roblox_dominus.png'),
    color: '#10B981',
    hp: 200,
    attack: 55,
    speed: 35,
    battleSkill: 'Valkyrie Holy Laser 👑',
    battleSkillDesc: 'Smites rival figure with 70 holy radiant damage.',
    battleClass: 'Paladin 👑',
    blastIcon: '✨'
  },
  { 
    id: 'roblox_bloxy',
    name: 'Golden Bloxy Champ',
    price: 7000,
    rarity: 'Legendary',
    skillName: 'Ultimate Champion 🏆',
    skillDesc: '+50% Coins & XP Multiplier on ALL Quests!',
    image: require('../../assets/images/roblox_bloxy.png'),
    color: '#F59E0B',
    hp: 280,
    attack: 85,
    speed: 50,
    battleSkill: 'Bloxy Winner Cannon 🏆',
    battleSkillDesc: 'Ultimate Champion Cannon! Deals 100 massive damage.',
    battleClass: 'Mythic Champ 🌟',
    blastIcon: '🌟'
  }
];

export default function BattleScreen() {
  const { t } = useTranslation();
  const currentAvatar = useAppStore((state) => state.currentAvatar);
  
  // Find current active hero
  const activeHero = ALL_ROBLOX_FIGURES.find(
    (a) => a.id === currentAvatar || ((currentAvatar === 'default' || !currentAvatar) && a.id === 'questblox_hero')
  ) || ALL_ROBLOX_FIGURES[0];

  const [previewFigureId, setPreviewFigureId] = useState<string>(activeHero.id);
  const selectedFigure = ALL_ROBLOX_FIGURES.find((f) => f.id === previewFigureId) || activeHero;

  const powerLevel = Math.floor(selectedFigure.hp * 1.2 + selectedFigure.attack * 3.5 + selectedFigure.speed * 2.2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.headerIconCircle}>
              <Swords size={20} color={Colors.amber} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('tab_battle', 'Battle Arena')}</Text>
              <Text style={styles.headerSub}>{t('battle_coming_soon_sub', 'Arcade Combat • Update V2.0')}</Text>
            </View>
          </View>
        </View>

        {/* ARENA HERO SHOWCASE */}
        <View style={styles.arenaStageCard}>
          <View style={styles.arenaHeaderRow}>
            <View style={styles.comingSoonBadge}>
              <Clock size={12} color={Colors.amber} />
              <Text style={styles.comingSoonBadgeText}>V2.0 ARENA PREVIEW</Text>
            </View>
            {selectedFigure.id === activeHero.id && (
              <View style={styles.activeTag}>
                <Sparkles size={11} color="#10B981" />
                <Text style={styles.activeTagText}>EQUIPPED</Text>
              </View>
            )}
          </View>

          {/* Large Hero Figure in Arena Spotlight */}
          <View style={styles.pedestalStage}>
            <Image source={selectedFigure.image} style={styles.arenaHeroImg} resizeMode="contain" />
            <View style={[styles.pedestalBase, { borderColor: selectedFigure.color }]} />
          </View>

          {/* Hero Name, Class & Rarity */}
          <Text style={styles.arenaHeroName}>{selectedFigure.name}</Text>
          <Text style={styles.arenaHeroClass}>{selectedFigure.battleClass} · {selectedFigure.rarity}</Text>

          {/* 3 Compact Stat Chips */}
          <View style={styles.statChipsRow}>
            <View style={styles.statChip}>
              <Heart size={13} color="#EF4444" />
              <Text style={styles.statChipText}>{selectedFigure.hp} HP</Text>
            </View>
            <View style={styles.statChip}>
              <Flame size={13} color="#F59E0B" />
              <Text style={styles.statChipText}>{selectedFigure.attack} ATK</Text>
            </View>
            <View style={styles.statChip}>
              <Gauge size={13} color="#3B82F6" />
              <Text style={styles.statChipText}>{selectedFigure.speed} SPD</Text>
            </View>
          </View>

          {/* Special Battle Move */}
          <View style={styles.specialMovePill}>
            <Text style={{ fontSize: 13 }}>{selectedFigure.blastIcon}</Text>
            <Text style={styles.specialMoveTitle}>{selectedFigure.battleSkill}</Text>
          </View>
        </View>

        {/* ROSTER CAROUSEL */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>EXPLORE ALL FIGHTERS 🦹</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {ALL_ROBLOX_FIGURES.map((fig) => {
              const isSelected = fig.id === previewFigureId;
              const isHero = fig.id === activeHero.id;
              return (
                <TouchableOpacity
                  key={fig.id}
                  style={[
                    styles.rosterCard,
                    isSelected && { borderColor: Colors.amber, borderWidth: 2, backgroundColor: Colors.surface2 }
                  ]}
                  onPress={() => setPreviewFigureId(fig.id)}
                  activeOpacity={0.8}
                >
                  {isHero && (
                    <View style={styles.heroBadgeTiny}>
                      <Text style={styles.heroBadgeTinyText}>HERO</Text>
                    </View>
                  )}
                  <Image source={fig.image} style={styles.rosterCardImg} resizeMode="contain" />
                  <Text style={styles.rosterCardName} numberOfLines={1}>{fig.name}</Text>
                  <Text style={styles.rosterCardClass}>{fig.battleClass}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* PREPARE IN SHOP CALL-TO-ACTION */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.shopCtaCard}
            onPress={() => router.push('/(tabs)/shop')}
            activeOpacity={0.85}
          >
            <View style={styles.shopCtaIconCircle}>
              <ShoppingBag size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopCtaTitle}>PREPARE YOUR ROSTER IN THE SHOP 🛒</Text>
              <Text style={styles.shopCtaSub}>Unlock legendary avatars using your quest coins!</Text>
            </View>
            <ChevronRight size={20} color={Colors.amber} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: '#94A3B8',
  },
  arenaStageCard: {
    backgroundColor: '#151926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  arenaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  pedestalStage: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  arenaHeroImg: {
    width: 110,
    height: 110,
    zIndex: 2,
  },
  pedestalBase: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 30,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    transform: [{ scaleY: 0.4 }],
  },
  arenaHeroName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  arenaHeroClass: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.amber,
    marginTop: 2,
    marginBottom: 14,
  },
  statChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statChipText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#E2E8F0',
  },
  specialMovePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  specialMoveTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,179,0,0.15)',
    borderWidth: 1,
    borderColor: Colors.amber,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  comingSoonBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  heroDescription: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 10,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  secTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.text,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  activeTagText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: '#10B981',
  },
  figureCard: {
    backgroundColor: '#151926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  figureTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 64,
    height: 64,
  },
  figureName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: Colors.text,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rarityText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
  },
  figureClass: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  powerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,179,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  powerPillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  statMetersContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meterLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 50,
  },
  meterLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  meterTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.text,
    width: 32,
    textAlign: 'right',
  },
  specialSkillCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
  },
  specialSkillEmoji: {
    fontSize: 14,
  },
  specialSkillTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
  },
  specialSkillDesc: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  rosterCard: {
    width: 90,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    position: 'relative',
  },
  heroBadgeTiny: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10B981',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 5,
  },
  heroBadgeTinyText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 8,
    color: '#FFF',
  },
  rosterCardImg: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  rosterCardName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
  },
  rosterCardClass: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  shopCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 14,
  },
  shopCtaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCtaTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
  },
  shopCtaSub: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  roadmapCard: {
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  roadmapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.amber,
    marginTop: 5,
  },
  roadmapItemTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 2,
  },
  roadmapItemSub: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
