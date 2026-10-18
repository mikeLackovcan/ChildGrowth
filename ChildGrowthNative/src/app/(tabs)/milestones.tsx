import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Layout, getThemeColors } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { Trophy, Star, Gift, Calendar, CheckCircle2, Circle, Settings, Lock } from 'lucide-react-native';
import SettingsModal from '../../components/SettingsModal';
import PrizeWheelModal from '../../components/PrizeWheelModal';

export default function MilestonesScreen() {
  const { t } = useTranslation();
  const xp = useAppStore((state) => state.xp);
  const level = useAppStore((state) => state.level);
  const wonPrizes = useAppStore((state) => state.wonPrizes);
  const togglePrizeRedeemed = useAppStore((state) => state.togglePrizeRedeemed);
  const activeTheme = useAppStore((state) => state.activeTheme);
  const themeColors = getThemeColors(activeTheme);
  const tasks = useAppStore((state) => state.tasks);
  const prizes = useAppStore((state) => state.prizes);
  const addWonPrize = useAppStore((state) => state.addWonPrize);
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [wheelModalVisible, setWheelModalVisible] = useState(false);
  const [currentWonPrize, setCurrentWonPrize] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const alreadySpunToday = lastSpinDate === todayStr;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const allQuestsDone = totalTasks > 0 && doneTasks === totalTasks;

  const handleOpenWheel = () => {
    if (!allQuestsDone || alreadySpunToday) return;
    const randomPrize = (prizes && prizes.length > 0) ? prizes[Math.floor(Math.random() * prizes.length)] : 'Extra Roblox Coins!';
    setCurrentWonPrize(randomPrize);
    addWonPrize(randomPrize);
    setWheelModalVisible(true);
  };

  const handleLockedWheelTap = () => {
    alert(`🔒 Complete all ${totalTasks} daily quests to unlock the Prize Wheel! (${doneTasks}/${totalTasks} done)`);
  };

  const xpNeeded = 100;
  const progressPercent = Math.min((xp / xpNeeded) * 100, 100);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('winnings_prizes_title', 'Winnings & Prizes 🎁')}</Text>
          <TouchableOpacity 
            style={styles.settingBtn}
            onPress={() => setSettingsVisible(true)}
          >
            <Settings size={20} color={Colors.amber} />
          </TouchableOpacity>
        </View>
        
        {/* Unified Progression Slate (Combines Level, XP, and Reward Summary) */}
        <View style={styles.progressionSlate}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Star size={32} color="#121212" fill="#121212" />
              <Text style={styles.levelText}>{level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.levelTitle}>Level {level}</Text>
                <Text style={styles.xpText}>{xp} / {xpNeeded} XP ⭐</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressSubText}>
                Earn {Math.max(0, xpNeeded - xp)} more XP to reach Level {level + 1}
              </Text>
            </View>
          </View>

          {/* Calm Reward Summary Footnote */}
          <View style={styles.slateDivider} />
          <View style={styles.slateRewardRow}>
            <Calendar size={16} color={Colors.amber} />
            <Text style={styles.slateRewardText}>
              {wonPrizes.length} {t('rewards_and_prizes', 'Rewards Won')} · {wonPrizes.filter(p => p.redeemed).length} {t('redeemed_status', 'Redeemed ✅')}
            </Text>
          </View>
        </View>

        {/* Prize Wheel Daily Status (Locked until 100% of quests are done, 1 spin per day) */}
        {!allQuestsDone ? (
          <TouchableOpacity 
            style={styles.wheelCardLocked}
            onPress={handleLockedWheelTap}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 26, opacity: 0.8 }}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.wheelTitleLocked}>PRIZE WHEEL LOCKED 🎡</Text>
              <Text style={styles.wheelSubLocked}>
                Complete all quests today to unlock! ({doneTasks}/{totalTasks} done)
              </Text>
            </View>
          </TouchableOpacity>
        ) : alreadySpunToday ? (
          <View style={styles.wheelCardSpun}>
            <Text style={{ fontSize: 28 }}>🎡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.wheelTitleSpun}>DAILY SPIN COMPLETED ✅</Text>
              <Text style={styles.wheelSubSpun}>1 spin per day · Come back tomorrow for your next reward!</Text>
            </View>
            <View style={styles.spunBadgePill}>
              <CheckCircle2 size={16} color="#00E676" />
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            testID="open-wheel-card-btn"
            style={styles.wheelCardUnlocked}
            onPress={handleOpenWheel}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 32 }}>🎡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.wheelTitleUnlocked}>ALL QUESTS COMPLETE! 🎉</Text>
              <Text style={styles.wheelSubUnlocked}>Tap to spin the Prize Wheel! (1 spin/day)</Text>
            </View>
            <View style={styles.spinButtonPill}>
              <Text style={styles.spinButtonPillText}>SPIN! 🎡</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Trophy Cabinet & Winnings Checklist */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Trophy size={24} color={Colors.cardYellow} />
            <Text style={styles.sectionTitle}>{t('won_prizes_history', 'Awarded Winnings')}</Text>
          </View>
          
          {wonPrizes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Gift size={48} color={Colors.textSecondary} opacity={0.5} />
              <Text style={styles.emptyText}>{t('no_prizes_won_yet', 'Complete quests to win prizes on the spin wheel!')}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {wonPrizes.map((item, index) => {
                const rewardDate = item.date ? new Date(item.date) : new Date();
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - rewardDate.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                let dayMarker = t('reward_day_today', 'Today (Day 1) 📅');
                if (diffDays === 1) {
                  dayMarker = t('reward_day_yesterday', '1 day ago 📅');
                } else if (diffDays > 1) {
                  dayMarker = t('reward_days_ago', { count: diffDays, defaultValue: `${diffDays} days ago 📅` });
                }

                const itemKey = item.id || `prize_${index}`;

                return (
                  <TouchableOpacity 
                    key={itemKey} 
                    style={[styles.prizeCard, item.redeemed && styles.prizeCardRedeemed]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (item.redeemed) {
                        alert(t('cannot_unpick_prize_alert', '🔒 Prize already claimed! Kids cannot un-claim prizes once picked.'));
                        return;
                      }
                      togglePrizeRedeemed(item.id || index);
                    }}
                  >
                    <Text style={[styles.prizeIcon, item.redeemed && { opacity: 0.6 }]}>
                      {item.prize.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)?.[0] || '🎁'}
                    </Text>
                    <Text style={[styles.prizeName, item.redeemed && styles.prizeNameRedeemed]} numberOfLines={2}>
                      {item.prize.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/, '').trim()}
                    </Text>
                    
                    {/* Day Badge */}
                    <View style={styles.dayBadgeContainer}>
                      <Text style={styles.dayBadgeLabel}>{dayMarker}</Text>
                    </View>

                    {/* Checkbox / Redemption Status Toggle Pill */}
                    <View style={[styles.redeemBtn, item.redeemed ? styles.redeemBtnDone : styles.redeemBtnReady]}>
                      {item.redeemed ? (
                        <>
                          <CheckCircle2 size={14} color={Colors.green} />
                          <Text style={styles.redeemBtnDoneText}>{t('locked_claimed', 'Claimed (Locked) 🔒')}</Text>
                        </>
                      ) : (
                        <>
                          <Gift size={14} color={Colors.amber} />
                          <Text style={styles.redeemBtnReadyText}>{t('ready_to_redeem', 'Ready to Claim 🎁')}</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
      />

      <PrizeWheelModal 
        visible={wheelModalVisible && allQuestsDone && !alreadySpunToday}
        onClose={() => setWheelModalVisible(false)}
        prizeName={currentWonPrize}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Layout.padding,
    paddingBottom: 60,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 6,
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  settingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressionSlate: {
    backgroundColor: '#151926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelText: {
    position: 'absolute',
    color: '#121212',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    marginTop: 1,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#F8FAFC',
  },
  xpText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.amber,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#272B40',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    borderRadius: 999,
  },
  progressSubText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#94A3B8',
  },
  slateDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  slateRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slateRewardText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: '#CBD5E1',
  },
  section: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.title,
  },
  emptyCard: {
    backgroundColor: '#131726',
    padding: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  prizeCard: {
    width: '47.5%',
    backgroundColor: '#131726',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  prizeCardRedeemed: {
    backgroundColor: '#0F121E',
    borderColor: 'rgba(0, 230, 118, 0.2)',
    opacity: 0.8,
  },
  prizeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  prizeName: {
    ...Typography.body,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  prizeNameRedeemed: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  prizeDate: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  rewardDaysCard: {
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  rewardDaysTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  rewardDaysCount: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: Colors.amber,
  },
  dayBadgeContainer: {
    backgroundColor: '#1E2337',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginVertical: 6,
  },
  dayBadgeLabel: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.blue,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 999,
    marginTop: 6,
  },
  redeemBtnReady: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  redeemBtnDone: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: Colors.green,
  },
  redeemBtnReadyText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.amber,
  },
  redeemBtnDoneText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.green,
  },
  wheelCardUnlocked: {
    backgroundColor: '#181E32',
    borderWidth: 1.5,
    borderColor: '#FFB800',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  wheelTitleUnlocked: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFB800',
    letterSpacing: 0.5,
  },
  wheelSubUnlocked: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  spinButtonPill: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  spinButtonPillText: {
    fontFamily: 'Nunito_900Black',
    fontSize: 12,
    color: '#121212',
  },
  wheelCardLocked: {
    backgroundColor: '#131726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  wheelTitleLocked: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  wheelSubLocked: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  wheelCardSpun: {
    backgroundColor: '#131D24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  wheelTitleSpun: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: '#00E676',
    letterSpacing: 0.5,
  },
  wheelSubSpun: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  spunBadgePill: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
