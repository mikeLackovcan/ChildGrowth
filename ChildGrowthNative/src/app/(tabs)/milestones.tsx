import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import SettingsModal from '../../components/SettingsModal';

export default function MilestonesScreen() {
  const xp = useAppStore((state) => state.xp);
  const level = useAppStore((state) => state.level);
  const wonPrizes = useAppStore((state) => state.wonPrizes);
  const togglePrizeRedeemed = useAppStore((state) => state.togglePrizeRedeemed);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const progress = Math.min(xp % 100, 100);
  const remaining = 100 - progress;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your prizes</Text>
          <TouchableOpacity style={styles.settings} onPress={() => setSettingsVisible(true)} accessibilityLabel="Settings">
            <Settings size={21} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.levelCard}>
          <View style={{ flex: 1, zIndex: 2 }}>
            <Text style={styles.levelTitle}>Level {level}</Text>
            <Text style={styles.xpText}>{progress} / 100 XP</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <Text style={styles.nextLevel}>{remaining} XP to your next level</Text>
          </View>
          <Image source={require('../../../assets/images/quest-hero-v2.png')} style={styles.hero} resizeMode="cover" />
        </View>

        <Text style={styles.sectionTitle}>Your rewards</Text>
        <View style={styles.rewardList}>
          {wonPrizes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🎁</Text>
              <Text style={styles.emptyTitle}>Your reward shelf is ready</Text>
              <Text style={styles.emptyText}>Complete your daily quests to add family-chosen rewards here.</Text>
            </View>
          ) : wonPrizes.map((item, index) => {
            const emoji = item.prize.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)?.[0] || '🎁';
            const name = item.prize.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/, '').trim();
            return (
              <View key={item.id || index} style={styles.rewardCard}>
                <View style={[styles.rewardIcon, item.redeemed && styles.rewardIconDone]}><Text style={styles.rewardEmoji}>{emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>{name}</Text>
                  <Text style={styles.rewardMeta}>{item.redeemed ? 'Enjoyed with your family' : 'Ready to enjoy'}</Text>
                </View>
                <TouchableOpacity
                  disabled={item.redeemed}
                  style={[styles.claimButton, item.redeemed && styles.claimedButton]}
                  onPress={() => togglePrizeRedeemed(item.id || index)}
                >
                  <Text style={[styles.claimText, item.redeemed && styles.claimedText]}>{item.redeemed ? '✓ Claimed' : 'Mark claimed'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.encouragementCard}>
          <Image source={require('../../../assets/images/quest-hero-v2.png')} style={styles.avatar} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.encouragementTitle}>Every little effort counts.</Text>
            <Text style={styles.encouragementText}>You’re building great habits for a brighter tomorrow!</Text>
          </View>
        </View>
      </ScrollView>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, paddingBottom: 38 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 29, color: Colors.text },
  settings: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  levelCard: { minHeight: 168, padding: 22, borderRadius: 24, backgroundColor: Colors.primary, overflow: 'hidden', marginBottom: 27 },
  levelTitle: { color: '#FFFFFF', fontFamily: 'Nunito_800ExtraBold', fontSize: 28 },
  xpText: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: 3 },
  progressTrack: { width: '64%', height: 11, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#CBF250' },
  nextLevel: { color: '#E2ECFF', fontFamily: 'Nunito_700Bold', fontSize: 12, marginTop: 9 },
  hero: { position: 'absolute', right: -4, bottom: -46, width: 170, height: 170, borderRadius: 85 },
  sectionTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text, marginBottom: 12 },
  rewardList: { gap: 11 },
  rewardCard: { minHeight: 86, flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  rewardIcon: { width: 55, height: 55, borderRadius: 16, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  rewardIconDone: { backgroundColor: Colors.greenDim },
  rewardEmoji: { fontSize: 29 },
  rewardName: { marginLeft: 12, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text },
  rewardMeta: { marginLeft: 12, marginTop: 2, fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: Colors.textSecondary },
  claimButton: { minHeight: 40, minWidth: 104, paddingHorizontal: 12, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  claimedButton: { backgroundColor: '#CBF250' },
  claimText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#FFFFFF' },
  claimedText: { color: Colors.text },
  emptyCard: { padding: 28, backgroundColor: Colors.surface, borderRadius: 22, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: Colors.text, marginTop: 8 },
  emptyText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  encouragementCard: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderRadius: 20, backgroundColor: Colors.blueDim, borderWidth: 1, borderColor: '#C9D9FA' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  encouragementTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: Colors.text },
  encouragementText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 17, color: Colors.textSecondary, marginTop: 2 },
});
