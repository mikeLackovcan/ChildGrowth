// Only app-owned progress fields participate; server timestamps and ownership metadata do not.
const fields = [
  'tasks', 'prizes', 'won_prizes', 'coins', 'total_earned', 'daily_earnings', 'activity_history',
  'reward_goal', 'xp', 'level', 'current_avatar', 'unlocked_avatars', 'active_theme',
  'unlocked_themes', 'active_background', 'unlocked_backgrounds', 'last_spin_date',
  'last_active_date', 'epicBossTask', 'epicBossXP', 'world',
];
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]),
  );
  return value;
}
function signature(data: Record<string, any>): string {
  return JSON.stringify(canonical(Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]))));
}

/** Conservative three-way reconciliation: never add balances or silently choose between divergent histories. */
export function reconnectProgress(
  baseline: Record<string, any>, cloud: Record<string, any>, local: Record<string, any>,
): Record<string, any> {
  const before = signature(baseline), remote = signature(cloud), current = signature(local);
  if (remote === current || current === before) return cloud;
  if (remote === before) return { ...cloud, ...local };
  throw new Error('pair_progress_conflict');
}
