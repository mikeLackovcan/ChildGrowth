import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, ChevronDown } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Colors, QUEST_BACKGROUNDS } from '../../constants/theme';
import RewardGoalCard from '../../components/RewardGoalCard';
import QuestHero from '../../components/QuestHero';
import ActionSheet from '../../components/ActionSheet';

export default function MilestonesScreen() {
  const { t } = useTranslation();
  const state = useAppStore();
  const [showLevel, setShowLevel] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const selected = state.wonPrizes.find(prize => prize.id === claimId);
  const background = QUEST_BACKGROUNDS[state.activeBackground] || QUEST_BACKGROUNDS.clean;
  return <SafeAreaView style={[styles.screen, { backgroundColor: background.background }]} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('rewards_title')}</Text>
      <View style={styles.wallet}>
        <Coins size={30} color="#926500" />
        <View><Text style={styles.balance}>{state.coins}</Text><Text style={styles.meta}>{t('rewards_wallet')}</Text></View>
      </View>
      <RewardGoalCard />
      <Text style={styles.section}>{t('rewards_shelf')}</Text>
      {state.wonPrizes.length === 0 && <View style={styles.empty}><Text style={styles.emoji}>🎁</Text><Text style={styles.meta}>{t('rewards_empty')}</Text></View>}
      {state.wonPrizes.map(prize => <View key={prize.id} style={styles.reward}>
        <Text style={styles.emoji}>{prize.redeemed ? '✓' : '🎁'}</Text>
        <View style={{ flex: 1 }}><Text style={styles.rewardName}>{prize.prize}</Text><Text style={styles.meta}>{t(prize.redeemed ? 'rewards_enjoyed' : 'rewards_ready')}</Text></View>
        {!prize.redeemed && <Pressable style={styles.claim} accessibilityRole="button" accessibilityLabel={t('rewards_enjoy_named', { name: prize.prize })} onPress={() => setClaimId(prize.id)}><Text style={styles.linkText}>{t('rewards_enjoy')}</Text></Pressable>}
      </View>)}
      <Pressable style={styles.levelToggle} onPress={() => setShowLevel(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: showLevel }}>
        <Text style={styles.linkText}>{t('rewards_journey', { level: state.level })}</Text><ChevronDown color={Colors.primary} size={20} />
      </Pressable>
      {showLevel && <View style={styles.journey}>
        <QuestHero id={state.currentAvatar} style={{ width: 96, height: 96 }} />
        <View style={{ flex: 1 }}><Text style={styles.section}>{t('rewards_growth')}</Text><Text style={styles.meta}>{t('rewards_xp', { xp: state.xp })}</Text></View>
      </View>}
    </ScrollView>
    <ActionSheet visible={Boolean(selected)} title={selected?.prize || t('rewards_reward')} onClose={() => setClaimId(null)}>
      <Text style={styles.meta}>{t('rewards_claim_hint')}</Text>
      <Pressable style={styles.confirm} accessibilityRole="button" onPress={() => {
        if (selected && !selected.redeemed) state.togglePrizeRedeemed(selected.id);
        setClaimId(null);
      }}><Text style={styles.confirmText}>{t('rewards_claim_done')}</Text></Pressable>
    </ActionSheet>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24, paddingBottom: 36 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 30, color: Colors.text, marginBottom: 18 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  balance: { fontFamily: 'Nunito_800ExtraBold', fontSize: 32, color: Colors.text },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  section: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: Colors.text, marginBottom: 4 },
  empty: { paddingVertical: 28, gap: 10, alignItems: 'center' },
  emoji: { fontSize: 30, color: '#316327' },
  reward: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderColor: Colors.border },
  rewardName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text },
  claim: { minWidth: 60, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.primary },
  levelToggle: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 56, marginTop: 26 },
  journey: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  confirm: { minHeight: 56, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  confirmText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: '#FFFFFF' },
});
