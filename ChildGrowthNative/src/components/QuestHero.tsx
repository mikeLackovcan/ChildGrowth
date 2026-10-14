import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Ellipse, Circle, Rect } from 'react-native-svg';
import { companionIds, normalizeAvatarId } from '../lib/brandMigration';

const colors = ['#3270EB', '#EC7259', '#6EABDE', '#D9A34E', '#E68DAC', '#9B83D5', '#55AD84', '#7887DA', '#48BFD5', '#B485D3', '#8CCDD4', '#EAC263'];
const skin = ['#C98759', '#E9AE80', '#935B40', '#BA794E'];

/** Original scalable portraits, with soft faces and continuous clothing rather than toy joints. */
export default function QuestHero({ id = 'default', style }: { id?: string; style?: StyleProp<ViewStyle> }) {
  const index = Math.max(0, companionIds.indexOf(normalizeAvatarId(id)));
  const tone = skin[index % skin.length];
  return (
    <View style={style} accessible accessibilityLabel={`${companionIds[index].replace('quest_', '')} quest hero`}>
      <Svg width="100%" height="100%" viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="57" fill="#15263D" />
        <Path d="M22 115 Q23 82 47 79 L73 79 Q97 82 98 115" fill={colors[index]} />
        <Path d="M47 76 Q60 94 73 76 L69 71 H51 Z" fill={tone} />
        <Ellipse cx="33" cy="53" rx="7" ry="10" fill={tone} />
        <Ellipse cx="87" cy="53" rx="7" ry="10" fill={tone} />
        <Path d="M32 40 Q31 15 60 16 Q89 15 88 40 L85 63 Q79 81 60 84 Q41 81 35 63 Z" fill={tone} />
        <Path d={index % 2 ? 'M31 51 Q19 16 45 18 Q55 4 69 16 Q96 11 91 53 L80 32 Q60 41 40 32 Z' : 'M30 51 Q24 29 34 22 L35 11 L47 18 Q58 3 72 9 L68 17 Q98 14 91 53 L80 30 Q61 43 39 34 Z'} fill="#202B49" />
        <Ellipse cx="47" cy="51" rx="7" ry="9" fill="#FFF8EF" />
        <Ellipse cx="73" cy="51" rx="7" ry="9" fill="#FFF8EF" />
        <Circle cx="49" cy="52" r="4" fill="#202B49" />
        <Circle cx="71" cy="52" r="4" fill="#202B49" />
        <Path d="M57 59 Q60 62 63 59" fill="none" stroke="#70452E" strokeWidth="2" strokeLinecap="round" />
        <Path d="M47 66 Q60 81 73 66 Z" fill="#FFF8EF" />
        <Path d="M43 86 L59 94 L77 85" fill="none" stroke="#15263D" strokeWidth="3" opacity="0.4" />
        <Circle cx="60" cy="104" r="8" fill="none" stroke="#CBF250" strokeWidth="4" />
        <Path d="M63 107 L69 113" stroke="#CBF250" strokeWidth="4" strokeLinecap="round" />
        {index > 5 && <Rect x="37" y="42" width="46" height="17" rx="8" fill="none" stroke={colors[index]} strokeWidth="3" />}
      </Svg>
    </View>
  );
}
