import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Layout } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { Trophy, Star, Gift, Calendar, CheckCircle2, Circle, Settings } from 'lucide-react-native';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import SettingsModal from '../../components/SettingsModal';

export default function MilestonesScreen() {
  const { t } = useTranslation();
  const xp = useAppStore((state) => state.xp);
  const level = useAppStore((state) => state.level);
  const wonPrizes = useAppStore((state) => state.wonPrizes);
  const togglePrizeRedeemed = useAppStore((state) => state.togglePrizeRedeemed);

  const [settingsVisible, setSettingsVisible] = useState(false);

  const xpNeeded = 100;
  const progressPercent = Math.min((xp / xpNeeded) * 100, 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={styles.headerTitle}>{t('winnings_prizes_title', 'Winnings & Prizes 🎁')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LanguageSwitcher />
            <TouchableOpacity 
              style={{ backgroundColor: Colors.surface2, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border }}
              onPress={() => setSettingsVisible(true)}
            >
              <Settings size={20} color={Colors.amber} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Level Tracker */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Star size={24} color="#FFF" fill="#FFF" />
              <Text style={styles.levelText}>{level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Level {level}</Text>
              <Text style={styles.xpText}>{xp} / {xpNeeded} XP</Text>
            </View>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressSubText}>
            Earn {xpNeeded - xp} more XP to reach Level {level + 1}!
          </Text>
        </View>

        {/* Reward Days Summary Header */}
        <View style={styles.rewardDaysCard}>
          <Calendar size={20} color={Colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardDaysTitle}>{t('total_reward_days', 'Reward Days Logged')}</Text>
            <Text style={styles.rewardDaysCount}>
              {wonPrizes.length} {t('rewards_and_prizes', 'Rewards')} · {wonPrizes.filter(p => p.redeemed).length} {t('redeemed_status', 'Redeemed ✅')}
            </Text>
          </View>
        </View>

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
  headerTitle: {
    ...Typography.header,
    marginBottom: 24,
    marginTop: 10,
  },
  levelCard: {
    backgroundColor: Colors.cardBlue,
    padding: 24,
    borderRadius: Layout.borderRadius,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelText: {
    position: 'absolute',
    color: Colors.primary,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    marginTop: 2,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    ...Typography.title,
    fontSize: 24,
    color: '#1E3A8A', // Dark blue
  },
  xpText: {
    ...Typography.body,
    color: '#1E3A8A',
    opacity: 0.8,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  progressSubText: {
    ...Typography.small,
    color: '#1E3A8A',
    fontWeight: '600',
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
    backgroundColor: Colors.surface,
    padding: 40,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  prizeCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prizeCardRedeemed: {
    backgroundColor: Colors.surface2,
    borderColor: Colors.green,
    opacity: 0.85,
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
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: Layout.borderRadius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: Colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border2,
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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  redeemBtnReady: {
    backgroundColor: Colors.amberDim,
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  redeemBtnDone: {
    backgroundColor: Colors.greenDim,
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
});
