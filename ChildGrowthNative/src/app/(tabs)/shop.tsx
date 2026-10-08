import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Layout, WORLD_THEMES, ThemeKey } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { ShoppingBag, Coins, Check, Zap, X, Shield, Sparkles, Star, Lock } from 'lucide-react-native';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export interface RobloxAvatar {
  id: string;
  name: string;
  price: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  skillName: string;
  skillDesc: string;
  image?: any;
  emoji?: string;
  color: string;
  // Battle Combat System Stats
  hp: number;
  attack: number;
  speed: number;
  battleSkill: string;
  battleSkillDesc: string;
  battleClass: string;
}

export const AVAILABLE_AVATARS: RobloxAvatar[] = [
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
    attack: 15,
    speed: 20,
    battleSkill: 'Noob Punch 👊',
    battleSkillDesc: 'Deals 20 damage with 10% chance to stun opponent.',
    battleClass: 'Brawler 🥊'
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
    battleSkill: 'Crispy Fireball 🔥',
    battleSkillDesc: 'Launches a sizzle fireball dealing 35 fire damage.',
    battleClass: 'Fire Fighter 🔥'
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
    battleSkill: 'Stealth Counter 🥷',
    battleSkillDesc: 'Dodges incoming attack and strikes back for 40 damage.',
    battleClass: 'Ninja 🥷'
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
    battleSkill: 'Brick Wall 🧱',
    battleSkillDesc: 'Constructs a fortress shielding +50 HP for 2 battle turns.',
    battleClass: 'Heavy Tank 🏗️'
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
    battleSkill: 'Ice Cream Freeze 🍨',
    battleSkillDesc: 'Restores +30 HP to figure and slows enemy speed.',
    battleClass: 'Support Mage 🍨'
  },
  { 
    id: 'roblox_ninja',
    name: 'Roblox Ninja',
    price: 2800,
    rarity: 'Rare',
    skillName: 'Shadow Speed',
    skillDesc: 'Fast-Charge Hold-to-Claim Boss Quests',
    image: require('../../assets/images/roblox_ninja.png'),
    color: '#8B5CF6',
    hp: 130,
    attack: 50,
    speed: 60,
    battleSkill: 'Shadow Katana ⚡',
    battleSkillDesc: 'Delivers a rapid double strike dealing 60 critical damage.',
    battleClass: 'Speedster ⚡'
  },
  { 
    id: 'roblox_dominus',
    name: 'Dominus Valkyrie',
    price: 3500,
    rarity: 'Epic',
    skillName: 'Crown of Power',
    skillDesc: '+25% XP Multiplier across ALL Quests',
    image: require('../../assets/images/roblox_dominus.png'),
    color: '#10B981',
    hp: 200,
    attack: 55,
    speed: 35,
    battleSkill: 'Valkyrie Strike 👑',
    battleSkillDesc: 'Smites rival figure with 70 holy radiant damage.',
    battleClass: 'Paladin 👑'
  },
  { 
    id: 'roblox_wizard',
    name: 'Galaxy Wizard',
    price: 4200,
    rarity: 'Epic',
    skillName: 'Starlight Magic ?',
    skillDesc: '+30% Bonus Coins on Reading & Math Quests',
    image: require('../../assets/images/roblox_wizard.png'),
    color: '#6366F1',
    hp: 160,
    attack: 60,
    speed: 40,
    battleSkill: 'Cosmic Meteor ✨',
    battleSkillDesc: 'Summons a star shower dealing 75 cosmic magic damage.',
    battleClass: 'Galaxy Mage 🧙‍♂️'
  },
  { 
    id: 'roblox_cyber',
    name: 'Cyber Mecha',
    price: 4900,
    rarity: 'Epic',
    skillName: 'Overclock Core ?',
    skillDesc: '+50 XP Bonus when completing Daily Boss',
    image: require('../../assets/images/roblox_cyber.png'),
    color: '#0EA5E9',
    hp: 220,
    attack: 65,
    speed: 25,
    battleSkill: 'Overclock Cannon 🔋',
    battleSkillDesc: 'Fires a high-density plasma beam dealing 80 damage.',
    battleClass: 'Tech Mech 🤖'
  },
  { 
    id: 'roblox_unicorn',
    name: 'Rainbow Unicorn',
    price: 5600,
    rarity: 'Legendary',
    skillName: 'Rainbow Luck ??',
    skillDesc: '+50 Roblox Coins Bonus on Prize Wheel',
    image: require('../../assets/images/roblox_unicorn.png'),
    color: '#F43F5E',
    hp: 190,
    attack: 50,
    speed: 55,
    battleSkill: 'Rainbow Wave 🌈',
    battleSkillDesc: 'Unleashes a mystic beam restoring +50 HP and 60 damage.',
    battleClass: 'Mystic 🦄'
  },
  { 
    id: 'roblox_dragon',
    name: 'Frost Dragon',
    price: 6300,
    rarity: 'Legendary',
    skillName: 'Ice Barrier ??',
    skillDesc: 'Automatic Streak Saver for missed days',
    image: require('../../assets/images/roblox_dragon.png'),
    color: '#0284C7',
    hp: 250,
    attack: 75,
    speed: 45,
    battleSkill: 'Glacier Blast ❄️',
    battleSkillDesc: 'Freezes rival figure for 1 turn and deals 85 ice damage.',
    battleClass: 'Dragon 🐉'
  },
  { 
    id: 'roblox_bloxy',
    name: 'Golden Bloxy Champ',
    price: 7000,
    rarity: 'Legendary',
    skillName: 'Ultimate Champion ??',
    skillDesc: '+50% Coins & XP Multiplier on ALL Quests!',
    image: require('../../assets/images/roblox_bloxy.png'),
    color: '#F59E0B',
    hp: 280,
    attack: 85,
    speed: 50,
    battleSkill: 'Bloxy Smash 🏆',
    battleSkillDesc: 'Ultimate Champion Finisher! Deals 100 massive damage.',
    battleClass: 'Mythic Champ 🌟'
  },
];

