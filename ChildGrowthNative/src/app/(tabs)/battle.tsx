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
import LanguageSwitcher from '../../components/LanguageSwitcher';

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
    (a) => a.id === currentAvatar || (currentAvatar === 'default' && a.id === 'roblox_noob')
  ) || ALL_ROBLOX_FIGURES[0];

  const [previewFigureId, setPreviewFigureId] = useState<string>(activeHero.id);
  const selectedFigure = ALL_ROBLOX_FIGURES.find((f) => f.id === previewFigureId) || activeHero;

  const powerLevel = Math.floor(selectedFigure.hp * 1.2 + selectedFigure.attack * 3.5 + selectedFigure.speed * 2.2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={styles.headerIconCircle}>
              <Swords size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('battle_arena_title', 'Battle Arena ⚔️')}</Text>
              <Text style={styles.headerSub}>{t('battle_coming_soon_sub', 'Under Construction • Coming Soon')}</Text>
            </View>
          </View>
          <LanguageSwitcher />
        </View>

        {/* HERO BANNER - ARENA UNDER CONSTRUCTION */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.comingSoonBadge}>
              <Clock size={14} color={Colors.amber} />
              <Text style={styles.comingSoonBadgeText}>COMING SOON • UPDATE V2.0</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>THE ARENA IS BEING FORGED! ⚔️🛡️</Text>
          <Text style={styles.heroDescription}>
            Get ready for real-time arcade combat with your unlocked Roblox avatars! 
            Complete daily quests to level up your hero and stockpile coins for legendary fighters.
          </Text>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🥊</Text>
              <Text style={styles.featureText}>Real-Time Combat</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💥</Text>
              <Text style={styles.featureText}>Super Blasts</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🏆</Text>
              <Text style={styles.featureText}>Ranked Leagues</Text>
            </View>
          </View>
        </View>

        {/* ACTIVE / SELECTED FIGHTER SHOWCASE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>FIGHTER INSPECTOR & STATS</Text>
            {selectedFigure.id === activeHero.id && (
              <View style={styles.activeTag}>
                <Sparkles size={12} color="#10B981" />
                <Text style={styles.activeTagText}>EQUIPPED HERO</Text>
              </View>
            )}
          </View>

          <View style={styles.figureCard}>
            <View style={styles.figureTopRow}>
              <View style={[styles.avatarBox, { borderColor: selectedFigure.color }]}>
                <Image source={selectedFigure.image} style={styles.avatarImg} resizeMode="contain" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.figureName}>{selectedFigure.name}</Text>
                  <View style={[styles.rarityBadge, { backgroundColor: `${selectedFigure.color}25` }]}>
                    <Text style={[styles.rarityText, { color: selectedFigure.color }]}>{selectedFigure.rarity}</Text>
                  </View>
                </View>

                <Text style={styles.figureClass}>{selectedFigure.battleClass}</Text>

                <View style={styles.powerPill}>
                  <Zap size={14} color={Colors.amber} />
                  <Text style={styles.powerPillText}>POWER LEVEL: {powerLevel}</Text>
                </View>
              </View>
            </View>

            {/* STAT METERS */}
            <View style={styles.statMetersContainer}>
              {/* HP Meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterLabelBox}>
                  <Heart size={14} color="#EF4444" />
                  <Text style={styles.meterLabel}>HP</Text>
                </View>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, (selectedFigure.hp / 300) * 100)}%`, backgroundColor: '#EF4444' }]} />
                </View>
                <Text style={styles.meterValue}>{selectedFigure.hp}</Text>
              </View>

              {/* ATK Meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterLabelBox}>
                  <Flame size={14} color="#F59E0B" />
                  <Text style={styles.meterLabel}>ATK</Text>
                </View>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, (selectedFigure.attack / 100) * 100)}%`, backgroundColor: '#F59E0B' }]} />
                </View>
                <Text style={styles.meterValue}>{selectedFigure.attack}</Text>
              </View>

              {/* SPD Meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterLabelBox}>
                  <Gauge size={14} color="#3B82F6" />
                  <Text style={styles.meterLabel}>SPD</Text>
                </View>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, (selectedFigure.speed / 80) * 100)}%`, backgroundColor: '#3B82F6' }]} />
                </View>
                <Text style={styles.meterValue}>{selectedFigure.speed}</Text>
              </View>
            </View>

            {/* SPECIAL BATTLE MOVE */}
            <View style={styles.specialSkillCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={styles.specialSkillEmoji}>{selectedFigure.blastIcon}</Text>
                <Text style={styles.specialSkillTitle}>{selectedFigure.battleSkill}</Text>
              </View>
              <Text style={styles.specialSkillDesc}>{selectedFigure.battleSkillDesc}</Text>
            </View>
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
              <ShoppingBag size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopCtaTitle}>PREPARE YOUR ROSTER IN THE SHOP 🛒</Text>
              <Text style={styles.shopCtaSub}>Unlock legendary avatars using your quest coins!</Text>
            </View>
            <ChevronRight size={22} color={Colors.amber} />
          </TouchableOpacity>
        </View>

        {/* WHAT'S COMING CARD */}
        <View style={styles.section}>
          <Text style={styles.secTitle}>ROADMAP SNEAK PEEK 🗺️</Text>
          <View style={styles.roadmapCard}>
            <View style={styles.roadmapItem}>
              <View style={styles.roadmapDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.roadmapItemTitle}>Real-time PvP & Bot Battles</Text>
                <Text style={styles.roadmapItemSub}>Dodge, block, jump and chain combo strikes against friends or AI bots.</Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.roadmapItemTitle}>Elemental Super Finishers</Text>
                <Text style={styles.roadmapItemSub}>Charge your energy meter to fire Hadokens, freeze beams and holy smites.</Text>
              </View>
            </View>

            <View style={styles.roadmapItem}>
              <View style={styles.roadmapDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.roadmapItemTitle}>Weekly Battle Trophy League</Text>
                <Text style={styles.roadmapItemSub}>Climb divisions, earn trophy cups, and win rare avatar skins.</Text>
              </View>
            </View>
          </View>
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
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
    backgroundColor: Colors.surface2,
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
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface2,
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
    backgroundColor: Colors.surface2,
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
    backgroundColor: 'rgba(232,0,27,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,0,27,0.25)',
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
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
