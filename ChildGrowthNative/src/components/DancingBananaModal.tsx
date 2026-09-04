import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { Colors, Layout } from '../constants/theme';
import { Sparkles } from 'lucide-react-native';

const DANCING_BANANA_GIF = require('../assets/images/dancing_banana_blue_sneakers_classic_8frame.gif');
const DANCING_BANANA_VEO = require('../assets/images/dancing_banana_veo_frame1.png');

interface DancingBananaModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DancingBananaModal({ visible, onClose }: DancingBananaModalProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const shadowGlow = useSharedValue(0.8);

  // Safeguard asset source for React Native Web & Native
  const resolvedSource = Image.resolveAssetSource(DANCING_BANANA_GIF) || 
                         Image.resolveAssetSource(DANCING_BANANA_VEO) || 
                         DANCING_BANANA_GIF;

  useEffect(() => {
    if (visible) {
      // High-precision spring pop
      scale.value = withSpring(1, { damping: 8, stiffness: 110 });

      // Ambient glow pulse
      shadowGlow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(0.8, { duration: 400 })
        ),
        -1,
        true
      );

      // Dismiss timer
      const timer = setTimeout(() => {
        onClose();
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      scale.value = 0.4;
      rotation.value = 0;
      translateY.value = 0;
      shadowGlow.value = 0.8;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotation.value}deg` }
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: shadowGlow.value }],
      opacity: shadowGlow.value * 0.4,
    };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.contentCard}>
          <View style={styles.sparkleRow}>
            <Sparkles size={22} color={Colors.amber} />
            <Text style={styles.titleText}>QUEST COMPLETE!</Text>
            <Sparkles size={22} color={Colors.amber} />
          </View>

          <View style={styles.animationStage}>
            <Animated.View style={[styles.ambientGlow, glowStyle]} />
            <Animated.View style={[styles.bananaWrapper, animatedStyle]}>
              <Image 
                source={resolvedSource} 
                style={styles.bananaImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Text style={styles.subText}>PEANUT BUTTER JELLY TIME! 🍌🎉</Text>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>KEEP GOING!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.padding,
  },
  contentCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.amber,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: Colors.amber,
    letterSpacing: 1,
  },
  animationStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.amber,
  },
  bananaWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bananaImage: {
    width: '100%',
    height: '100%',
  },
  subText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    textAlign: 'center',
    color: Colors.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  closeButton: {
    backgroundColor: Colors.red,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  closeButtonText: {
    color: '#FFF',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    letterSpacing: 1,
  },
});
