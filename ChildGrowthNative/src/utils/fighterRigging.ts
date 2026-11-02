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
export interface BodyProfile {
  height: number; width: number; arm: number; stance: number; weight: number; rhythm: number; lean: number;
}
// Authored silhouettes and movement personalities, independent of combat damage.
export const BODY_PROFILES: Record<string, BodyProfile> = {
  roblox_noob: { height: 1, width: 1, arm: 1, stance: 24, weight: 0.45, rhythm: 3.6, lean: 3 },
  roblox_bacon_hair: { height: 1.02, width: 0.97, arm: 1.02, stance: 25, weight: 0.4, rhythm: 4, lean: 5 },
  roblox_guest: { height: 0.99, width: 0.91, arm: 0.99, stance: 23, weight: 0.3, rhythm: 3.7, lean: 2 },
  roblox_builderman: { height: 1.05, width: 1.2, arm: 1.08, stance: 29, weight: 0.95, rhythm: 2.4, lean: 4 },
  roblox_flamingo: { height: 1.07, width: 0.9, arm: 1.04, stance: 22, weight: 0.3, rhythm: 3.3, lean: 0 },
  roblox_ninja: { height: 0.98, width: 0.87, arm: 1.01, stance: 27, weight: 0.22, rhythm: 4.4, lean: 7 },
  roblox_dominus: { height: 1.1, width: 1.14, arm: 1.1, stance: 27, weight: 0.8, rhythm: 2.7, lean: 1 },
  roblox_wizard: { height: 1.04, width: 0.92, arm: 1.04, stance: 22, weight: 0.38, rhythm: 2.5, lean: -1 },
  roblox_cyber: { height: 1.08, width: 1.22, arm: 1.12, stance: 28, weight: 1, rhythm: 2.2, lean: 2 },
  roblox_unicorn: { height: 0.97, width: 0.95, arm: 0.99, stance: 23, weight: 0.25, rhythm: 3.1, lean: 1 },
  roblox_dragon: { height: 1.12, width: 1.16, arm: 1.13, stance: 30, weight: 0.85, rhythm: 2.8, lean: 9 },
  roblox_bloxy: { height: 1.06, width: 1.13, arm: 1.08, stance: 27, weight: 0.75, rhythm: 3, lean: 4 },
};
export const fighterBody = (id: string) => BODY_PROFILES[id] || BODY_PROFILES.roblox_noob;
export interface PoseTargets {
  hip: Point; shoulder: Point; hand: Point; rearHand: Point; foot: Point; rearFoot: Point;
  weaponAngle: number; bodyRotation: number;
}
export interface PoseContext {
  feet?: [Point, Point]; velocityY?: number; stridePhase?: number; moveDirection?: number;
  previous?: PoseTargets; transition?: number;
}
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
const arc = (a: Point, control: Point, b: Point, t: number): Point => blend(blend(a, control, t), blend(control, b, t), t);
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
// Closest reachable point shared by both hands. Equal-length arm chains form
// two intersecting disks after translating the rear shoulder by the grip offset.
function sharedReach(target: Point, first: Point, second: Point, radius: number): Point {
  if (distance(target, first) <= radius && distance(target, second) <= radius) return target;
  for (const [center, other] of [[first, second], [second, first]]) {
    const d = distance(center, target);
    const candidate = blend(center, target, Math.min(1, radius / Math.max(d, 0.0001)));
    if (distance(candidate, other) <= radius) return candidate;
  }
  const d = distance(first, second), middle = blend(first, second, 0.5);
  const h = Math.sqrt(Math.max(0, radius * radius - d * d / 4));
  const perpendicular = point(-(second.y - first.y) / Math.max(d, 0.0001), (second.x - first.x) / Math.max(d, 0.0001));
  const candidates = [-1, 1].map(sign => point(middle.x + perpendicular.x * h * sign, middle.y + perpendicular.y * h * sign));
  return distance(target, candidates[0]) < distance(target, candidates[1]) ? candidates[0] : candidates[1];
}
export function sampleFighterPose(id: string, action: FighterAction, seconds: number, context: PoseContext = {}) {
  const body = fighterBody(id);
  const frame = Math.max(0, seconds * FIGHT_HZ);
  let hip = point(0, -68), shoulder = point(body.lean, -114);
  let hand = point(34, -112), rearHand = point(0, -123);
  let foot = point(body.stance, -5), rearFoot = point(-body.stance, -5);
  let weaponAngle = -65, bodyRotation = 0;
  const breathe = Math.sin(seconds * body.rhythm) * (1.5 - body.weight * 0.7);
  hip.y += breathe; shoulder.y += breathe; hand.y += breathe; rearHand.y += breathe;
  if (action === 'walk') {
    const phase = context.stridePhase ?? seconds * 2;
    const gait = Math.sin(phase * Math.PI * 2);
    foot = point(body.stance - gait * 15, -5 - Math.max(0, Math.cos(phase * Math.PI * 2)) * 12);
    rearFoot = point(-body.stance + gait * 15, -5 - Math.max(0, -Math.cos(phase * Math.PI * 2)) * 12);
    hip.y += Math.sin(phase * Math.PI) * (2 + body.weight * 2);
    shoulder.x += (context.moveDirection ?? 1) * 4;
    hand.x -= gait * 3; rearHand.x += gait * 4;
  } else if (action === 'takeoff' || action === 'land') {
    const compression = action === 'takeoff' ? Math.sin(Math.min(1, seconds / 0.1) * Math.PI * 0.65) : Math.sin(Math.min(1, seconds / 0.18) * Math.PI);
    hip.y += compression * (10 + body.weight * 5); shoulder.y += compression * 12;
    shoulder.x += compression * 5; hand = point(26, -103 + compression * 8); rearHand = point(-12, -110 + compression * 10);
  } else if (action === 'jump') {
    const rise = clamp((context.velocityY ?? (48 - seconds * 105)) / 48, -1, 1);
    const tuck = 1 - Math.abs(rise);
    foot = point(25 + tuck * 9, -12 - tuck * 30);
    rearFoot = point(-22 + tuck * 8, -10 - tuck * 23);
    hand = point(31, -119 - Math.max(0, rise) * 17);
    rearHand = point(-20, -114 - Math.max(0, rise) * 18);
    shoulder.x += rise * 3;
  } else if (action === 'block') {
    hip.y += 6; shoulder = point(-4, -106); hand = point(26, -136); rearHand = point(18, -112); weaponAngle = -90;
  } else if (isAttack(action)) {
    const spec = attackSpec(id, action);
    const wind = smooth(frame / Math.max(1, spec.startup - 3));
    const strike = smooth((frame - spec.startup + 3) / 3);
    const recover = smooth((frame - spec.startup - spec.active) / spec.recovery);
    const power = strike * (1 - recover);
    const anticipation = wind * (1 - strike);
    const hipDrive = smooth((frame - spec.startup + 5) / 4) * (1 - recover);
    hip.x += hipDrive * 7 - anticipation * (3 + body.weight * 2);
    shoulder.x += power * (action === 'kick' ? -9 : 12) - anticipation * 8;
    if (action === 'jab') {
      hand = arc(blend(hand, point(15, -104), anticipation), point(39, -126), point(70, -113), power);
      weaponAngle = mix(-65, -25, power);
    } else if (action === 'kick') {
      foot = arc(blend(foot, point(15, -46), anticipation), point(34, -108), point(71, -80), power);
      hip.x -= power * 8; hip.y -= power * 3;
      hand = blend(hand, point(15, -128), power); rearHand = blend(rearHand, point(-32, -102), power);
    } else {
      const weapon = fighterLoadout(id).weapon;
      const sweep = clamp((frame - spec.startup) / spec.active, 0, 1);
      const thrust = weapon === 'spear' || weapon === 'cannon' || weapon === 'gauntlet';
      const heavy = weapon === 'hammer' || weapon === 'axe' || weapon === 'mace';
      const cast = weapon === 'staff' || weapon === 'wand';
      const windupHand = thrust ? point(9, -111) : heavy ? point(6, -155) : point(-16, -150);
      const contactHand = point(61 - (weapon === 'cannon' ? sweep * 6 : 0), heavy ? -112 + sweep * 12 : -107);
      hand = arc(blend(hand, windupHand, anticipation), thrust ? point(32, -112) : point(32, -163), contactHand, power);
      const contactAngle = thrust ? 0 : heavy ? mix(-42, 42, sweep) : cast ? -8 : mix(-22, 25, sweep);
      weaponAngle = mix(mix(-65, thrust ? -8 : -150, anticipation), contactAngle, power);
      rearHand = blend(rearHand, point(20, -104), power);
    }
  } else if (action === 'hit') {
    const recoil = Math.sin(Math.PI * clamp(seconds / 0.34, 0, 1));
    shoulder.x -= recoil * 18; hip.x -= recoil * 5; hand.x -= recoil * 20;
  } else if (action === 'victory') {
    const lift = smooth(seconds / 0.55);
    hand = blend(hand, point(21, -164), lift);
    rearHand = blend(rearHand, point(-23, -78), lift);
    shoulder.y -= lift * 3; weaponAngle = mix(-65, -100, lift);
  } else if (action === 'ko') {
    const fall = smooth(seconds / 0.6);
    bodyRotation = -84 * fall; hip.y += fall * 50; hip.x += fall * 40;
    shoulder = point(hip.x + 3, hip.y - 46);
    hand = point(shoulder.x + 30, shoulder.y + 14); rearHand = point(shoulder.x - 28, shoulder.y + 6);
    foot = point(hip.x + 26, hip.y + 56); rearFoot = point(hip.x - 24, hip.y + 56);
  }
  // Targets are blended BEFORE IK, never solved joint positions: limb lengths
  // remain invariant and the same evaluated geometry drives rendering/contact.
  const scale = (p: Point) => point(p.x * body.height, p.y * body.height);
  hip = scale(hip); shoulder = scale(shoulder); hand = scale(hand); rearHand = scale(rearHand);
  foot = scale(foot); rearFoot = scale(rearFoot);
  const attackPower = isAttack(action) ? smooth((frame - attackSpec(id, action).startup + 3) / 3) * (1 - smooth((frame - attackSpec(id, action).startup - attackSpec(id, action).active) / attackSpec(id, action).recovery)) : 0;
  if (context.feet && action !== 'jump' && action !== 'ko') {
    foot = action === 'kick' ? blend(context.feet[0], foot, Math.max(attackPower, smooth(frame / 5) * (1 - smooth((frame - 20) / 15)))) : context.feet[0];
    rearFoot = context.feet[1];
  }
  let targets: PoseTargets = { hip, shoulder, hand, rearHand, foot, rearFoot, weaponAngle, bodyRotation };
  if (context.previous && (context.transition ?? 1) < 1) {
    const t = smooth(context.transition ?? 1), previous = context.previous;
    targets = {
      hip: blend(previous.hip, hip, t), shoulder: blend(previous.shoulder, shoulder, t),
      hand: blend(previous.hand, hand, t), rearHand: blend(previous.rearHand, rearHand, t),
      foot: context.feet && action !== 'jump' && action !== 'kick' && action !== 'ko' ? foot : blend(previous.foot, foot, t),
      rearFoot: context.feet && action !== 'jump' && action !== 'ko' ? rearFoot : blend(previous.rearFoot, rearFoot, t),
      weaponAngle: mix(previous.weaponAngle, weaponAngle, t), bodyRotation: mix(previous.bodyRotation, bodyRotation, t),
    };
  }
  ({ hip, shoulder, hand, rearHand, foot, rearFoot, weaponAngle, bodyRotation } = targets);
  if (context.feet && action !== 'jump' && action !== 'ko') {
    // Lower the pelvis instead of stretching/sliding a support leg when the
    // root travels between planted feet. Keep a small bend at full extension.
    const supports = action === 'kick' ? [[rearFoot, -8 * body.width] as const] : [[foot, 8 * body.width] as const, [rearFoot, -8 * body.width] as const];
    const reach = 73 * body.height;
    const lowX = Math.max(...supports.map(([p, offset]) => p.x - offset - reach));
    const highX = Math.min(...supports.map(([p, offset]) => p.x - offset + reach));
    const supportedX = lowX <= highX ? clamp(hip.x, lowX, highX) : hip.x;
    const supportedY = Math.max(hip.y, ...supports.map(([p, offset]) => p.y - Math.sqrt(Math.max(0, reach * reach - (p.x - supportedX - offset) ** 2))));
    shoulder = point(shoulder.x + supportedX - hip.x, shoulder.y + supportedY - hip.y);
    hip = point(supportedX, supportedY);
  }
  const kit = fighterLoadout(id);
  const twoHanded = ['hammer', 'axe', 'spear', 'staff', 'mace', 'katana'].includes(kit.weapon);
  const gripMix = action === 'special' && twoHanded ? smooth(seconds / 0.07) * (1 - smooth((frame - attackSpec(id, 'special').total + 6) / 6)) : 0;
  const angle = weaponAngle * Math.PI / 180;
  const frontRoot = point(shoulder.x + 9 * body.width, shoulder.y + 3);
  const backRoot = point(shoulder.x - 11 * body.width, shoulder.y + 2);
  if (gripMix > 0) hand = blend(hand, sharedReach(hand, frontRoot, point(backRoot.x + Math.cos(angle) * 12, backRoot.y + Math.sin(angle) * 12), 58 * body.arm - 0.001), gripMix);
  const frontArm = solveLimb(frontRoot, hand, 29 * body.arm, 29 * body.arm, 1);
  const grip = point(frontArm.end.x - Math.cos(angle) * 12, frontArm.end.y - Math.sin(angle) * 12);
  rearHand = blend(rearHand, grip, gripMix);
  const backArm = solveLimb(backRoot, rearHand, 29 * body.arm, 29 * body.arm, 1);
  const frontLeg = solveLimb(point(hip.x + 8 * body.width, hip.y), foot, 36 * body.height, 39 * body.height, -1);
  const backLeg = solveLimb(point(hip.x - 8 * body.width, hip.y), rearFoot, 36 * body.height, 39 * body.height, -1);
  const head = point(shoulder.x + 3, shoulder.y - 27 * body.height);
  const weaponTip = point(frontArm.end.x + Math.cos(angle) * kit.length, frontArm.end.y + Math.sin(angle) * kit.length);
  const followThrough = Math.sin(seconds * 8 - 0.6) * Math.exp(-seconds * 2) * (isAttack(action) || action === 'hit' ? 12 : 2);
  targets = { ...targets, hip, shoulder, hand: frontArm.end, rearHand: backArm.end };
  return { hip, shoulder, head, frontArm, backArm, frontLeg, backLeg, weaponAngle, weaponTip, bodyRotation, targets, body,
    headTilt: clamp(-(shoulder.x - hip.x) * 0.24, -10, 10), followThrough, grip, gripMix };
}
export type FighterPose = ReturnType<typeof sampleFighterPose>;
export type PoseFighter = { id: string; action: FighterAction; actionElapsed: number; x: number; y: number; facing: -1 | 1; velocityY?: number; poseContext?: PoseContext };
export const fighterPose = (f: PoseFighter) => sampleFighterPose(f.id, f.action, f.actionElapsed, { ...f.poseContext, velocityY: f.velocityY });
export function worldPoint(p: Point, fighter: PoseFighter): Point {
  return point(fighter.x + p.x * RIG_SCALE * fighter.facing, p.y * RIG_SCALE - fighter.y);
}
export function attackCapsule(f: PoseFighter): Capsule | null {
  if (!isAttack(f.action)) return null;
  const pose = fighterPose(f);
  const kit = fighterLoadout(f.id);
  const a = f.action === 'kick' ? pose.frontLeg.joint : f.action === 'special' ? pose.frontArm.end : pose.frontArm.joint;
  const b = f.action === 'kick' ? pose.frontLeg.end : f.action === 'special' ? pose.weaponTip : pose.frontArm.end;
  return { a: worldPoint(a, f), b: worldPoint(b, f), radius: (f.action === 'special' ? kit.radius : 9) * RIG_SCALE };
}
export function hurtCapsules(f: PoseFighter): Capsule[] {
  const p = fighterPose(f);
  return [
    { a: p.head, b: p.head, radius: 18 * p.body.height }, { a: p.shoulder, b: p.hip, radius: 17 * p.body.width },
    { a: p.frontLeg.root, b: p.frontLeg.joint, radius: 9 * p.body.width }, { a: p.frontLeg.joint, b: p.frontLeg.end, radius: 9 * p.body.width },
    { a: p.backLeg.root, b: p.backLeg.joint, radius: 9 * p.body.width }, { a: p.backLeg.joint, b: p.backLeg.end, radius: 9 * p.body.width },
  ].map(c => ({ a: worldPoint(c.a, f), b: worldPoint(c.b, f), radius: c.radius * RIG_SCALE }));
}
function projectOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return point(a.x + t * dx, a.y + t * dy);
}
/** A contact inside BOTH overlapping capsules, not an arbitrary weapon tip.
 * Symmetric under swapping the capsules; handles point/parallel segments too. */
