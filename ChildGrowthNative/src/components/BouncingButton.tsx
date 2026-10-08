import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface BouncingButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticFeedback?: boolean;
}

export default function BouncingButton({ 
  children, 
  style, 
  onPressIn, 
  onPressOut, 
  onPress,
  scaleTo = 0.9,
  hapticFeedback = true,
  ...rest 
}: BouncingButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withTiming(scaleTo, { duration: 100 });
    if (hapticFeedback) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    if (onPressOut) onPressOut(e);
  };

  return (
    <Animated.View style={[{ width: '100%' }, style, animatedStyle]}>
      <Pressable 
        onPressIn={handlePressIn} 
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{ width: '100%' }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
