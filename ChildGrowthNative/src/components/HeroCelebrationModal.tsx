import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Coins, Sparkles } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import AnimatedQuestHero from './AnimatedQuestHero';
import { playSound } from '../lib/sound';

export default function HeroCelebrationModal({
  visible,
  onClose,
  heroId,
  coins,
}: {
  visible: boolean;
  onClose: () => void;
  heroId: string;
  coins: number;
}) {
  useEffect(() => {
    if (!visible) return;
    playSound('complete');
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [onClose, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} accessibilityLabel="Close celebration">
        <View style={styles.burstOne} />
        <View style={styles.burstTwo} />
        <View style={styles.card}>
          <Sparkles size={30} color={Colors.amber} />
          <AnimatedQuestHero id={heroId} style={styles.hero} motion="celebrate" />
          <Text style={styles.title}>Quest complete!</Text>
          <View style={styles.reward}>
            <Coins size={20} color={Colors.amber} />
            <Text style={styles.rewardText}>+{coins}</Text>
          </View>
          <Text style={styles.message}>Habi is proud of your small win.</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,26,75,.42)', padding: 24 },
  card: { width: '100%', maxWidth: 330, borderRadius: 30, backgroundColor: Colors.background, alignItems: 'center', paddingHorizontal: 24, paddingTop: 25, paddingBottom: 27, overflow: 'hidden' },
  hero: { width: 156, height: 156, marginTop: 4 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text, marginTop: 2 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: Colors.amberDim },
  rewardText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: Colors.text },
  message: { marginTop: 12, fontFamily: 'Nunito_700Bold', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  burstOne: { position: 'absolute', width: 410, height: 410, borderRadius: 205, borderWidth: 44, borderColor: 'rgba(203,242,80,.26)' },
  burstTwo: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 28, borderColor: 'rgba(50,112,235,.22)' },
});
