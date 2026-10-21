import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { companionIds, normalizeAvatarId } from '../lib/brandMigration';
import QuestChampSprite from './QuestChampSprite';
import { heroFor } from '../lib/heroCatalog';

/** Full-body 2D heroes from the shared Quest Champ character collection. */
export default function QuestHero({ id = 'default', style }: { id?: string; style?: StyleProp<ViewStyle> }) {
  const normalizedId = id === 'default' ? 'quest_champ' : normalizeAvatarId(id);

  if (normalizedId === 'quest_champ') {
    return <QuestChampSprite motion="idle" playing={false} style={style} />;
  }

  const index = Math.max(0, companionIds.indexOf(normalizedId));
  const column = index % 4;
  const row = Math.floor(index / 4);
  const name = heroFor(normalizedId).name;

  return (
    <View style={[styles.frame, style]} accessible accessibilityLabel={`${name} Quest Champ hero`}>
      <Image
        source={require('../../assets/branding/quest-heroes-atlas-v2.png')}
        resizeMode="stretch"
        style={[
          styles.atlas,
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
  atlas: {
    position: 'absolute',
    width: '400%',
    height: '300%',
  },
});
