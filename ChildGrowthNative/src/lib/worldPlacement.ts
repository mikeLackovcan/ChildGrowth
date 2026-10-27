import { WORLD_PLOTS, type WorldPlacement } from './worldEconomy';

/** A drop outside the visible map must never buy a nearby building. */
export function worldDropTarget(x: number, y: number, placements: WorldPlacement[]) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 400 || y > 560) return null;
  const nearest = WORLD_PLOTS.filter(plot => !placements.some(item => item.plotId === plot.id))
    .map(plot => ({ id: plot.id, distance: Math.hypot(plot.x - x, plot.y - y) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance <= 64 ? nearest.id : null;
}
