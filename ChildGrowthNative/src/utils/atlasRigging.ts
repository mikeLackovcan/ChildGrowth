import type { Point } from './fighterRigging';
import type { AtlasRegion, BoneAnchors } from '../constants/fighterAtlases';

export const DEFAULT_BONE_ANCHORS: BoneAnchors = [0.5, 0.16, 0.5, 0.84];

/** Plant the sole flat, then gradually release the ankle as the foot lifts.
 * A normalized shin direction avoids atan2's +/-180 degree branch cut during
 * tucked jumps. This is cosmetic only: ankle/foot contact anchors never move. */
export function texturedBootAngle(knee: Point, ankle: Point): number {
  const dx = ankle.x - knee.x, dy = ankle.y - knee.y;
  const length = Math.hypot(dx, dy);
  const forward = length > 1e-8 ? dx / length : 0;
  const lifted = Math.max(0, Math.min(1, (-ankle.y - 2) / 22));
  const release = lifted * lifted * (3 - 2 * lifted);
  return Math.max(-55, Math.min(25, 10 - 65 * forward)) * release;
}
/** Affine skin attachment: map the two authored joint centers in a photographed
 * limb to the two solved rig joints. Corrects slanted source art without moving
 * the skeleton. Longitudinal length and perpendicular thickness are independent.
 * SVG matrix order is [a, b, c, d, e, f]. */
export function textureBoneMatrix(region: AtlasRegion, anchors: BoneAnchors, root: Point, end: Point, thickness: number) {
  const [, , width, height] = region;
  const px = anchors[0] * width, py = anchors[1] * height;
  const dx = (anchors[2] - anchors[0]) * width, dy = (anchors[3] - anchors[1]) * height;
  const sourceLength = Math.max(1e-8, Math.hypot(dx, dy));
  const ux = dx / sourceLength, uy = dy / sourceLength;
  const tx = end.x - root.x, ty = end.y - root.y;
  const targetLength = Math.hypot(tx, ty);
  const vx = targetLength > 1e-8 ? tx / targetLength : 0;
  const vy = targetLength > 1e-8 ? ty / targetLength : 1;
  const along = targetLength / sourceLength, across = thickness / width;
  const a = along * vx * ux + across * vy * uy;
  const b = along * vy * ux - across * vx * uy;
  const c = along * vx * uy - across * vy * ux;
  const d = along * vy * uy + across * vx * ux;
  return [a, b, c, d, root.x - a * px - c * py, root.y - b * px - d * py] as const;
}
