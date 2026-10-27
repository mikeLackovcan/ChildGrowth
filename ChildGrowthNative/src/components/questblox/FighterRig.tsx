import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { FighterAction } from '../../utils/fightingGame';
import { fighterLoadout, FighterLoadout, FighterPose, Point, RIG_SCALE, sampleFighterPose, attackSpec, isAttack } from '../../utils/fighterRigging';

interface FighterRigProps {
  fighterId: string; outfit?: string; action: FighterAction; actionElapsed: number;
  facing: -1 | 1; airborne: number; reduceMotion: boolean; pixelsPerWorldUnit: number;
}

function Bone({ a, b, width, color }: { a: Point; b: Point; width: number; color: string }) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  return <G transform={`translate(${a.x} ${a.y}) rotate(${angle})`}>
    <Rect x={-3} y={-width / 2} width={length + 6} height={width} rx={4} fill={color} stroke="#101628" strokeWidth={2.5} />
    <Rect x={0} y={-width / 2 + 2} width={length} height={3} rx={1} fill="#ffffff" opacity={0.24} />
    <Path d={`M0 ${width / 2 - 4} H${length}`} stroke="#000" strokeWidth={3} opacity={0.2} />
  </G>;
}
function Limb({ limb, kit, leg = false, rear = false }: { limb: FighterPose['frontArm']; kit: FighterLoadout; leg?: boolean; rear?: boolean }) {
  return <G opacity={rear ? 0.8 : 1}>
    <Bone a={limb.root} b={limb.joint} width={leg ? 21 : 22} color={leg ? kit.legs : kit.suit} />
    <Circle cx={limb.joint.x} cy={limb.joint.y} r={8} fill="#1d2636" stroke={kit.accent} strokeWidth={2} />
    <Bone a={limb.joint} b={limb.end} width={leg ? 19 : 17} color={leg ? kit.legs : kit.skin} />
    {leg ? <G transform={`translate(${limb.end.x} ${limb.end.y}) rotate(${Math.max(-65, Math.min(10, (limb.end.y - limb.root.y - 30) * 0.8))})`}>
      <Rect x={-10} y={-7} width={26} height={12} rx={3} fill="#172031" stroke={kit.accent} strokeWidth={2} />
      <Path d="M-7 3 H13" stroke="#ffffff" strokeWidth={2} opacity={0.6} />
    </G> : <Rect x={limb.end.x - 8} y={limb.end.y - 8} width={16} height={16} rx={4} fill={kit.skin} stroke="#121a2e" strokeWidth={2} />}
  </G>;
}

function Weapon({ kit }: { kit: FighterLoadout }) {
  const n = kit.length, c = kit.accent;
  return <G stroke="#101628" strokeWidth={2} strokeLinejoin="round">
    <Rect x={-6} y={-4} width={Math.max(10, n - 8)} height={8} rx={2} fill="#384658" />
    <Path d="M-3 -4 V4 M2 -4 V4 M7 -4 V4" stroke={c} strokeWidth={2} />
    {kit.weapon === 'gauntlet' && <G><Rect x={1} y={-10} width={n - 1} height={20} rx={4} fill={c} /><Path d={`M5 -7 H${n - 3} M7 -7 V7 M13 -7 V7`} stroke="#fff3b1" /><Circle cx={9} cy={0} r={3} fill="#fff" /></G>}
    {kit.weapon === 'katana' && <G><Path d={`M12 -4 Q${n - 10} -8 ${n} -2 L${n - 9} 4 H12 Z`} fill="#e5edff" /><Path d={`M16 -4 L${n - 4} -2`} stroke={c} /><Rect x={10} y={-10} width={4} height={20} rx={1} fill={c} /></G>}
    {kit.weapon === 'spear' && <Polygon points={`${n - 22},-3 ${n - 12},-8 ${n},0 ${n - 12},8 ${n - 22},3`} fill={c} />}
    {kit.weapon === 'hammer' && <G><Rect x={n - 18} y={-17} width={18} height={34} rx={3} fill="#8192a8" /><Rect x={n - 16} y={-14} width={5} height={28} fill={c} /><Path d={`M${n - 3} -14 V14`} stroke="#e1f2ff" strokeWidth={3} /></G>}
    {kit.weapon === 'axe' && <G><Path d={`M${n - 15} -7 L${n - 4} -22 Q${n + 7} 0 ${n - 4} 22 L${n - 15} 7 Z`} fill="#b8efff" /><Path d={`M${n - 4} -18 L${n} 0 L${n - 4} 18`} fill="none" stroke={c} /></G>}
    {kit.weapon === 'mace' && <Polygon points={`${n - 19},-8 ${n - 13},-16 ${n - 7},-9 ${n},-10 ${n - 2},0 ${n},10 ${n - 7},9 ${n - 13},16 ${n - 19},8 ${n - 23},0`} fill={c} />}
    {(kit.weapon === 'staff' || kit.weapon === 'wand') && <G><Circle cx={n - 7} cy={0} r={10} fill={c} opacity={0.35} stroke="none" /><Polygon points={`${n - 7},-10 ${n - 3},-3 ${n + 1},0 ${n - 3},4 ${n - 7},10 ${n - 11},4 ${n - 16},0 ${n - 11},-3`} fill="#e7e7ff" stroke={c} /><Circle cx={n - 7} cy={0} r={3} fill="#fff" /></G>}
    {kit.weapon === 'cannon' && <G><Rect x={0} y={-12} width={n} height={24} rx={5} fill="#36586d" /><Rect x={n - 9} y={-10} width={9} height={20} rx={3} fill={c} /><Path d={`M8 -6 H${n - 13} M8 0 H${n - 13} M8 6 H${n - 13}`} stroke={c} strokeWidth={2} /><Ellipse cx={n} cy={0} rx={3} ry={7} fill="#fff" /></G>}
    {kit.weapon === 'fan' && <G><Path d={`M7 0 L${n - 8} -23 Q${n + 9} 0 ${n - 8} 23 Z`} fill={c} /><Path d={`M7 0 L${n - 3} -14 M7 0 H${n} M7 0 L${n - 3} 14`} stroke="#ffe6fa" /></G>}
    {kit.weapon === 'tonfa' && <G><Rect x={11} y={-6} width={n - 11} height={12} rx={4} fill={c} /><Rect x={17} y={0} width={7} height={17} rx={2} fill="#df8a3f" /><Path d={`M16 -2 H${n - 4}`} stroke="#fff0c1" /></G>}
    {kit.weapon === 'baton' && <G><Rect x={10} y={-5} width={n - 10} height={10} rx={4} fill={c} /><Path d={`M15 -2 H${n - 4}`} stroke="#fff" /></G>}
  </G>;
}

