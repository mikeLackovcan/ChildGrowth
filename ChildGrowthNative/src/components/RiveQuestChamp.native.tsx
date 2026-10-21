import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Fit, RiveView, useRive, useRiveFile, useViewModelInstance } from '@rive-app/react-native';
import QuestChampSprite from './QuestChampSprite';
import useReducedMotion from '../hooks/useReducedMotion';
import type { HeroMotion } from './AnimatedQuestHero';

const MOTION_VALUE: Record<HeroMotion, number> = { idle: 0, focus: 2, celebrate: 3, dance: 4 };

/** Native Rive renderer. It safely keeps the approved sprite until a production .riv source is supplied. */
export default function RiveQuestChamp({ source, motion, skin = 0, style }: {
  source?: number | string;
  motion: HeroMotion;
  skin?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const { riveFile, error } = useRiveFile(source || undefined);
  const { riveViewRef, setHybridRef } = useRive();
  const { instance } = useViewModelInstance(riveFile, {
    async: true,
    onInit: value => {
      value.numberProperty('motion')?.set(reduced ? 0 : MOTION_VALUE[motion]);
      value.numberProperty('skin')?.set(skin);
    },
  });

  useEffect(() => {
    if (!instance) return;
    instance.numberProperty('motion')?.set(reduced ? 0 : MOTION_VALUE[motion]);
    instance.numberProperty('skin')?.set(skin);
    riveViewRef?.playIfNeeded();
  }, [instance, motion, reduced, riveViewRef, skin]);

  if (!source || !riveFile || !instance || error) {
    return <QuestChampSprite motion={motion} playing={!reduced && motion !== 'idle'} style={style} />;
  }
  return <RiveView hybridRef={setHybridRef} file={riveFile} dataBind={instance} fit={Fit.Contain} frameRate={30} style={style} />;
}
