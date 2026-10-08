import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  withSequence, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import Svg, { Path, G, Text as SvgText, Circle, Polygon } from 'react-native-svg';

interface PrizeWheelModalProps {
  visible: boolean;
  onClose: () => void;
  prizeName: string;
}

const WHEEL_SIZE = 280;
const CENTER = WHEEL_SIZE / 2; // 140
const RADIUS = CENTER - 12; // 128

// Exact slice colors matching the initial app screenshot
const SLICE_COLORS = [
  '#E52521', // Red (Robux 💰)
  '#21B8F6', // Cyan Blue (Ice Cream 🍦)
  '#00E676', // Bright Green (Movie Night 🍿)
  '#FF9800', // Orange Yellow (Try Again 🍀)
  '#FF4081', // Pink (Extra TV Time 📺)
  '#9C27B0', // Purple (Skip a Chore 🛑)
];

const DEFAULT_PRIZES = [
  'Robux 💰',
  'Ice Cream 🍦',
  'Movie Night 🍿',
  'Try Again 🍀',
  'Extra TV Time 📺',
  'Skip a Chore 🛑',
];

export default function PrizeWheelModal({ visible, onClose, prizeName }: PrizeWheelModalProps) {
  const { t } = useTranslation();
  const storePrizes = useAppStore((state) => state.prizes);
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const pointerWobble = useSharedValue(0);
  
  const [hasSpun, setHasSpun] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedPrize, setDisplayedPrize] = useState('');

  // Slices data combined with store prizes
  const prizesList = (storePrizes && storePrizes.length >= 6) ? storePrizes.slice(0, 6) : DEFAULT_PRIZES;
  const wheelSlices = prizesList.map((prize, idx) => ({
    prize,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
  }));

  const triggerFinishHaptic = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  const handleStartSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setHasSpun(false);

    // Target prize selection
    const selectedPrize = prizeName || wheelSlices[Math.floor(Math.random() * wheelSlices.length)].prize;
    setDisplayedPrize(selectedPrize);

    // Match prize to slice index
    const foundIdx = wheelSlices.findIndex(s => s.prize.toLowerCase().includes(selectedPrize.toLowerCase()));
    const targetSlice = foundIdx >= 0 ? foundIdx : 0;
    
    // Target angle calculation (5 full rotations + slice alignment)
    const sliceAngle = 60;
    const targetAngle = 360 * 5 + (360 - (targetSlice * sliceAngle + 30));

    // Pointer needle wiggle animation
    pointerWobble.value = withRepeatTimingWobble();

    rotation.value = withTiming(
      targetAngle,
      {
        duration: 3800,
        easing: Easing.bezier(0.15, 0.85, 0.35, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(triggerFinishHaptic)();
          runOnJS(setIsSpinning)(false);
          runOnJS(setHasSpun)(true);
        }
      }
    );
  };

  const withRepeatTimingWobble = () => {
    return withSequence(
      withTiming(-14, { duration: 90 }),
      withTiming(14, { duration: 90 }),
      withTiming(-10, { duration: 110 }),
      withTiming(10, { duration: 110 }),
      withTiming(-5, { duration: 130 }),
      withTiming(0, { duration: 140 })
    );
  };

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 130 });
      rotation.value = 0;
      setHasSpun(false);
      setIsSpinning(false);
      handleStartSpin();
    } else {
      scale.value = 0.4;
      rotation.value = 0;
      setIsSpinning(false);
      setHasSpun(false);
    }
  }, [visible]);

  const wheelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pointerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pointerWobble.value}deg` }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Render SVG Slices matching initial app style
  const renderSlices = () => {
    return wheelSlices.map((slice, i) => {
      const angleStart = i * 60 - 90;
      const angleEnd = (i + 1) * 60 - 90;
      const angleMid = (i + 0.5) * 60 - 90;

      const radStart = (angleStart * Math.PI) / 180;
      const radEnd = (angleEnd * Math.PI) / 180;
      const radMid = (angleMid * Math.PI) / 180;

      const x1 = CENTER + RADIUS * Math.cos(radStart);
      const y1 = CENTER + RADIUS * Math.sin(radStart);
      const x2 = CENTER + RADIUS * Math.cos(radEnd);
      const y2 = CENTER + RADIUS * Math.sin(radEnd);

      const pathData = `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;

      // Text position along middle of slice
      const textRadius = RADIUS * 0.60;
      const tx = CENTER + textRadius * Math.cos(radMid);
      const ty = CENTER + textRadius * Math.sin(radMid);
      
      let textRotate = angleMid;
      if (angleMid > 90 && angleMid < 270) {
        textRotate += 180;
      }

      const emoji = slice.prize.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)?.[0] || '🎁';
      const label = slice.prize.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/, '').trim();

      return (
        <G key={i}>
          <Path d={pathData} fill={slice.color} stroke="#FFFFFF" strokeWidth="2.5" />
          
          {/* Text and Emoji rotated along radial axis */}
          <G transform={`translate(${tx}, ${ty}) rotate(${textRotate})`}>
            <SvgText
              x={0}
              y={4}
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              {`${label} ${emoji}`}
            </SvgText>
          </G>
        </G>
      );
    });
  };

  // Render Peg Dots on outer rim
  const renderPegs = () => {
    const pegs = [];
    for (let k = 0; k < 12; k++) {
      const pegRad = (k * 30 * Math.PI) / 180;
      const px = CENTER + (RADIUS - 2) * Math.cos(pegRad);
      const py = CENTER + (RADIUS - 2) * Math.sin(pegRad);
      pegs.push(<Circle key={k} cx={px} cy={py} r="3.5" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />);
    }
    return pegs;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalCard, cardAnimatedStyle]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Header Title & Subtitle matching original screenshot */}
          <Text style={styles.titleText}>{t('daily_quests_complete', 'Daily Quests Complete!')}</Text>
          <Text style={styles.subText}>{t('spin_wheel_sub', 'Spin the wheel to claim your reward!')}</Text>

          {/* Interactive Wheel Stage */}
          <View style={styles.wheelStage}>
            {/* White Top Pointer Arrow Needle */}
            <Animated.View style={[styles.pointerWrapper, pointerAnimatedStyle]}>
              <Svg width="28" height="28" viewBox="0 0 28 28">
                <Polygon points="14,26 4,4 24,4" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
              </Svg>
            </Animated.View>

            {/* Spinning SVG Pie Wheel */}
            <Animated.View style={[styles.wheelWrapper, wheelAnimatedStyle]}>
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                <Circle cx={CENTER} cy={CENTER} r={RADIUS + 4} fill="#FFB800" stroke="#FF9800" strokeWidth="3" />
                {renderSlices()}
                {renderPegs()}
                {/* Center Hub Circle */}
                <Circle cx={CENTER} cy={CENTER} r="18" fill="#FFFFFF" stroke="#FFB800" strokeWidth="3" />
                <Circle cx={CENTER} cy={CENTER} r="10" fill="#FFB800" />
              </Svg>
            </Animated.View>
          </View>

          {/* Bottom Spin / Winner Card matching original screenshot */}
          {hasSpun ? (
            <View style={styles.winnerBox}>
              <Text style={styles.congratsText}>🎉 {t('you_won', 'YOU WON:')}</Text>
              <Text style={styles.prizeNameText}>{displayedPrize || prizeName}</Text>
              
              <View style={styles.dayBadgeRow}>
                <Text style={styles.dayBadgeText}>{t('reward_day_today', 'Today (Day 1) 📅')} · {t('reward_valid_days', 'Valid for 1 Day 🗓️')}</Text>
              </View>

              <TouchableOpacity style={styles.spinButton} onPress={onClose}>
                <Text style={styles.spinButtonText}>{t('claim_prize', 'CLAIM REWARD!')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]} 
              onPress={handleStartSpin}
              disabled={isSpinning}
            >
              <Text style={styles.spinButtonText}>
                {isSpinning ? t('spinning_status', 'SPINNING...') : t('spin_wheel_btn', 'SPIN WHEEL 🎡')}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#181818',
    borderWidth: 2.5,
    borderColor: '#FFB800',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 30,
    padding: 6,
  },
  titleText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  wheelStage: {
    width: WHEEL_SIZE + 10,
    height: WHEEL_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  pointerWrapper: {
    position: 'absolute',
    top: -6,
    zIndex: 40,
    alignItems: 'center',
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  winnerBox: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  congratsText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  prizeNameText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: 8,
  },
  dayBadgeRow: {
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 14,
  },
  dayBadgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: '#21B8F6',
  },
  spinButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  spinButtonDisabled: {
    opacity: 0.7,
  },
  spinButtonText: {
    color: '#121212',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    letterSpacing: 1,
  },
});
