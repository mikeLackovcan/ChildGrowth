import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

let LottieView: any = null;
try {
  LottieView = require('lottie-react-native');
  if (LottieView?.default) LottieView = LottieView.default;
} catch (e) {
  // Safe fallback if lottie native module is unavailable on Expo Go
}

interface LottieConfettiProps {
  play: boolean;
  onAnimationFinish?: () => void;
}

export default function LottieConfetti({ play, onAnimationFinish }: LottieConfettiProps) {
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!LottieView) return;
    if (play) {
      animationRef.current?.play();
    } else {
      animationRef.current?.reset();
    }
  }, [play]);

  if (!LottieView) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <LottieView
        ref={animationRef}
        source={require('../assets/confetti.json')}
        loop={false}
        onAnimationFinish={onAnimationFinish}
        style={styles.lottie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  }
});