export default function ShopScreen() {
  const { t } = useTranslation();
  const coins = useAppStore((state) => state.coins);
  const unlockedAvatars = useAppStore((state) => state.unlockedAvatars);
  const currentAvatar = useAppStore((state) => state.currentAvatar);
  const spendCoins = useAppStore((state) => state.spendCoins);
  const unlockAvatar = useAppStore((state) => state.unlockAvatar);
  const setCurrentAvatar = useAppStore((state) => state.setCurrentAvatar);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const unlockedThemes = useAppStore((state) => state.unlockedThemes);
  const unlockTheme = useAppStore((state) => state.unlockTheme);
  const setActiveTheme = useAppStore((state) => state.setActiveTheme);

  const [selectedAvatar, setSelectedAvatar] = useState<RobloxAvatar | null>(null);
  
  // Battle Arena Practice Preview State
  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  
  const activeAvatarObj = AVAILABLE_AVATARS.find(
    (a) => a.id === currentAvatar || (currentAvatar === 'default' && a.id === 'roblox_noob')
  ) || AVAILABLE_AVATARS[0];

  const rivalAvatar = AVAILABLE_AVATARS.find((a) => a.id !== activeAvatarObj.id) || AVAILABLE_AVATARS[1];

  const [playerHp, setPlayerHp] = useState(activeAvatarObj.hp);
  const [oppHp, setOppHp] = useState(rivalAvatar.hp);

  const startPracticeBattle = () => {
    setPlayerHp(activeAvatarObj.hp);
    setOppHp(rivalAvatar.hp);
    setBattleLog([`⚔️ Battle Started! ${activeAvatarObj.name} VS ${rivalAvatar.name}!`]);
    setBattleModalOpen(true);
  };

  const handlePlayerAttack = (isSpecial: boolean) => {
    if (oppHp <= 0 || playerHp <= 0) return;
    const dmg = isSpecial ? activeAvatarObj.attack + 25 : activeAvatarObj.attack;
    const newOppHp = Math.max(0, oppHp - dmg);
    setOppHp(newOppHp);

    const moveText = isSpecial 
      ? `✨ ${activeAvatarObj.name} used ${activeAvatarObj.battleSkill}! Dealt ${dmg} damage!` 
      : `👊 ${activeAvatarObj.name} attacked for ${dmg} damage!`;
    
    if (newOppHp <= 0) {
      setBattleLog((prev) => [`🏆 VICTORY! ${activeAvatarObj.name} won! 🎉`, moveText, ...prev]);
      return;
    }

    // Opponent counter-attack
    const oppDmg = Math.floor(rivalAvatar.attack * (0.8 + Math.random() * 0.4));
    const newPlayerHp = Math.max(0, playerHp - oppDmg);
    setPlayerHp(newPlayerHp);
    const oppText = `🔥 ${rivalAvatar.name} counters with ${rivalAvatar.battleSkill}! Dealt ${oppDmg} damage.`;

    if (newPlayerHp <= 0) {
      setBattleLog((prev) => [`💥 DEFEAT! ${activeAvatarObj.name} fainted!`, oppText, moveText, ...prev]);
    } else {
      setBattleLog((prev) => [oppText, moveText, ...prev]);
    }
  };

  const isUnlocked = (id: string) => id === 'roblox_noob' || id === 'default' || unlockedAvatars.includes(id);

  const handleAvatarPress = (avatar: RobloxAvatar) => {
    if (isUnlocked(avatar.id)) {
      setCurrentAvatar(avatar.id);
    } else {
      setSelectedAvatar(avatar);
    }
  };

  const handleConfirmPurchase = () => {
    if (!selectedAvatar) return;
    if (coins >= selectedAvatar.price) {
      const success = spendCoins(selectedAvatar.price);
      if (success) {
        unlockAvatar(selectedAvatar.id);
        setCurrentAvatar(selectedAvatar.id);
        setSelectedAvatar(null);
      }
    }
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return { bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' };
      case 'Epic': return { bg: '#EDE9FE', color: '#6D28D9', border: '#8B5CF6' };
      case 'Rare': return { bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' };
      default: return { bg: Colors.surface2, color: Colors.textMuted, border: Colors.border2 };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <ShoppingBag size={28} color={Colors.red} />
            <Text style={styles.headerTitle}>{t('avatar_shop_title', 'Roblox Avatar & Skill Shop')}</Text>
          </View>
          <LanguageSwitcher />
        </View>
        <Text style={styles.headerSub}>Unlock 12 legendary Roblox figures and boost your quest skills!</Text>

        {/* Coin Balance Wallet Card */}
        <View style={styles.coinBalanceCard}>
          <Coins size={36} color={Colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.coinBalanceTitle}>ROBLOX COIN WALLET</Text>
            <Text style={styles.coinBalanceText}>{coins} Coins 💰</Text>
          </View>
        </View>

        {/* Weekly Progression Pace Banner */}
        <View style={styles.weeklyPacingBanner}>
          <Star size={18} color={Colors.amber} fill={Colors.amber} />
          <Text style={styles.weeklyPacingBannerText}>
            🏆 {t('weekly_pacing_desc', 'Gain ~1 new Roblox figure for every week (~7 days) of passing daily quests!')}
          </Text>
        </View>

        {/* Active Skill Perk Banner */}
        <View style={styles.activeSkillBanner}>
          <View style={styles.activeSkillHeader}>
            <Zap size={18} color={Colors.amber} />
            <Text style={styles.activeSkillTitle}>{t('active_skill_perk', 'ACTIVE AVATAR SKILL PERK')}</Text>
          </View>
          <Text style={styles.activeAvatarName}>{activeAvatarObj.name}: {activeAvatarObj.skillName}</Text>
          <Text style={styles.activeSkillDesc}>{activeAvatarObj.skillDesc}</Text>
        </View>

        {/* World Themes Shop Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.text, fontSize: 18, marginBottom: 4 }}>
            🌍 WORLD THEMES SHOP
          </Text>
          <Text style={{ fontFamily: 'Nunito_600SemiBold', color: Colors.textMuted, fontSize: 12, marginBottom: 12 }}>
            Unlock & switch custom app color worlds!
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {Object.values(WORLD_THEMES).map((theme) => {
              const isUnlocked = unlockedThemes.includes(theme.id);
              const isActive = activeTheme === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={{
                    width: 145,
                    backgroundColor: theme.surface,
                    borderColor: isActive ? theme.accent : isUnlocked ? theme.border : Colors.amber,
                    borderWidth: isActive ? 2.5 : 1.5,
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    gap: 6
                  }}
                  onPress={() => {
                    if (isUnlocked) {
                      setActiveTheme(theme.id);
                    } else {
                      if (unlockTheme(theme.id, theme.price)) {
                        alert(`🎉 Unlocked World Theme "${theme.name}"!`);
                      } else {
                        alert(`🔒 Requires ${theme.price} Coins! Keep completing quests.`);
                      }
                    }
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{theme.icon}</Text>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: theme.text, fontSize: 14, textAlign: 'center' }}>
                    {theme.name}
                  </Text>
                  
                  {isActive ? (
                    <View style={{ backgroundColor: theme.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#FFF', fontSize: 11 }}>ACTIVE ✨</Text>
                    </View>
                  ) : isUnlocked ? (
                    <View style={{ backgroundColor: theme.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: theme.textSecondary, fontSize: 11 }}>EQUIP 🎨</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: Colors.amberDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Coins size={12} color={Colors.amber} />
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: Colors.amber, fontSize: 11 }}>{theme.price}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Practice Battle Arena Banner */}
        <View style={styles.battleArenaBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.battleArenaBannerTitle}>⚔️ KID BATTLE ARENA (PVP PREVIEW)</Text>
            <Text style={styles.battleArenaBannerSub}>Test {activeAvatarObj.name}'s special battle skills in 1v1 practice combat!</Text>
          </View>
          <TouchableOpacity style={styles.practiceBattleBtn} onPress={startPracticeBattle} activeOpacity={0.8}>
            <Text style={styles.practiceBattleBtnText}>BATTLE ⚔️</Text>
          </TouchableOpacity>
        </View>

        {/* 12 Figures Grid */}
        <View style={styles.grid}>
          {AVAILABLE_AVATARS.map((avatar) => {
            const unlocked = isUnlocked(avatar.id);
            const equipped = currentAvatar === avatar.id || (currentAvatar === 'default' && avatar.id === 'roblox_noob');
            const rarityStyle = getRarityBadgeStyle(avatar.rarity);
            const weeksNeeded = Math.ceil(avatar.price / 700);

            return (
              <TouchableOpacity 
                key={avatar.id} 
                style={[
                  styles.avatarCard, 
                  equipped && styles.avatarCardEquipped,
                  !unlocked && styles.avatarCardLocked
                ]}
                onPress={() => handleAvatarPress(avatar)}
                activeOpacity={0.85}
              >
                {/* Rarity Pill */}
                <View style={[styles.rarityPill, { backgroundColor: rarityStyle.bg, borderColor: rarityStyle.border }]}>
                  <Text style={[styles.rarityText, { color: rarityStyle.color }]}>{avatar.rarity.toUpperCase()}</Text>
                </View>

                {/* Avatar Circle Frame */}
                <View style={[styles.avatarCircle, { borderColor: equipped ? Colors.red : avatar.color }]}>
                  {avatar.image ? (
                    <Image source={avatar.image} style={styles.avatarImg} resizeMode="contain" />
                  ) : (
                    <Text style={styles.avatarEmoji}>{avatar.emoji || '🎮'}</Text>
                  )}

                  {equipped && (
                    <View style={styles.equippedBadge}>
                      <Check size={12} color="#FFF" />
                    </View>
                  )}

                  {!unlocked && (
                    <View style={styles.lockOverlay}>
                      <Lock size={16} color="#FFF" />
                    </View>
                  )}
                </View>
                
                <Text style={styles.avatarName} numberOfLines={1}>{avatar.name}</Text>
                
                {/* Skill Perk Badge */}
                <View style={styles.skillBox}>
                  <Text style={styles.skillNameText} numberOfLines={1}>{avatar.skillName}</Text>
                  <Text style={styles.skillDescText} numberOfLines={2}>{avatar.skillDesc}</Text>
                </View>
                
                {/* Unlock Status / Price Action & Weekly Pacing */}
                {unlocked ? (
                  <View style={[styles.statusBadge, equipped && styles.statusBadgeEquipped]}>
                    <Text style={[styles.statusText, equipped && styles.statusTextEquipped]}>
                      {equipped ? t('equipped', 'EQUIPPED') : t('equip', 'EQUIP')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.priceContainer}>
                    <View style={styles.priceRow}>
                      <Coins size={14} color={Colors.amber} />
                      <Text style={styles.priceText}>{avatar.price} Coins</Text>
                    </View>
                    <View style={styles.pacePill}>
                      <Text style={styles.pacePillText}>
                        📅 {weeksNeeded <= 1 ? t('pace_half_week', '~1 Week Quests') : t('pace_weeks', { count: weeksNeeded, defaultValue: `~${weeksNeeded} Weeks Quests` })}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Unlock Figure Confirmation Modal */}
      {selectedAvatar && (
        <Modal transparent animationType="fade" visible={Boolean(selectedAvatar)} onRequestClose={() => setSelectedAvatar(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedAvatar(null)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.modalRarityBadge, { backgroundColor: getRarityBadgeStyle(selectedAvatar.rarity).bg }]}>
                <Text style={[styles.modalRarityText, { color: getRarityBadgeStyle(selectedAvatar.rarity).color }]}>
                  {selectedAvatar.rarity.toUpperCase()} ROBLOX FIGURE
                </Text>
              </View>

              <View style={[styles.modalAvatarCircle, { borderColor: selectedAvatar.color }]}>
                {selectedAvatar.image ? (
                  <Image source={selectedAvatar.image} style={styles.modalAvatarImg} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 50 }}>{selectedAvatar.emoji || '🎮'}</Text>
                )}
              </View>

              <Text style={styles.modalAvatarName}>{selectedAvatar.name}</Text>
              
              {/* Quest Skill Perk */}
              <View style={styles.modalSkillCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Zap size={16} color={Colors.amber} />
                  <Text style={styles.modalSkillTitle}>{selectedAvatar.skillName}</Text>
                </View>
                <Text style={styles.modalSkillDesc}>{selectedAvatar.skillDesc}</Text>
              </View>

              {/* Kid PVP Battle Stats Card */}
              <View style={styles.modalBattleCard}>
                <View style={styles.battleHeader}>
                  <Shield size={14} color={Colors.red} />
                  <Text style={styles.battleTitle}>KID BATTLE STATS & SPECIAL SKILL ⚔️</Text>
                </View>
                
                <View style={styles.battleRow}>
                  <View style={styles.battleStatBox}>
                    <Text style={styles.battleStatLabel}>❤️ HP</Text>
                    <Text style={styles.battleStatVal}>{selectedAvatar.hp}</Text>
                  </View>
                  <View style={styles.battleStatBox}>
                    <Text style={styles.battleStatLabel}>⚔️ ATK</Text>
                    <Text style={styles.battleStatVal}>{selectedAvatar.attack}</Text>
                  </View>
                  <View style={styles.battleStatBox}>
                    <Text style={styles.battleStatLabel}>⚡ SPD</Text>
                    <Text style={styles.battleStatVal}>{selectedAvatar.speed}</Text>
                  </View>
                </View>

                <View style={styles.battleMoveBox}>
                  <Text style={styles.battleMoveName}>✨ Special Move: {selectedAvatar.battleSkill}</Text>
                  <Text style={styles.battleMoveDesc}>{selectedAvatar.battleSkillDesc}</Text>
                </View>
              </View>

              <View style={styles.modalPriceContainer}>
                <Text style={styles.modalPriceLabel}>PRICE:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Coins size={20} color={Colors.amber} />
                  <Text style={styles.modalPriceVal}>{selectedAvatar.price} Coins</Text>
                </View>
              </View>

              {coins >= selectedAvatar.price ? (
                <TouchableOpacity style={styles.confirmBuyBtn} onPress={handleConfirmPurchase}>
                  <Text style={styles.confirmBuyBtnText}>UNLOCK AVATAR 🛒</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.notEnoughContainer}>
                  <Text style={styles.notEnoughText}>
                    ⚠️ Need {selectedAvatar.price - coins} more coins! Complete daily quests to earn coins.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Interactive 1v1 Practice Battle Arena Modal */}
      {battleModalOpen && (
        <Modal transparent animationType="slide" visible={battleModalOpen} onRequestClose={() => setBattleModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 500, backgroundColor: '#0F172A' }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setBattleModalOpen(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.battleArenaTitle}>⚔️ KID BATTLE ARENA PREVIEW ⚔️</Text>
              <Text style={styles.battleArenaSub}>Practice 1v1 Roblox Combat</Text>

              {/* Combatants Arena View */}
              <View style={styles.arenaRow}>
                {/* Player Fig */}
                <View style={styles.combatantCard}>
                  <View style={[styles.combatantCircle, { borderColor: activeAvatarObj.color }]}>
                    {activeAvatarObj.image ? (
                      <Image source={activeAvatarObj.image} style={{ width: 50, height: 50 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{activeAvatarObj.emoji || '🎮'}</Text>
                    )}
                  </View>
                  <Text style={styles.combatantName}>{activeAvatarObj.name}</Text>
                  <View style={styles.hpBarBg}>
                    <View style={[styles.hpBarFill, { width: `${(playerHp / activeAvatarObj.hp) * 100}%` }]} />
                  </View>
                  <Text style={styles.hpText}>❤️ {playerHp}/{activeAvatarObj.hp} HP</Text>
                </View>

                <Text style={styles.vsText}>VS</Text>

                {/* Opponent Fig */}
                <View style={styles.combatantCard}>
                  <View style={[styles.combatantCircle, { borderColor: rivalAvatar.color }]}>
                    {rivalAvatar.image ? (
                      <Image source={rivalAvatar.image} style={{ width: 50, height: 50 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{rivalAvatar.emoji || '🎮'}</Text>
                    )}
                  </View>
                  <Text style={styles.combatantName}>{rivalAvatar.name}</Text>
                  <View style={styles.hpBarBg}>
                    <View style={[styles.hpBarFill, { width: `${(oppHp / rivalAvatar.hp) * 100}%`, backgroundColor: Colors.red }]} />
                  </View>
                  <Text style={styles.hpText}>❤️ {oppHp}/{rivalAvatar.hp} HP</Text>
                </View>
              </View>

              {/* Combat Action Buttons */}
              {playerHp > 0 && oppHp > 0 ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.attackBtn} onPress={() => handlePlayerAttack(false)}>
                    <Text style={styles.attackBtnText}>👊 ATTACK ({activeAvatarObj.attack})</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.specialBtn} onPress={() => handlePlayerAttack(true)}>
                    <Text style={styles.specialBtnText}>✨ {activeAvatarObj.battleSkill}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.resetBattleBtn} onPress={startPracticeBattle}>
                  <Text style={styles.resetBattleBtnText}>🔄 BATTLE AGAIN!</Text>
                </TouchableOpacity>
              )}

              {/* Battle Log Stream */}
              <ScrollView style={styles.logBox} contentContainerStyle={{ gap: 6 }}>
                {battleLog.map((log, i) => (
                  <Text key={i} style={[styles.logText, i === 0 && { color: Colors.amber, fontFamily: 'Nunito_800ExtraBold' }]}>
                    {log}
                  </Text>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 18,
    paddingBottom: 60,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  coinBalanceCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  coinBalanceTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  coinBalanceText: {
    fontFamily: 'Nunito_800ExtraBold',
    color: Colors.amber,
    fontSize: 24,
  },
  activeSkillBanner: {
    backgroundColor: '#16140b',
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  activeSkillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeSkillTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    letterSpacing: 1,
  },
  activeAvatarName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activeSkillDesc: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  avatarCardEquipped: {
    borderColor: Colors.red,
    borderWidth: 2,
    backgroundColor: Colors.surface2,
  },
  avatarCardLocked: {
    opacity: 0.9,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  rarityText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatarImg: {
    width: 56,
    height: 56,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  equippedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.red,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  skillBox: {
    backgroundColor: Colors.surface2,
    padding: 8,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    alignItems: 'center',
  },
  skillNameText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    textAlign: 'center',
    marginBottom: 2,
  },
  skillDescText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: Colors.greenDim,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
    width: '100%',
    alignItems: 'center',
  },
  statusBadgeEquipped: {
    backgroundColor: Colors.redDim,
    borderColor: 'rgba(232,0,27,0.3)',
  },
  statusText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.green,
  },
  statusTextEquipped: {
    color: Colors.red,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.amber,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    width: '100%',
  },
  priceText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.amber,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.amber,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  modalRarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  modalRarityText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  modalAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surface2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalAvatarImg: {
    width: 74,
    height: 74,
  },
  modalAvatarName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.text,
    marginBottom: 12,
  },
  modalSkillCard: {
    backgroundColor: Colors.surface2,
    padding: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  modalSkillTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: Colors.amber,
  },
  modalSkillDesc: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  modalPriceLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.textMuted,
  },
  modalPriceVal: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: Colors.amber,
  },
  confirmBuyBtn: {
    backgroundColor: Colors.green,
    paddingVertical: 14,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  confirmBuyBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#121212',
    letterSpacing: 1,
  },
  weeklyPacingBanner: {
    backgroundColor: Colors.amberDim,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  weeklyPacingBannerText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: Colors.amber,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pacePill: {
    backgroundColor: Colors.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border2,
    marginTop: 4,
  },
  pacePillText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 9,
    color: Colors.blue,
  },
  notEnoughContainer: {
    backgroundColor: Colors.redDim,
    padding: 12,
    borderRadius: 10,
    width: '100%',
  },
  notEnoughText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.red,
    textAlign: 'center',
  },
  battleArenaBanner: {
    backgroundColor: 'rgba(232,0,27,0.12)',
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  battleArenaBannerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.red,
    marginBottom: 2,
  },
  battleArenaBannerSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  practiceBattleBtn: {
    backgroundColor: Colors.red,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  practiceBattleBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  modalBattleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 16,
  },
  battleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  battleTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.red,
    letterSpacing: 0.5,
  },
  battleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    backgroundColor: Colors.surface2,
    padding: 6,
    borderRadius: 8,
  },
  battleStatBox: {
    alignItems: 'center',
  },
  battleStatLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
  },
  battleStatVal: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: Colors.text,
  },
  battleMoveBox: {
    alignItems: 'center',
  },
  battleMoveName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
    marginBottom: 2,
  },
  battleMoveDesc: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  battleArenaTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 2,
  },
  battleArenaSub: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  arenaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  combatantCard: {
    alignItems: 'center',
    width: '40%',
  },
  combatantCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  combatantName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  hpBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 2,
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 5,
  },
  hpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.textMuted,
  },
  vsText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.amber,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 14,
  },
  attackBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  attackBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#FFF',
  },
  specialBtn: {
    flex: 1,
    backgroundColor: Colors.amber,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  specialBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#121212',
  },
  resetBattleBtn: {
    backgroundColor: Colors.green,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  resetBattleBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#121212',
  },
  logBox: {
    maxHeight: 90,
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
  },
  logText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#94A3B8',
  },
});
