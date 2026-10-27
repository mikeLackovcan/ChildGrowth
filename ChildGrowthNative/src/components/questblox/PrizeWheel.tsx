import React from 'react';
import { View, Animated, Text } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { palette } from './UI';
const point = (angle: number, radius: number) => ({ x: 160 + radius * Math.cos((angle - 90) * Math.PI / 180), y: 160 + radius * Math.sin((angle - 90) * Math.PI / 180) });
export default function PrizeWheel({ prizes, rotation }: { prizes: string[]; rotation: Animated.Value }) {
  return <View style={{ width: '100%', maxWidth: 330, aspectRatio: 1, alignSelf: 'center' }}>
    <Animated.View style={{ flex: 1, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1800], outputRange: ['0deg', '1800deg'] }) }] }}>
      <Svg viewBox="0 0 320 320" width="100%" height="100%" aria-hidden={true}>
        <Circle cx="160" cy="160" r="150" fill={palette.panel} stroke={palette.gold} strokeWidth="6" />
        {prizes.map((prize, index) => {
          const step = 360 / prizes.length, start = point(index * step, 144), end = point((index + 1) * step, 144);
          const label = point((index + 0.5) * step, 100);
          return <React.Fragment key={`${index}-${prize}`}>
            {prizes.length > 1 && <Path d={`M160 160 L${start.x} ${start.y} A144 144 0 ${step > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill={index % 2 ? palette.panel : '#34465e'} stroke={palette.gold} strokeWidth="1" />}
            <SvgText x={label.x} y={label.y - 4} textAnchor="middle" fontSize={prizes.length > 10 ? 20 : 26}>{prize.match(/\p{Extended_Pictographic}/u)?.[0] || "🎁"}</SvgText>
            <SvgText x={label.x} y={label.y + 16} fill={palette.ink} textAnchor="middle" fontSize="12" fontWeight="bold">{index + 1}</SvgText>
          </React.Fragment>;
        })}
        <Circle cx="160" cy="160" r="28" fill={palette.gold} /><SvgText x="160" y="168" textAnchor="middle" fontSize="26">★</SvgText>
      </Svg>
    </Animated.View>
    <Text aria-hidden={true} style={{ position: 'absolute', top: -5, alignSelf: 'center', color: palette.gold, fontSize: 34 }}>▼</Text>
  </View>;
}
