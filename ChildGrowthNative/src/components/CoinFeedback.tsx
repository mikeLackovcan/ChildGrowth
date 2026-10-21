import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Coins } from 'lucide-react-native';
import useReducedMotion from '../hooks/useReducedMotion';

/** A brief acknowledgement, never a blocking dialog. */
export default function CoinFeedback({ amount, sequence }: { amount: number; sequence: number }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!sequence) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 1200, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [sequence, progress]);
  if (!sequence) return null;
  return <Animated.View pointerEvents="none" accessible={false} style={[styles.badge, {
    opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
    transform: [{ translateY: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [10, -16] }) }],
  }]}>
    <Coins size={20} color="#7C5700" /><Text style={styles.text}>+{amount}</Text>
  </Animated.View>;
}
const styles = StyleSheet.create({
  badge: { position: 'absolute', top: 68, right: 24, flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFF2C7' },
  text: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: '#624500' },
});
