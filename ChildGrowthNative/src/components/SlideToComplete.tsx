import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { ChevronRight, Check } from 'lucide-react-native';

interface SlideToCompleteProps {
  onComplete: () => void;
  isDone: boolean;
  title: string;
  icon?: string;
  badgeLabel?: string;
  badgeColor?: string;
  badgeBg?: string;
}

const HANDLE_SIZE = 44;

export default function SlideToComplete({
  onComplete,
  isDone,
  title,
  icon = '⭐',
  badgeLabel,
  badgeColor = Colors.blue,
  badgeBg = Colors.blueDim,
}: SlideToCompleteProps) {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(300);
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(isDone);

  const maxTranslate = Math.max(0, trackWidth - HANDLE_SIZE - 12);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const triggerCompletion = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    onComplete();
  };

  const panGesture = Gesture.Pan()
    .enabled(!isDone)
    .onUpdate((e) => {
      let x = e.translationX;
      if (x < 0) x = 0;
      if (x > maxTranslate) x = maxTranslate;
      translateX.value = x;
    })
    .onEnd(() => {
      // Threshold is 60% of the track
      if (translateX.value > maxTranslate * 0.6) {
        translateX.value = withSpring(maxTranslate, { damping: 15, stiffness: 150 });
        isCompleted.value = true;
        runOnJS(triggerCompletion)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: translateX.value + HANDLE_SIZE + 6,
  }));

  const textOpacityStyle = useAnimatedStyle(() => {
    const opacity = maxTranslate > 0 ? 1 - translateX.value / (maxTranslate * 0.7) : 1;
    return { opacity: Math.max(0, opacity) };
  });

  return (
    <View style={[styles.container, isDone && styles.containerDone]} onLayout={onLayout}>
      {/* Background track fill */}
      <Animated.View style={[styles.progressFill, progressFillStyle]} />

      {/* Track Label Content */}
      <Animated.View style={[styles.labelContainer, textOpacityStyle]}>
        <View style={styles.leftMeta}>
          <Text style={styles.taskTitle} numberOfLines={1}>{title}</Text>
          {badgeLabel && (
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
            </View>
          )}
        </View>
        {!isDone && (
          <View style={styles.slideHint}>
            <Text style={styles.slideHintText}>{t('slide_hint', 'SLIDE')}</Text>
            <ChevronRight size={16} color={Colors.textMuted} />
          </View>
        )}
      </Animated.View>

      {/* Draggable Handle */}
      {isDone ? (
        <View style={[styles.handle, styles.handleDone]}>
          <Check size={22} color="#121212" />
        </View>
      ) : (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <Text style={styles.handleEmoji}>{icon}</Text>
          </Animated.View>
        </GestureDetector>
      )}

      {isDone && (
        <View style={styles.stamp}>
          <Text style={styles.stampText}>{t('completed_stamp', 'HOTOVO')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 58,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 6,
    position: 'relative',
    overflow: 'hidden',
    marginVertical: 4,
  },
  containerDone: {
    backgroundColor: Colors.greenDim,
    borderColor: Colors.green,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(74, 222, 128, 0.25)',
    borderRadius: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: HANDLE_SIZE + 12,
    paddingRight: 12,
    zIndex: 1,
  },
  leftMeta: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  taskTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: Colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
  },
  slideHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  slideHintText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.border2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 6,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  handleDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  handleEmoji: {
    fontSize: 20,
  },
  stamp: {
    position: 'absolute',
    right: 12,
    top: 14,
    borderWidth: 2,
    borderColor: Colors.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    transform: [{ rotate: '-10deg' }],
    backgroundColor: 'rgba(18,18,18,0.85)',
    zIndex: 5,
  },
  stampText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 10,
    color: Colors.green,
    letterSpacing: 1,
  },
});
