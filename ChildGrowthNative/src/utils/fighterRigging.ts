import type { AttackAction, FighterAction } from './fightingGame';

export type Point = { x: number; y: number };
export type Capsule = { a: Point; b: Point; radius: number };
export type WeaponKind = 'gauntlet' | 'tonfa' | 'baton' | 'hammer' | 'fan' | 'katana' | 'spear' | 'staff' | 'cannon' | 'wand' | 'axe' | 'mace';
export interface FighterLoadout {
  weapon: WeaponKind; length: number; radius: number; skin: string; suit: string;
  legs: string; accent: string; head: 'plain' | 'hair' | 'cap' | 'helmet' | 'bird' | 'mask' | 'crown' | 'hat' | 'robot' | 'horn' | 'dragon';
  windup: number; recovery: number;
}
// One shared world-to-art conversion for rendering AND collision, at every size.
export const RIG_SCALE = 0.22;
export const FIGHT_HZ = 60;
export const FIGHT_DT = 1 / FIGHT_HZ;
export const FIGHTER_LOADOUTS: Record<string, FighterLoadout> = {
  roblox_noob: { weapon: 'gauntlet', length: 19, radius: 10, skin: '#ffce38', suit: '#2584ec', legs: '#68aa35', accent: '#ffce38', head: 'plain', windup: 0, recovery: 0 },
  roblox_bacon_hair: { weapon: 'tonfa', length: 38, radius: 6, skin: '#f5bf88', suit: '#272d3d', legs: '#222b44', accent: '#fb633f', head: 'hair', windup: 1, recovery: 1 },
  roblox_guest: { weapon: 'baton', length: 43, radius: 5, skin: '#efd1ae', suit: '#19233d', legs: '#274975', accent: '#57a8ff', head: 'cap', windup: -2, recovery: -2 },
  roblox_builderman: { weapon: 'hammer', length: 47, radius: 12, skin: '#ffcb48', suit: '#ed8a26', legs: '#27446b', accent: '#ffb73e', head: 'helmet', windup: 6, recovery: 8 },
  roblox_flamingo: { weapon: 'fan', length: 36, radius: 13, skin: '#ff9bbc', suit: '#d83e86', legs: '#794586', accent: '#ff8dd3', head: 'bird', windup: 1, recovery: 2 },
  roblox_ninja: { weapon: 'katana', length: 59, radius: 3, skin: '#d2a87c', suit: '#252440', legs: '#171d31', accent: '#b498ff', head: 'mask', windup: -3, recovery: -3 },
  roblox_dominus: { weapon: 'spear', length: 64, radius: 4, skin: '#172e30', suit: '#21423c', legs: '#233733', accent: '#69e6b6', head: 'crown', windup: 4, recovery: 5 },
  roblox_wizard: { weapon: 'staff', length: 59, radius: 8, skin: '#b9abf0', suit: '#493977', legs: '#322858', accent: '#bc9dff', head: 'hat', windup: 4, recovery: 3 },
  roblox_cyber: { weapon: 'cannon', length: 38, radius: 10, skin: '#90adc5', suit: '#284459', legs: '#203146', accent: '#64e6ff', head: 'robot', windup: 5, recovery: 5 },
  roblox_unicorn: { weapon: 'wand', length: 45, radius: 9, skin: '#f7e4ff', suit: '#d08be1', legs: '#785eb7', accent: '#ff9fdf', head: 'horn', windup: -1, recovery: 0 },
  roblox_dragon: { weapon: 'axe', length: 49, radius: 12, skin: '#86d3ee', suit: '#247dae', legs: '#225d8c', accent: '#a0f0ff', head: 'dragon', windup: 5, recovery: 6 },
  roblox_bloxy: { weapon: 'mace', length: 46, radius: 12, skin: '#ffe293', suit: '#bd8626', legs: '#885f22', accent: '#ffdf79', head: 'crown', windup: 3, recovery: 5 },
};
export const fighterLoadout = (id: string) => FIGHTER_LOADOUTS[id] || FIGHTER_LOADOUTS.roblox_noob;
export const isAttack = (a: FighterAction): a is AttackAction => a === 'jab' || a === 'kick' || a === 'special';
export function attackSpec(id: string, action: AttackAction) {
  const kit = fighterLoadout(id);
  const base = action === 'jab' ? { startup: 6, active: 4, recovery: 12, damage: 7, knockback: 2.5, energy: 12 }
    : action === 'kick' ? { startup: 13, active: 5, recovery: 17, damage: 11, knockback: 4, energy: 18 }
      : { startup: 20 + kit.windup, active: 8, recovery: 22 + kit.recovery, damage: 20, knockback: 6, energy: 0 };
  return { ...base, total: base.startup + base.active + base.recovery };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const point = (x: number, y: number): Point => ({ x, y });
const blend = (a: Point, b: Point, t: number): Point => point(mix(a.x, b.x, t), mix(a.y, b.y, t));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Two-bone IK: solve the elbow/knee with the law of cosines, clamping the
// reachable annulus first. Even coincident/unreachable targets cannot stretch.
export function solveLimb(root: Point, target: Point, upper: number, lower: number, bend: -1 | 1) {
  const raw = distance(root, target);
  const d = clamp(raw, Math.abs(upper - lower) + 0.0001, upper + lower - 0.0001);
  const heading = raw < 0.0001 ? Math.PI / 2 : Math.atan2(target.y - root.y, target.x - root.x);
  const angle = heading + bend * Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  return { root, joint: point(root.x + Math.cos(angle) * upper, root.y + Math.sin(angle) * upper), end: point(root.x + Math.cos(heading) * d, root.y + Math.sin(heading) * d) };
}
export function sampleFighterPose(id: string, action: FighterAction, seconds: number) {
  const frame = Math.max(0, seconds * FIGHT_HZ);
  let hip = point(0, -68), shoulder = point(3, -114);
  let hand = point(34, -112), rearHand = point(0, -123);
  let foot = point(25, -5), rearFoot = point(-24, -5);
  let weaponAngle = -65, bodyRotation = 0;
  const breathe = Math.sin(seconds * 4) * 1.4;
  hip.y += breathe; shoulder.y += breathe; hand.y += breathe; rearHand.y += breathe;
  if (action === 'walk') {
    const gait = Math.sin(seconds * 10);
    foot = point(gait * 26, -5 - Math.max(0, Math.cos(seconds * 10)) * 12);
    rearFoot = point(-gait * 26, -5 - Math.max(0, -Math.cos(seconds * 10)) * 12);
    hip.y -= Math.abs(gait) * 3; shoulder.x += 5; hand.x -= gait * 5; rearHand.x += gait * 5;
  } else if (action === 'jump') {
    foot = point(27, -30); rearFoot = point(-22, -20); hand = point(33, -135); rearHand = point(-15, -134);
  } else if (action === 'block') {
    hip.y += 6; shoulder = point(-4, -106); hand = point(26, -136); rearHand = point(18, -112); weaponAngle = -90;
  } else if (isAttack(action)) {
    const spec = attackSpec(id, action);
    const wind = smooth(frame / Math.max(1, spec.startup - 3));
    const strike = smooth((frame - spec.startup + 3) / 3);
    const recover = smooth((frame - spec.startup - spec.active) / spec.recovery);
    const power = strike * (1 - recover);
    const anticipation = wind * (1 - strike);
    hip.x += power * 5 - anticipation * 3;
    shoulder.x += power * (action === 'kick' ? -9 : 12) - anticipation * 8;
    if (action === 'jab') {
      hand = blend(blend(hand, point(15, -104), anticipation), point(70, -113), power);
      weaponAngle = mix(-65, -25, power);
    } else if (action === 'kick') {
      foot = blend(blend(foot, point(15, -46), anticipation), point(71, -80), power);
      hand = blend(hand, point(15, -128), power); rearHand = blend(rearHand, point(-32, -102), power);
    } else {
      hand = blend(blend(hand, point(-16, -150), anticipation), point(61, -107), power);
      const sweep = clamp((frame - spec.startup) / spec.active, 0, 1);
      weaponAngle = mix(mix(-65, -150, anticipation), mix(-22, 25, sweep), power);
      rearHand = blend(rearHand, point(20, -104), power);
    }
  } else if (action === 'hit') {
    const recoil = Math.sin(Math.PI * clamp(seconds / 0.34, 0, 1));
    shoulder.x -= recoil * 18; hip.x -= recoil * 5; hand.x -= recoil * 20;
  } else if (action === 'ko') {
    const fall = smooth(seconds / 0.6);
    bodyRotation = -84 * fall; hip.y += fall * 50;
    shoulder = point(hip.x + 3, hip.y - 46);
    hand = point(shoulder.x + 30, shoulder.y + 14); rearHand = point(shoulder.x - 28, shoulder.y + 6);
    foot = point(hip.x + 26, hip.y + 56); rearFoot = point(hip.x - 24, hip.y + 56);
  }
  const frontArm = solveLimb(point(shoulder.x + 9, shoulder.y + 3), hand, 29, 29, 1);
  const backArm = solveLimb(point(shoulder.x - 11, shoulder.y + 2), rearHand, 29, 29, -1);
  const frontLeg = solveLimb(point(hip.x + 8, hip.y), foot, 36, 39, -1);
  const backLeg = solveLimb(point(hip.x - 8, hip.y), rearFoot, 36, 39, -1);
  const head = point(shoulder.x + 3, shoulder.y - 27);
  const angle = weaponAngle * Math.PI / 180;
  const kit = fighterLoadout(id);
  const weaponTip = point(frontArm.end.x + Math.cos(angle) * kit.length, frontArm.end.y + Math.sin(angle) * kit.length);
  return { hip, shoulder, head, frontArm, backArm, frontLeg, backLeg, weaponAngle, weaponTip, bodyRotation };
}
export type FighterPose = ReturnType<typeof sampleFighterPose>;
export type PoseFighter = { id: string; action: FighterAction; actionElapsed: number; x: number; y: number; facing: -1 | 1 };
export function worldPoint(p: Point, fighter: PoseFighter): Point {
  return point(fighter.x + p.x * RIG_SCALE * fighter.facing, p.y * RIG_SCALE - fighter.y);
}
export function attackCapsule(f: PoseFighter): Capsule | null {
  if (!isAttack(f.action)) return null;
  const pose = sampleFighterPose(f.id, f.action, f.actionElapsed);
  const kit = fighterLoadout(f.id);
  const a = f.action === 'kick' ? pose.frontLeg.joint : f.action === 'special' ? pose.frontArm.end : pose.frontArm.joint;
  const b = f.action === 'kick' ? pose.frontLeg.end : f.action === 'special' ? pose.weaponTip : pose.frontArm.end;
  return { a: worldPoint(a, f), b: worldPoint(b, f), radius: (f.action === 'special' ? kit.radius : 9) * RIG_SCALE };
}
export function hurtCapsules(f: PoseFighter): Capsule[] {
  const p = sampleFighterPose(f.id, f.action, f.actionElapsed);
  return [
    { a: p.head, b: p.head, radius: 18 }, { a: p.shoulder, b: p.hip, radius: 17 },
    { a: p.frontLeg.root, b: p.frontLeg.joint, radius: 9 }, { a: p.frontLeg.joint, b: p.frontLeg.end, radius: 9 },
    { a: p.backLeg.root, b: p.backLeg.joint, radius: 9 }, { a: p.backLeg.joint, b: p.backLeg.end, radius: 9 },
  ].map(c => ({ a: worldPoint(c.a, f), b: worldPoint(c.b, f), radius: c.radius * RIG_SCALE }));
}
function pointSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return distance(p, point(a.x + t * dx, a.y + t * dy));
}
export function capsulesOverlap(a: Capsule, b: Capsule) {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const c1 = cross(a.a, a.b, b.a), c2 = cross(a.a, a.b, b.b), c3 = cross(b.a, b.b, a.a), c4 = cross(b.a, b.b, a.b);
  const intersects = c1 * c2 < 0 && c3 * c4 < 0;
  return intersects || Math.min(pointSegment(a.a, b.a, b.b), pointSegment(a.b, b.a, b.b), pointSegment(b.a, a.a, a.b), pointSegment(b.b, a.a, a.b)) <= a.radius + b.radius;
}
