import { attackSpec, fighterPose, FighterPose, FIGHT_HZ, isAttack, Point, PoseFighter, RIG_SCALE } from './fighterRigging';

/** Presentation-only geometry. Never feeds back into collisions or frame data. */
export function fighterGrounding(fighter: PoseFighter, pose: FighterPose = fighterPose(fighter)) {
  const lift = Math.max(0, fighter.y / RIG_SCALE);
  const angle = pose.bodyRotation * Math.PI / 180;
  const feet = [pose.frontLeg.end, pose.backLeg.end].map(foot => {
    const x = foot.x - pose.hip.x, y = foot.y - pose.hip.y;
    const projected = { x: pose.hip.x + x * Math.cos(angle) - y * Math.sin(angle), y: pose.hip.y + x * Math.sin(angle) + y * Math.cos(angle) };
    const height = Math.max(0, lift - projected.y - 5 * pose.body.height);
    return { x: projected.x * fighter.facing, radius: 11 * pose.body.width + Math.min(12, height * 0.18), opacity: 0.65 * Math.exp(-height / 15) };
  });
  return { feet, radius: 36 * pose.body.width + Math.min(18, lift * 0.2), opacity: 0.33 * Math.exp(-lift / 95) };
}

export interface SwingRibbon { points: Point[]; opacity: number }

/** A short shutter exposure of the solved attack, not a generic slash decal.
 * Samples only active frames; capped geometry keeps this cheap on Android.
 * Call only when motion effects are enabled. */
export function fighterSwingTrail(fighter: PoseFighter): SwingRibbon[] {
  if (!isAttack(fighter.action)) return [];
  const spec = attackSpec(fighter.id, fighter.action);
  const frame = fighter.actionElapsed * FIGHT_HZ;
  if (frame < spec.startup || frame >= spec.startup + spec.active) return [];
  const samples: { inner: Point; outer: Point }[] = [];
  for (let i = 4; i >= 0; i--) {
    const time = fighter.actionElapsed - i / 120;
    if (time * FIGHT_HZ < spec.startup) continue;
    const pose = fighterPose({ ...fighter, actionElapsed: time });
    const outer = fighter.action === 'kick' ? pose.frontLeg.end : pose.weaponTip;
    const root = fighter.action === 'kick' ? pose.frontLeg.joint : pose.frontArm.end;
    samples.push({ outer, inner: { x: root.x + (outer.x - root.x) * 0.45, y: root.y + (outer.y - root.y) * 0.45 } });
  }
  return samples.slice(1).map((sample, i) => ({ points: [samples[i].inner, samples[i].outer, sample.outer, sample.inner], opacity: 0.08 + (i + 1) / samples.length * 0.25 }));
}
