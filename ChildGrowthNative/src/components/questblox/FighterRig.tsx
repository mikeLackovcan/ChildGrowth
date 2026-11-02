import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { fighterLoadout, fighterPose, FighterLoadout, FighterPose, Point, PoseFighter, RIG_SCALE } from '../../utils/fighterRigging';
import { TexturedFighterSkin, TexturedHand } from './TexturedFighterSkin';
import { texturedFighterAtlas } from '../../constants/fighterAtlases';
import { fighterGrounding, fighterSwingTrail } from '../../utils/fighterPresentation';

interface FighterRigProps {
  fighter: PoseFighter; outfit?: string; reduceMotion: boolean; pixelsPerWorldUnit: number;
}
type Materials = { suit: string; skin: string; legs: string; face: string };
function shade(hex: string, amount: number) {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${channels.map(c => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))).join(',')})`;
}

function Bone({ a, b, width, color }: { a: Point; b: Point; width: number; color: string }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  return <G transform={`translate(${a.x} ${a.y}) rotate(${angle})`}>
    <Path d={`M0 ${-width / 2} C${length * 0.4} ${-width * 0.57} ${length * 0.7} ${-width * 0.44} ${length} ${-width * 0.4} Q${length + width * 0.55} 0 ${length} ${width * 0.4} C${length * 0.6} ${width * 0.5} ${length * 0.3} ${width * 0.55} 0 ${width / 2} Q${-width * 0.65} 0 0 ${-width / 2}Z`} fill={color} />
    <Path d={`M2 ${-width * 0.3} Q${length * 0.5} ${-width * 0.36} ${length - 2} ${-width * 0.23}`} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.18} fill="none" />
  </G>;
}
function Hand({ at, material, angle = 0 }: { at: Point; material: string; angle?: number }) {
  return <G transform={`translate(${at.x} ${at.y}) rotate(${angle})`}><Ellipse rx={8} ry={7} fill={material} /><Ellipse cx={-3} cy={5} rx={4} ry={3} fill={material} /><Path d="M1 -4 L5 -3" stroke="#fff" strokeWidth={1.5} opacity={0.3} /></G>;
}
function Limb({ limb, kit, materials, width, leg = false, rear = false }: { limb: FighterPose['frontArm']; kit: FighterLoadout; materials: Materials; width: number; leg?: boolean; rear?: boolean }) {
  const angle = Math.atan2(limb.end.y - limb.joint.y, limb.end.x - limb.joint.x) * 180 / Math.PI;
  const bootAngle = limb.end.y > -15 ? 0 : Math.max(-55, Math.min(25, angle - 80));
  return <G opacity={rear ? 0.85 : 1}>
    <Bone a={limb.root} b={limb.joint} width={23 * width} color={leg ? materials.legs : materials.suit} />
    <Bone a={limb.joint} b={limb.end} width={(leg ? 19 : 17) * width} color={leg ? materials.legs : materials.skin} />
    {kit.head === 'robot' && <Circle cx={limb.joint.x} cy={limb.joint.y} r={6 * width} fill="#1d2636" stroke={kit.accent} strokeWidth={1.5} />}
    {leg ? <G transform={`translate(${limb.end.x} ${limb.end.y}) rotate(${bootAngle}) scale(${width} 1)`}>
      <Path d="M-9 -8 Q-3 -11 4 -6 L7 -2 Q18 -2 18 4 Q4 7 -11 4 L-11 -3Z" fill="#172031" />
      <Path d="M-8 3 Q5 5 15 3" stroke={kit.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M-4 -5 L2 -4 M-3 -2 L4 -1" stroke="#fff" strokeWidth={1.5} opacity={0.4} />
    </G> : <Hand at={limb.end} material={materials.skin} angle={angle} />}
  </G>;
}

function Weapon({ kit }: { kit: FighterLoadout }) {
  const n = kit.length, c = kit.accent;
  const id = `weapon${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <G stroke="#101628" strokeWidth={2} strokeLinejoin="round">
    <Defs>
      <LinearGradient id={`${id}gold`} x1="0%" y1="0%" x2="20%" y2="100%">
        <Stop offset="0%" stopColor="#fff5c4" /><Stop offset="22%" stopColor="#ffe489" /><Stop offset="47%" stopColor={c} /><Stop offset="68%" stopColor="#c38c25" /><Stop offset="100%" stopColor="#69491c" />
      </LinearGradient>
      <LinearGradient id={`${id}steel`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#f4f7ff" /><Stop offset="30%" stopColor="#a8b9ce" /><Stop offset="49%" stopColor="#e9f0ff" /><Stop offset="52%" stopColor="#6b7c94" /><Stop offset="100%" stopColor="#253549" />
      </LinearGradient>
      <LinearGradient id={`${id}crystal`} x1="0%" y1="0%" x2="75%" y2="100%">
        <Stop offset="0%" stopColor="#fff" /><Stop offset="28%" stopColor={c} /><Stop offset="49%" stopColor="#eafcff" /><Stop offset="52%" stopColor={c} /><Stop offset="100%" stopColor="#28537a" />
      </LinearGradient>
    </Defs>
    {kit.weapon !== 'gauntlet' && <G><Rect x={-18} y={-4} width={Math.max(22, n + 4)} height={8} rx={4} fill="#384658" />
      <Path d="M-14 -3 V3 M-9 -3 V3 M-3 -4 V4 M2 -4 V4 M7 -4 V4" stroke={c} strokeWidth={2} /></G>}
    {kit.weapon === 'gauntlet' && <G stroke="#78531d" strokeWidth={1}>
      <Path d={`M-10 -8 Q-3 -12 7 -10 Q${n + 3} -13 ${n} 0 Q${n + 2} 12 7 11 L-8 8Z`} fill={`url(#${id}gold)`} />
      <Path d="M-10 -8 L-10 8 M-6 -9 L-6 9" stroke="#ffeab0" strokeWidth={2.5} />
      <Path d="M5 -7 Q8 -9 11 -7 M12 -6 Q15 -8 18 -5 M6 0 Q9 -2 12 0 M12 6 L17 5" stroke="#fff2bd" strokeWidth={1.7} fill="none" />
      <Ellipse cx={2} cy={8} rx={6} ry={4} fill={`url(#${id}gold)`} />
    </G>}
    {kit.weapon === 'katana' && <G><Path d={`M12 -4 Q${n - 10} -8 ${n} -2 L${n - 9} 4 H12 Z`} fill={`url(#${id}steel)`} /><Path d={`M16 -4 L${n - 4} -2`} stroke={c} /><Rect x={10} y={-10} width={4} height={20} rx={1} fill={c} /></G>}
    {kit.weapon === 'spear' && <G>
      <Polygon points={`${n - 22},-3 ${n - 12},-8 ${n},0 ${n - 12},8 ${n - 22},3`} fill={`url(#${id}crystal)`} />
      <Path d={`M${n - 21} 0 H${n - 2} L${n - 12} -6`} stroke="#e5fff2" strokeWidth={0.8} fill="none" />
      <Rect x={n - 25} y={-4} width={4} height={8} rx={1} fill={`url(#${id}gold)`} strokeWidth={0.7} />
    </G>}
    {kit.weapon === 'hammer' && <G><Rect x={n - 18} y={-17} width={18} height={34} rx={3} fill={`url(#${id}steel)`} /><Rect x={n - 16} y={-14} width={5} height={28} fill={c} /><Path d={`M${n - 3} -14 V14`} stroke="#e1f2ff" strokeWidth={3} /></G>}
    {kit.weapon === 'axe' && <G>
      <Path d={`M${n - 15} -7 L${n - 4} -22 Q${n + 7} 0 ${n - 4} 22 L${n - 15} 7 Z`} fill={`url(#${id}crystal)`} />
      <Path d={`M${n - 4} -18 Q${n + 3} 0 ${n - 4} 18 M${n - 13} -5 L${n - 1} 0 L${n - 13} 5 M${n - 1} 0 L${n - 6} -14`} fill="none" stroke="#e6fbff" strokeWidth={1} />
      <Rect x={n - 18} y={-8} width={5} height={16} rx={2} fill={`url(#${id}steel)`} strokeWidth={0.8} />
    </G>}
    {kit.weapon === 'mace' && <G>
      <Polygon points={`${n - 19},-8 ${n - 13},-16 ${n - 7},-9 ${n},-10 ${n - 2},0 ${n},10 ${n - 7},9 ${n - 13},16 ${n - 19},8 ${n - 23},0`} fill={`url(#${id}gold)`} />
      <Ellipse cx={n - 13} cy={0} rx={7} ry={10} fill={`url(#${id}gold)`} stroke="#b68528" strokeWidth={0.7} />
      <Path d={`M${n - 17} -6 Q${n - 13} -11 ${n - 9} -5 M${n - 13} -13 V-10 M${n - 21} 0 H${n - 19}`} stroke="#fff4c9" strokeWidth={1.3} fill="none" />
    </G>}
    {(kit.weapon === 'staff' || kit.weapon === 'wand') && <G><Circle cx={n - 7} cy={0} r={10} fill={c} opacity={0.35} stroke="none" /><Polygon points={`${n - 7},-10 ${n - 3},-3 ${n + 1},0 ${n - 3},4 ${n - 7},10 ${n - 11},4 ${n - 16},0 ${n - 11},-3`} fill="#e7e7ff" stroke={c} /><Circle cx={n - 7} cy={0} r={3} fill="#fff" /></G>}
    {kit.weapon === 'cannon' && <G>
      <Rect x={0} y={-12} width={n} height={24} rx={5} fill={`url(#${id}steel)`} />
      <Rect x={3} y={-9} width={Math.max(1, n - 12)} height={18} rx={3} fill="#203447" strokeWidth={0.8} />
      <Path d={`M8 -6 H${n - 13} M8 0 H${n - 13} M8 6 H${n - 13}`} stroke={c} strokeWidth={1.4} />
      <Rect x={n - 8} y={-11} width={8} height={22} rx={2} fill={`url(#${id}steel)`} />
      <Ellipse cx={n} cy={0} rx={4} ry={9} fill="#142331" stroke="#a8c8d9" strokeWidth={1} />
      <Ellipse cx={n + 0.2} cy={0} rx={2} ry={6} fill={c} stroke="none" />
      <Path d={`M5 -10 H${n - 10}`} stroke="#effaff" strokeWidth={0.8} opacity={0.8} />
    </G>}
    {kit.weapon === 'fan' && <G><Path d={`M7 0 L${n - 8} -23 Q${n + 9} 0 ${n - 8} 23 Z`} fill={c} /><Path d={`M7 0 L${n - 3} -14 M7 0 H${n} M7 0 L${n - 3} 14`} stroke="#ffe6fa" /></G>}
    {kit.weapon === 'tonfa' && <G><Rect x={11} y={-6} width={n - 11} height={12} rx={4} fill={c} /><Rect x={17} y={0} width={7} height={17} rx={2} fill="#df8a3f" /><Path d={`M16 -2 H${n - 4}`} stroke="#fff0c1" /></G>}
    {kit.weapon === 'baton' && <G><Rect x={10} y={-5} width={n - 10} height={10} rx={4} fill={c} /><Path d={`M15 -2 H${n - 4}`} stroke="#fff" /></G>}
  </G>;
}

function Head({ kit, pose, outfit, materials, reduceMotion }: { kit: FighterLoadout; pose: FighterPose; outfit?: string; materials: Materials; reduceMotion: boolean }) {
  const c = kit.accent;
  const follow = reduceMotion ? 0 : pose.followThrough;
  return <G transform={`translate(${pose.head.x} ${pose.head.y}) rotate(${pose.headTilt}) scale(${pose.body.height})`}>
    <Ellipse cx={-19} cy={1} rx={4} ry={6} fill={materials.skin} />
    <Rect x={-20} y={-20} width={40} height={39} rx={16} fill={materials.face} />
    <Path d="M-13 -13 Q-7 -19 5 -16" stroke="#fff" strokeWidth={2.5} opacity={0.24} fill="none" strokeLinecap="round" />
    {kit.head === 'mask' && <G><Path d="M-20 -10 Q-23 -27 1 -24 Q24 -23 20 -6 L-20 -6 M-20 2 Q0 -1 20 2 L18 13 Q0 26 -18 13Z" fill={materials.suit} /><Path d="M-20 -7 H20 M-18 7 Q0 11 18 7" stroke={c} strokeWidth={2.5} /><Path d={`M-20 -4 Q-35 ${-14 + follow} -47 ${-8 + follow} M-20 -3 Q-32 ${7 + follow} -43 ${10 + follow}`} stroke={c} strokeWidth={5} strokeLinecap="round" fill="none" /></G>}
    {kit.head === 'hair' && <G fill="#804429" stroke="#43241e" strokeWidth={2}><Path d="M-21 -7 L-24 -20 L-15 -27 L1 -29 L20 -23 L23 -11 L13 -5 L9 -18 L-1 -7 L-5 -18 L-15 -4Z" /><Path d="M-16 -21 L-11 -13 M-5 -24 L0 -15 M8 -23 L14 -14" stroke="#dc8952" strokeWidth={3} /></G>}
    {(kit.head === 'helmet' || kit.head === 'cap' || outfit === 'explorer') && <G><Path d="M-22 -13 Q-23 -34 0 -34 Q21 -34 23 -13Z" fill={kit.head === 'cap' ? '#b93e3c' : c} stroke="#182131" strokeWidth={2} /><Rect x={-25} y={-16} width={53} height={6} rx={2} fill={c} /><Path d="M0 -31 V-17" stroke="#fff" strokeWidth={3} opacity={0.6} /></G>}
    {kit.head === 'hat' && <G><Path d="M-24 -17 L-8 -58 L18 -21 L31 -14 L-27 -13Z" fill={kit.suit} stroke={c} strokeWidth={2} /><Path d="M-15 -23 L16 -22 M-7 -43 L-4 -37 L-10 -37Z" stroke="#ffeeba" strokeWidth={3} /></G>}
    {kit.head === 'crown' && <Path d="M-22 -14 L-26 -35 L-12 -24 L-3 -39 L7 -25 L23 -34 L20 -13Z" fill={c} stroke="#543d21" strokeWidth={2} />}
    {kit.head === 'robot' && <G><Rect x={-23} y={-22} width={46} height={41} rx={3} fill={kit.suit} stroke={c} strokeWidth={2} /><Rect x={-16} y={-8} width={35} height={7} rx={2} fill={c} /><Path d="M-12 10 H12" stroke="#a7d6e9" strokeWidth={3} /></G>}
    {(kit.head === 'horn' || kit.head === 'dragon') && <G><Path d="M-6 -20 L0 -47 L9 -20Z" fill={kit.head === 'horn' ? '#ffe1a1' : c} stroke="#526492" strokeWidth={2} /><Path d="M-20 -12 L-31 -30 L-11 -23" fill={c} stroke="#526492" strokeWidth={2} />{kit.head === 'dragon' && <Path d="M14 -21 L29 -34 L22 -9" fill={c} stroke="#526492" strokeWidth={2} />}</G>}
    {kit.head === 'bird' && <Path d="M13 -4 L34 4 L21 13 L13 8Z" fill="#ffd275" stroke="#482c49" strokeWidth={2} />}
    {kit.head !== 'robot' && <G fill="#121b2d"><Rect x={-6} y={-5} width={4} height={6} rx={1} /><Rect x={10} y={-5} width={4} height={6} rx={1} />{kit.head !== 'mask' && <Path d="M-2 8 Q5 14 12 7" stroke="#182030" strokeWidth={2.5} fill="none" />}</G>}
  </G>;
}

/** Articulated raster/vector skins; the same pose drives combat capsules. */
export function FighterRig({ fighter, outfit, reduceMotion, pixelsPerWorldUnit }: FighterRigProps) {
  const { id: fighterId, action, facing, y: airborne } = fighter;
  const kit = fighterLoadout(fighterId);
  const atlas = texturedFighterAtlas(fighterId, outfit);
  // Never substitute a decorative pose: collision and skin evaluate the same
  // foot anchors, transitions and jump velocity, including reduced-motion mode.
  const pose = fighterPose(fighter);
  const prefix = `rig${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const materials: Materials = { suit: `url(#${prefix}suit)`, skin: `url(#${prefix}skin)`, legs: `url(#${prefix}legs)`, face: `url(#${prefix}face)` };
  const scale = RIG_SCALE * pixelsPerWorldUnit;
  const grounding = fighterGrounding(fighter, pose);
  const trail = reduceMotion ? [] : fighterSwingTrail(fighter);
  const s = pose.shoulder, h = pose.hip, w = pose.body.width;
  const torso = `M${s.x - 19 * w} ${s.y - 3} Q${s.x} ${s.y - 12} ${s.x + 19 * w} ${s.y - 3} Q${s.x + 28 * w} ${s.y + 9} ${h.x + 17 * w} ${h.y - 5} Q${h.x + 22 * w} ${h.y + 12} ${h.x} ${h.y + 12} Q${h.x - 22 * w} ${h.y + 12} ${h.x - 17 * w} ${h.y - 5} Q${s.x - 26 * w} ${s.y + 14} ${s.x - 19 * w} ${s.y - 3}Z`;
  return <Svg width={280 * scale} height={280 * scale} viewBox="-140 -260 280 280" pointerEvents="none" accessible={false}>
    <Defs>
      <RadialGradient id={`${prefix}ground`} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor="#02030b" stopOpacity={1} />
        <Stop offset="50%" stopColor="#02030b" stopOpacity={0.6} />
        <Stop offset="100%" stopColor="#02030b" stopOpacity={0} />
      </RadialGradient>
      {(['suit', 'skin', 'legs'] as const).map(name => <LinearGradient key={name} id={`${prefix}${name}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor={shade(kit[name], 0.24)} /><Stop offset="38%" stopColor={kit[name]} /><Stop offset="100%" stopColor={shade(kit[name], -0.38)} />
      </LinearGradient>)}
      <RadialGradient id={`${prefix}face`} cx="34%" cy="28%" rx="78%" ry="80%">
        <Stop offset="0%" stopColor={shade(kit.skin, 0.12)} /><Stop offset="65%" stopColor={kit.skin} /><Stop offset="100%" stopColor={shade(kit.skin, -0.32)} />
      </RadialGradient>
    </Defs>
    <Ellipse cx={0} cy={1} rx={grounding.radius} ry={9} fill={`url(#${prefix}ground)`} opacity={grounding.opacity} />
    {grounding.feet.map((foot, index) => <Ellipse key={index} cx={foot.x} cy={1} rx={foot.radius} ry={4} fill={`url(#${prefix}ground)`} opacity={foot.opacity} />)}
    <G transform={`translate(0 ${-airborne / RIG_SCALE}) scale(${facing} 1)`}>
      <G transform={`rotate(${pose.bodyRotation} ${pose.hip.x} ${pose.hip.y})`}>
        {trail.map((ribbon, index) => <Polygon key={index} points={ribbon.points.map(p => `${p.x},${p.y}`).join(' ')} fill={kit.accent} opacity={ribbon.opacity} />)}
        {atlas ? <TexturedFighterSkin atlas={atlas} pose={pose} scarf={kit.head === 'mask'} reduceMotion={reduceMotion} /> : <G>
        {(kit.head === 'hat' || kit.head === 'crown') && <Path d={`M${s.x - 13} ${s.y} Q${h.x - 30} ${h.y + 12} ${h.x - 37 - (reduceMotion ? 0 : pose.followThrough)} ${h.y + 24} Q${h.x - 9} ${h.y + 32} ${h.x + 5} ${h.y + 16} L${s.x + 8} ${s.y + 2}Z`} fill={materials.suit} stroke={kit.accent} strokeWidth={1} />}
        <Limb limb={pose.backLeg} kit={kit} materials={materials} width={w} leg rear />
        <Limb limb={pose.backArm} kit={kit} materials={materials} width={w} rear />
        <Limb limb={pose.frontLeg} kit={kit} materials={materials} width={w} leg />
        <Path d={torso} fill={materials.suit} />
        <Ellipse cx={s.x + 1} cy={s.y - 7} rx={9 * w} ry={11} fill={materials.skin} />
        <Path d={`M${s.x - 17 * w} ${s.y + 3} Q${s.x - 21 * w} ${s.y + 17} ${h.x - 14 * w} ${h.y - 8}`} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.19} fill="none" />
        <Path d={`M${s.x - 10 * w} ${s.y + 10} Q${s.x + 3} ${s.y + 18} ${s.x + 15 * w} ${s.y + 9}`} stroke={kit.accent} strokeWidth={2} opacity={0.6} fill="none" />
        <Path d={`M${h.x - 17 * w} ${h.y - 1} Q${h.x} ${h.y + 4} ${h.x + 17 * w} ${h.y - 1}`} stroke="#1a2236" strokeWidth={8} fill="none" />
        <Rect x={h.x - 3} y={h.y - 3} width={7} height={7} rx={2} fill={kit.accent} />
        <Polygon points={`${pose.shoulder.x},${pose.shoulder.y + 10} ${pose.shoulder.x + 8},${pose.shoulder.y + 19} ${pose.shoulder.x},${pose.shoulder.y + 28} ${pose.shoulder.x - 8},${pose.shoulder.y + 19}`} fill={kit.accent} />
        <Head kit={kit} pose={pose} outfit={outfit} materials={materials} reduceMotion={reduceMotion} />
        <Limb limb={pose.frontArm} kit={kit} materials={materials} width={w} />
        </G>}
        <G transform={`translate(${pose.frontArm.end.x} ${pose.frontArm.end.y}) rotate(${pose.weaponAngle})`}><Weapon kit={kit} /></G>
        {kit.weapon !== 'gauntlet' && (atlas ? <TexturedHand atlas={atlas} at={pose.frontArm.end} angle={pose.weaponAngle} /> : <Hand at={pose.frontArm.end} material={materials.skin} angle={pose.weaponAngle} />)}
        {pose.gripMix > 0.5 && (atlas ? <TexturedHand atlas={atlas} at={pose.backArm.end} angle={pose.weaponAngle} /> : <Hand at={pose.backArm.end} material={materials.skin} angle={pose.weaponAngle} />)}
        {action === 'block' && <Path d="M39 -153 Q65 -108 39 -68" stroke={kit.accent} strokeWidth={4} opacity={0.7} fill="none" />}
      </G>
    </G>
  </Svg>;
}
