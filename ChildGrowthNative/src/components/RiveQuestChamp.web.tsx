import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import QuestChampSprite from './QuestChampSprite';
import useReducedMotion from '../hooks/useReducedMotion';
import type { HeroMotion } from './AnimatedQuestHero';

/** Web preview and reduced-capability fallback for the native Rive hero. */
export default function RiveQuestChamp({ motion, style }: {
  source?: number | string; motion: HeroMotion; skin?: number; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  return <QuestChampSprite motion={motion} playing={!reduced && motion !== 'idle'} style={style} />;
}