export function capsuleContact(a: Capsule, b: Capsule): Point | null {
  const dx = a.b.x - a.a.x, dy = a.b.y - a.a.y;
  const ex = b.b.x - b.a.x, ey = b.b.y - b.a.y;
  const denominator = dx * ey - dy * ex;
  if (Math.abs(denominator) > 1e-10) {
    const qx = b.a.x - a.a.x, qy = b.a.y - a.a.y;
    const t = (qx * ey - qy * ex) / denominator;
    const u = (qx * dy - qy * dx) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return point(a.a.x + t * dx, a.a.y + t * dy);
  }
  const pairs: [Point, Point][] = [
    [a.a, projectOnSegment(a.a, b.a, b.b)], [a.b, projectOnSegment(a.b, b.a, b.b)],
    [projectOnSegment(b.a, a.a, a.b), b.a], [projectOnSegment(b.b, a.a, a.b), b.b],
  ];
  const distances = pairs.map(([p, q]) => distance(p, q));
  const nearest = Math.min(...distances);
  if (nearest > a.radius + b.radius) return null;
  // Average equivalent solutions on parallel overlapping segments to avoid
  // endpoint-order-dependent spark locations.
  const contacts = pairs.filter((_, i) => Math.abs(distances[i] - nearest) < 1e-8)
    .map(([p, q]) => blend(p, q, a.radius + b.radius > 0 ? a.radius / (a.radius + b.radius) : 0.5));
  return point(contacts.reduce((n, p) => n + p.x, 0) / contacts.length, contacts.reduce((n, p) => n + p.y, 0) / contacts.length);
}
export const capsulesOverlap = (a: Capsule, b: Capsule) => capsuleContact(a, b) !== null;
