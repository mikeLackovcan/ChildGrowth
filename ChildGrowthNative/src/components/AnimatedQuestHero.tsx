import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import QuestHero from './QuestHero';
import QuestChampSprite from './QuestChampSprite';
import { normalizeAvatarId } from '../lib/brandMigration';

export type HeroMotion = 'idle' | 'celebrate' | 'focus' | 'dance';

export default function AnimatedQuestHero({
  id,
  style,
  motion = 'idle',
}: {
  id?: string;
  style?: StyleProp<ViewStyle>;
  motion?: HeroMotion;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const turn = useRef(new Animated.Value(0)).current;
  const depth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -5, duration: motion === 'focus' ? 1600 : 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: motion === 'focus' ? 1600 : 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    idle.start();
    return () => idle.stop();
  }, [float, motion]);

  useEffect(() => {
    const dimensionalTurn = Animated.loop(
      Animated.sequence([
        Animated.timing(depth, { toValue: 1, duration: motion === 'focus' ? 2200 : 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(depth, { toValue: -1, duration: motion === 'focus' ? 2200 : 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(depth, { toValue: 0, duration: 675, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      ]),
    );
    dimensionalTurn.start();
    return () => dimensionalTurn.stop();
  }, [depth, motion]);

  useEffect(() => {
    if (motion !== 'celebrate' && motion !== 'dance') {
      pulse.setValue(1);
      turn.setValue(0);
      return;
    }
    const celebration = Animated.parallel([
      Animated.sequence([
        Animated.spring(pulse, { toValue: motion === 'dance' ? 1.08 : 1.13, friction: 3, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(turn, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(turn, { toValue: -1, duration: 180, useNativeDriver: true }),
        Animated.timing(turn, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    ]);
    if (motion === 'dance') Animated.sequence([celebration, celebration]).start();
    else celebration.start();
  }, [motion, pulse, turn]);

  const rotate = turn.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-6deg', '0deg', '6deg'] });
  const rotateY = depth.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-7deg', '0deg', '7deg'] });
  const translateX = depth.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, 2] });
  const normalizedId = !id || id === 'default' ? 'quest_champ' : normalizeAvatarId(id);
  return (
    <Animated.View style={[style, { transform: [{ perspective: 700 }, { translateY: float }, { translateX }, { scale: pulse }, { rotate }, { rotateY }] }]}> 
      {normalizedId === 'quest_champ' ? (
        <QuestChampSprite motion={motion} style={{ width: '100%', height: '100%' }} />
      ) : (
        <QuestHero id={id} style={{ width: '100%', height: '100%' }} />
      )}
    </Animated.View>
  );
}
