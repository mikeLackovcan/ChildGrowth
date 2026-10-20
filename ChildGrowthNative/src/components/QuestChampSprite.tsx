import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type SpriteMotion = 'idle' | 'celebrate' | 'focus' | 'dance';

const MOTION_FRAMES: Record<SpriteMotion, number[]> = {
  idle: [0, 1],
  focus: [0, 1],
  dance: [4, 5],
  celebrate: [6, 7],
};

const MOTION_SPEED: Record<SpriteMotion, number> = {
  idle: 850,
  focus: 1250,
  dance: 190,
  celebrate: 240,
};

/** Frame-based 2D Quest Champ model with real pose changes for each motion. */
export default function QuestChampSprite({
  motion = 'idle',
  style,
}: {
  motion?: SpriteMotion;
  style?: StyleProp<ViewStyle>;
}) {
  const [step, setStep] = useState(0);
  const frames = MOTION_FRAMES[motion];
  const frame = frames[step % frames.length];
  const column = frame % 4;
  const row = Math.floor(frame / 4);

  useEffect(() => {
    setStep(0);
    const timer = setInterval(() => setStep((current) => current + 1), MOTION_SPEED[motion]);
    return () => clearInterval(timer);
  }, [motion]);

  return (
    <View style={[styles.frame, style]} accessible accessibilityLabel={`Quest Champ ${motion} animation`}>
      <Image
        source={require('../../assets/branding/quest-champ-sprite-v2.png')}
        resizeMode="stretch"
        style={[
          styles.sheet,
          {
            left: `${column * -100}%`,
            top: `${row * -100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  sheet: {
    position: 'absolute',
    width: '400%',
    height: '200%',
  },
});