function Head({ kit, pose, outfit }: { kit: FighterLoadout; pose: FighterPose; outfit?: string }) {
  const c = kit.accent;
  return <G transform={`translate(${pose.head.x} ${pose.head.y})`}>
    <Rect x={-20} y={-19} width={40} height={38} rx={7} fill={kit.skin} stroke="#101628" strokeWidth={3} />
    <Path d="M-16 -14 H14 M-17 -12 V8" stroke="#fff" strokeWidth={3} opacity={0.25} fill="none" />
    {kit.head === 'mask' && <G><Path d="M-20 -10 Q-23 -27 1 -24 Q24 -23 20 -6 L-20 -6 M-20 2 H20 V19 H-20Z" fill={kit.suit} stroke="#14182c" strokeWidth={2} /><Path d="M-21 -7 H20 M-20 7 H20" stroke={c} strokeWidth={3} /><Path d="M-20 -4 L-43 -11 L-33 2 L-46 8" stroke={c} strokeWidth={6} fill="none" /></G>}
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

/** Articulated vector skin; the exact same pose drives the combat capsules. */
export function FighterRig({ fighterId, outfit, action, actionElapsed, facing, airborne, reduceMotion, pixelsPerWorldUnit }: FighterRigProps) {
  const kit = fighterLoadout(fighterId);
  // Reduced motion only removes decorative idle motion and trails, never contact poses.
  const pose = sampleFighterPose(fighterId, action, reduceMotion && action === 'idle' ? 0 : actionElapsed);
  const scale = RIG_SCALE * pixelsPerWorldUnit;
  const active = isAttack(action) && actionElapsed * 60 >= attackSpec(fighterId, action).startup && actionElapsed * 60 < attackSpec(fighterId, action).startup + attackSpec(fighterId, action).active;
  const torso = `${pose.shoulder.x - 21},${pose.shoulder.y - 3} ${pose.shoulder.x + 22},${pose.shoulder.y - 3} ${pose.hip.x + 18},${pose.hip.y + 6} ${pose.hip.x - 18},${pose.hip.y + 6}`;
  return <Svg width={280 * scale} height={280 * scale} viewBox="-140 -260 280 280" pointerEvents="none" accessible={false}>
    <Ellipse cx={0} cy={1} rx={Math.max(18, 37 - airborne * 0.6)} ry={6} fill="#000" opacity={0.45} />
    <Ellipse cx={0} cy={1} rx={32} ry={4} fill={kit.accent} opacity={0.2} />
    <G transform={`translate(0 ${-airborne / RIG_SCALE}) scale(${facing} 1)`}>
      <G transform={`rotate(${pose.bodyRotation} ${pose.hip.x} ${pose.hip.y})`}>
        <Limb limb={pose.backLeg} kit={kit} leg rear />
        <Limb limb={pose.backArm} kit={kit} rear />
        <Limb limb={pose.frontLeg} kit={kit} leg />
        <Polygon points={torso} fill={kit.suit} stroke="#111829" strokeWidth={3} strokeLinejoin="round" />
        <Path d={`M${pose.shoulder.x - 16} ${pose.shoulder.y + 2} L${pose.hip.x - 14} ${pose.hip.y - 4}`} stroke="#fff" strokeWidth={4} opacity={0.2} />
        <Path d={`M${pose.shoulder.x + 14} ${pose.shoulder.y + 3} L${pose.hip.x + 10} ${pose.hip.y}`} stroke="#000" strokeWidth={8} opacity={0.17} />
        <Rect x={pose.hip.x - 18} y={pose.hip.y - 3} width={36} height={9} rx={2} fill="#1a2236" stroke={kit.accent} strokeWidth={1.5} />
        <Polygon points={`${pose.shoulder.x},${pose.shoulder.y + 10} ${pose.shoulder.x + 8},${pose.shoulder.y + 19} ${pose.shoulder.x},${pose.shoulder.y + 28} ${pose.shoulder.x - 8},${pose.shoulder.y + 19}`} fill={kit.accent} />
        <Head kit={kit} pose={pose} outfit={outfit} />
        <Limb limb={pose.frontArm} kit={kit} />
        {active && !reduceMotion && <Line x1={pose.frontArm.end.x} y1={pose.frontArm.end.y} x2={pose.weaponTip.x} y2={pose.weaponTip.y} stroke={kit.accent} strokeWidth={22} strokeLinecap="round" opacity={0.2} />}
        <G transform={`translate(${pose.frontArm.end.x} ${pose.frontArm.end.y}) rotate(${pose.weaponAngle})`}><Weapon kit={kit} /></G>
        {action === 'block' && <Path d="M39 -153 Q65 -108 39 -68" stroke={kit.accent} strokeWidth={4} opacity={0.7} fill="none" />}
      </G>
    </G>
  </Svg>;
}
