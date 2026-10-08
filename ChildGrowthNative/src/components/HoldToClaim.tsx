import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/theme';
import { Gift } from 'lucide-react-native';

interface HoldToClaimProps {
  onClaim: () => void;
  isClaimed: boolean;
  title?: string;
  claimedTitle?: string;
}

const DURATION = 1500; // 1.5 seconds hold to claim

export default function HoldToClaim({ onClaim, isClaimed, title = 'HOLD TO CLAIM (+35 XP)', claimedTitle = 'CLAIMED (+35 XP)' }: HoldToClaimProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const [holding, setHolding] = useState(false);

  const triggerSuccessHaptic = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  const handlePressIn = () => {
    if (isClaimed) return;
    setHolding(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    scale.value = withTiming(0.96, { duration: 150 });
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (finished) => {
      if (finished) {
        runOnJS(triggerSuccessHaptic)();
        runOnJS(onClaim)();
        runOnJS(setHolding)(false);
      }
    });
  };

  const handlePressOut = () => {
    if (isClaimed || progress.value >= 1) return;
    setHolding(false);
    scale.value = withTiming(1, { duration: 200 });
    progress.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button, 
          isClaimed && styles.buttonClaimed
        ]}
      >
        <Animated.View style={[styles.progressBar, progressStyle]} />
        <View style={styles.content}>
          <Text style={[styles.text, isClaimed && styles.textClaimed]}>
            {isClaimed ? claimedTitle : holding ? 'HOLDING...' : title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 14,
  },
  button: {
    height: 48,
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444444',
    position: 'relative',
  },
  buttonClaimed: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    opacity: 0.6,
  },
  progressBar: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.blue,
    opacity: 0.65,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },
  text: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  textClaimed: {
    color: Colors.textMuted,
  },
});
