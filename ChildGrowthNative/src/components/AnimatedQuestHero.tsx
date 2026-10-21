import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleProp, ViewStyle } from 'react-native';
import QuestHero from './QuestHero';
import RiveQuestChamp from './RiveQuestChamp';
import { normalizeAvatarId } from '../lib/brandMigration';
import useReducedMotion from '../hooks/useReducedMotion';

export type HeroMotion = 'idle' | 'celebrate' | 'focus' | 'dance';

/** Pose animation for Champ; restrained whole-artwork movement for the other heroes. */
export default function AnimatedQuestHero({ id, style, motion = 'idle' }: {
  id?: string; style?: StyleProp<ViewStyle>; motion?: HeroMotion;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const movement = useRef(new Animated.Value(0)).current;
  const [animationFinished, setAnimationFinished] = useState(false);
  useEffect(() => { setAnimationFinished(false); }, [motion, id]);
  const playing = active && !reduced && !animationFinished && (motion === 'celebrate' || motion === 'dance');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => setActive(next === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    movement.setValue(0);
    if (!playing) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(movement, { toValue: 1, duration: 250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(movement, { toValue: -1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(movement, { toValue: 0, duration: 250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]), { iterations: 2 });
    animation.start(({ finished }) => { if (finished) setAnimationFinished(true); });
    return () => { animation.stop(); movement.setValue(0); };
  }, [playing, motion, movement]);
  const champ = !id || id === 'default' || normalizeAvatarId(id) === 'quest_champ';
  return <Animated.View style={[style, { transform: [
    { translateY: movement.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, -6] }) },
    { rotate: movement.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) },
  ] }]}>
    {champ ? <RiveQuestChamp source={process.env.EXPO_PUBLIC_QUEST_CHAMP_RIVE_URL} style={{ width: '100%', height: '100%' }} motion={motion} />
      : <QuestHero id={id} style={{ width: '100%', height: '100%' }} />}
  </Animated.View>;
}
