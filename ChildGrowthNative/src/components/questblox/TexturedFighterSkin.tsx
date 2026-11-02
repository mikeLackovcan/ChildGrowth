import React from 'react';
import Svg, { ClipPath, Defs, G, Image, Path, Rect } from 'react-native-svg';
import { FighterPose, Point } from '../../utils/fighterRigging';
import { FighterAtlas as Atlas, FighterPart as Part } from '../../constants/fighterAtlases';
import { DEFAULT_BONE_ANCHORS, textureBoneMatrix, texturedBootAngle } from '../../utils/atlasRigging';
import { FighterAccessories } from './FighterAccessories';

const Sprite = React.memo(function Sprite({ atlas, part, x, y, width, height }: {
  atlas: Atlas; part: Part; x: number; y: number; width: number; height: number;
}) {
  const id = `part${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const head = part === 'head' ? atlas.combatHead : undefined;
  const region = head?.region ?? atlas.regions[part];
  const [rx, ry, rw, rh] = region;
  return <Svg x={x} y={y} width={width} height={height} viewBox={region.join(' ')} preserveAspectRatio="none">
    <Defs><ClipPath id={id}><Rect x={rx} y={ry} width={rw} height={rh} /></ClipPath></Defs>
    <G clipPath={`url(#${id})`}><Image href={head?.source ?? atlas.source} x={0} y={0} width={head?.size ?? atlas.size} height={head?.size ?? atlas.size} /></G>
  </Svg>;
});

function Segment({ atlas, part, a, b, width }: { atlas: Atlas; part: Part; a: Point; b: Point; width: number }) {
  const region = atlas.regions[part];
  const matrix = textureBoneMatrix(region, atlas.anchors?.[part] ?? DEFAULT_BONE_ANCHORS, a, b, width);
  return <G transform={`matrix(${matrix.join(' ')})`}>
    <Sprite atlas={atlas} part={part} x={0} y={0} width={region[2]} height={region[3]} />
  </G>;
}

export function TexturedHand({ atlas, at, angle }: { atlas: Atlas; at: Point; angle: number }) {
  return <G transform={`translate(${at.x} ${at.y}) rotate(${angle - 90})`}>
    <Sprite atlas={atlas} part="hand" x={-8} y={-8} width={17} height={19} />
  </G>;
}

function Limb({ atlas, limb, width, leg = false }: {
  atlas: Atlas; limb: FighterPose['frontArm']; width: number; leg?: boolean;
}) {
  const angle = Math.atan2(limb.end.y - limb.joint.y, limb.end.x - limb.joint.x) * 180 / Math.PI;
  const bootAngle = texturedBootAngle(limb.joint, limb.end);
  return <G>
    <Segment atlas={atlas} part={leg ? 'thigh' : 'upperArm'} a={limb.root} b={limb.joint} width={(leg ? 23 : 21) * width} />
    <Segment atlas={atlas} part={leg ? 'shin' : 'forearm'} a={limb.joint} b={limb.end} width={(leg ? 20 : 17) * width} />
    {leg ? <G transform={`translate(${limb.end.x} ${limb.end.y}) rotate(${bootAngle})`}>
      <Sprite atlas={atlas} part="boot" x={-10 * width} y={-17} width={29 * width} height={22} />
    </G> : <TexturedHand atlas={atlas} at={limb.end} angle={angle} />}
  </G>;
}

/** Raster materials follow the SAME solved skeleton as the vector skin and hit
 * capsules. Textures never move the skeleton or change damage/reach. */
export function TexturedFighterSkin({ atlas, pose, scarf = false, reduceMotion = false }: { atlas: Atlas; pose: FighterPose; scarf?: boolean; reduceMotion?: boolean }) {
  const w = pose.body.width, s = pose.shoulder, h = pose.hip;
  const spineAngle = Math.atan2(h.y - s.y, h.x - s.x) * 180 / Math.PI - 90;
  const spineLength = Math.hypot(h.x - s.x, h.y - s.y);
  const head = atlas.head ?? { width: 44, height: 53, top: -31 };
  // Connect the textured head's lower edge to the shoulder even when the head
  // tilts independently. Layer behind the collar and face, not above them.
  const neckOffset = (head.top + head.height - 5) * pose.body.height;
  const headRadians = pose.headTilt * Math.PI / 180;
  const neckX = pose.head.x - Math.sin(headRadians) * neckOffset;
  const neckY = pose.head.y + Math.cos(headRadians) * neckOffset;
  return <G>
    {atlas.accessories && <FighterAccessories family={atlas.accessories} pose={pose} reduceMotion={reduceMotion} />}
    <Limb atlas={atlas} limb={pose.backLeg} width={w} leg />
    <Limb atlas={atlas} limb={pose.backArm} width={w} />
    <Limb atlas={atlas} limb={pose.frontLeg} width={w} leg />
    <Sprite atlas={atlas} part="hips" x={h.x - 19 * w} y={h.y - 5} width={38 * w} height={20} />
    <Path d={`M${s.x} ${s.y + 2} L${neckX} ${neckY}`} stroke={atlas.neckColor ?? '#c69463'} strokeWidth={12 * w} strokeLinecap="round" />
    <G transform={`translate(${s.x} ${s.y}) rotate(${spineAngle})`}>
      <Sprite atlas={atlas} part="torso" x={-25 * w} y={-5} width={50 * w} height={spineLength + 9} />
    </G>
    <G transform={`translate(${pose.head.x} ${pose.head.y}) rotate(${pose.headTilt}) scale(${pose.body.height})`}>
      {scarf && !atlas.combatHead && <Path d={`M-18 -13 Q-31 ${-24 + (reduceMotion ? 0 : pose.followThrough)} -42 -16 L-36 -7 Q-28 -16 -18 -10 M-18 -12 Q-29 0 -41 2 L-35 9 Q-24 7 -16 -8`} fill="#7941ad" stroke="#a178d1" strokeWidth={0.7} />}
      <Sprite atlas={atlas} part="head" x={-head.width * (atlas.combatHead?.neckX ?? 0.5)} y={head.top} width={head.width} height={head.height} />
    </G>
    <Limb atlas={atlas} limb={pose.frontArm} width={w} />
  </G>;
}
