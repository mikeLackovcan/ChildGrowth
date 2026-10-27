import { fighterImage } from '../../constants/fighterImages';
import { useAppStore } from '../../store/useAppStore';
import React, { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { fighterFor, ui, palette } from './UI';
export default function QuestCelebration({ message, fighter }: { message: string; fighter: string }) {
  const outfit = useAppStore(state => state.fighterOutfits[fighter]);
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!active || reduce) return;
      Animated.sequence([Animated.timing(lift, { toValue: -10, duration: 150, useNativeDriver: true }), Animated.timing(lift, { toValue: 0, duration: 200, useNativeDriver: true })]).start();
    });
    return () => { active = false; lift.stopAnimation(); };
  }, [message]);
  return <View style={[ui.row, { paddingVertical: 8 }]}>
    <Animated.View style={{ transform: [{ translateY: lift }] }}><Image source={fighterImage(fighter, outfit)} style={{ width: 76, height: 76, borderRadius: 38 }} /></Animated.View>
    <Text accessibilityLiveRegion="polite" style={[ui.text, { flex: 1, color: palette.green }]}>{message}</Text>
  </View>;
}
