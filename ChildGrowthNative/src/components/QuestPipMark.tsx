import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type QuestPipMarkProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  background?: boolean;
};

/** A neutral companion mark shared by every child-selectable hero. */
export default function QuestPipMark({ size = 44, style, background = true }: QuestPipMarkProps) {
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityLabel="Pip, the QuestPip companion"
    >
      <Svg width="100%" height="100%" viewBox="0 0 80 80">
        {background && <Rect x="2" y="2" width="76" height="76" rx="23" fill="#3270EB" />}
        <Path
          d="M40 12 C43 12 46 14 49 17 L63 31 C68 36 68 44 63 49 L49 63 C44 68 36 68 31 63 L17 49 C12 44 12 36 17 31 L31 17 C34 14 37 12 40 12 Z"
          fill="#CBF250"
          stroke="#081A4B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <Circle cx="32" cy="38" r="3.4" fill="#081A4B" />
        <Circle cx="48" cy="38" r="3.4" fill="#081A4B" />
        <Path d="M31 48 C36 53 44 53 49 48" fill="none" stroke="#081A4B" strokeWidth="3.5" strokeLinecap="round" />
        <Path d="M58 13 L60 19 L66 21 L60 23 L58 29 L56 23 L50 21 L56 19 Z" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}
