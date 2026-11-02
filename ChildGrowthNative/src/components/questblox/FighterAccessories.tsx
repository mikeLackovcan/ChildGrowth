import React from 'react';
import Svg, { ClipPath, Defs, G, Image, Polygon } from 'react-native-svg';
import type { FighterPose } from '../../utils/fighterRigging';

export type AccessoryFamily = 'dominus' | 'wizard' | 'unicorn' | 'dragon';
type Piece = 'goldWing' | 'pastelWing' | 'iceWing' | 'robe' | 'mane' | 'cape';
const source = require('../../assets/fighter-atlases/accessories-v1.png');
// Masks separate neighboring silhouettes whose rectangular bounds overlap.
const pieces: Record<Piece, { box: string; mask: string }> = {
  goldWing: { box: '10 20 480 585', mask: '0,0 430,0 430,390 500,480 500,620 0,620' },
  pastelWing: { box: '440 40 450 570', mask: '430,0 820,0 820,440 900,500 900,620 510,620 490,480 430,380' },
  iceWing: { box: '830 35 424 578', mask: '830,25 1254,25 1254,620 1140,620 1060,525 1020,450 930,490 950,345 830,315 830,280 940,220 920,120 830,75' },
  robe: { box: '8 630 497 578', mask: '0,620 510,620 510,1254 0,1254' },
  mane: { box: '505 625 360 580', mask: '510,620 870,620 870,980 790,1080 790,1254 510,1254' },
  cape: { box: '790 620 464 585', mask: '890,620 1254,620 1254,1254 790,1254 790,1100 900,960' },
};

function AccessorySprite({ part, x, y, width, height }: { part: Piece; x: number; y: number; width: number; height: number }) {
  const id = `accessory${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const piece = pieces[part];
  return <Svg x={x} y={y} width={width} height={height} viewBox={piece.box} preserveAspectRatio="none">
    <Defs><ClipPath id={id}><Polygon points={piece.mask} /></ClipPath></Defs>
    <G clipPath={`url(#${id})`}><Image href={source} width={1254} height={1254} /></G>
  </Svg>;
}

/** Accessories are behind the body, attached to solved joints, and cosmetic.
 * No independent timer: freezes, pauses and reduced motion stay deterministic. */
export function FighterAccessories({ family, pose, reduceMotion }: { family: AccessoryFamily; pose: FighterPose; reduceMotion: boolean }) {
  const s = pose.shoulder, h = pose.hip;
  const sway = reduceMotion ? 0 : pose.followThrough;
  const lean = Math.atan2(h.y - s.y, h.x - s.x) * 180 / Math.PI - 90;
  const wing: Piece | null = family === 'dominus' ? 'goldWing' : family === 'unicorn' ? 'pastelWing' : family === 'dragon' ? 'iceWing' : null;
  return <G>
    {family === 'dominus' && <G transform={`translate(${s.x - 8} ${s.y}) rotate(${lean + sway * 0.7})`}>
      <AccessorySprite part="cape" x={-28} y={2} width={58} height={106} />
    </G>}
    {family === 'wizard' && <G transform={`translate(${h.x} ${h.y - 7}) rotate(${lean + sway})`}>
      <AccessorySprite part="robe" x={-29} y={0} width={58} height={70} />
    </G>}
    {family === 'unicorn' && <>
      <G transform={`translate(${h.x - 12} ${h.y - 4}) rotate(${-18 + sway})`}>
        <AccessorySprite part="mane" x={-34} y={0} width={40} height={64} />
      </G>
      <G transform={`translate(${pose.head.x - 14} ${pose.head.y - 34}) rotate(${pose.headTilt + sway * 0.6})`}>
        <AccessorySprite part="mane" x={-37} y={0} width={43} height={71} />
      </G>
    </>}
    {wing && <G transform={`translate(${s.x - 4} ${s.y + 1}) rotate(${lean + sway * 0.55})`}>
      <G transform="translate(10 -4) scale(0.72 0.86)" opacity={0.78}>
        <AccessorySprite part={wing} x={-76} y={-79} width={84} height={91} />
      </G>
      <AccessorySprite part={wing} x={-83} y={-72} width={91} height={87} />
    </G>}
  </G>;
}
