import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';

type QuestPipMarkProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  background?: boolean;
};

/** Compact Quest Champ hero mark used in headers and account screens. */
export default function QuestPipMark({ size = 44, style, background = true }: QuestPipMarkProps) {
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityLabel="Quest Champ hero"
    >
      <Image
        source={require('../../assets/branding/quest-hero-play-512.png')}
        resizeMode="cover"
        style={{ width: size, height: size, borderRadius: background ? Math.round(size * 0.28) : Math.round(size / 2) }}
      />
    </View>
  );
}
