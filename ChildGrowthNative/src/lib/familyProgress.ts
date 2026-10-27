/** Preserve guest progress exactly; never silently choose between two played profiles. */
export function hasPlayedProgress(data: Record<string, any>): boolean {
  return [data.total_earned, data.coins, data.xp].some(value => Number(value) > 0)
    || Number(data.level || 1) > 1
    || (data.won_prizes?.length || 0) > 0
    || Boolean(data.last_spin_date)
    || (data.activity_history?.length || 0) > 0
    || (data.tasks || []).some((task: any) => task.done || task.pendingApproval || task.activeFocusStartedAt)
    || (data.unlocked_avatars || []).some((id: string) => !['default', 'quest_champ', 'quest_sprout', data.starter_avatar].includes(id))
    || (data.unlocked_backgrounds?.length || 0) > 1
    || (data.unlocked_themes?.length || 0) > 1
    || Number(data.world?.spentPower) > 0
    || (data.world?.placements?.length || 0) > 1;
}

export function importGuestProgress(cloud: Record<string, any>, guest: Record<string, any>, importId: string): Record<string, any> {
  const imported = Array.isArray(cloud.guest_imports) ? cloud.guest_imports : [];
  if (imported.includes(importId)) return cloud;
  const hasGuest = hasPlayedProgress(guest) || (guest.tasks?.length || 0) > 0;
  if (!hasGuest) return cloud;
  if (hasPlayedProgress(cloud) && hasPlayedProgress(guest)) throw new Error('pair_progress_conflict');
  // A parent may have prepared tasks before the first connection. Keep both sets.
  const tasks = [...(cloud.tasks || [])];
  const renamed = new Map<string, string>();
  for (const task of guest.tasks || []) {
    const duplicate = tasks.find(item => item.id === task.id);
    if (!duplicate) tasks.push(task);
    else if (JSON.stringify(duplicate) !== JSON.stringify(task)) {
      let id = importId + '-' + task.id;
      while (tasks.some(item => item.id === id)) id = importId + '-' + id;
      renamed.set(task.id, id);
      tasks.push({ ...task, id });
    }
  }
  const progress = hasPlayedProgress(cloud) ? cloud : { ...cloud, ...guest };
  return {
    ...progress, tasks,
    activity_history: [
      ...(cloud.activity_history || []),
      ...(guest.activity_history || []).map((entry: any) => ({ ...entry, taskId: renamed.get(entry.taskId) || entry.taskId })),
    ],
    unlocked_avatars: [...new Set([...(cloud.unlocked_avatars || ['default']), ...(guest.unlocked_avatars || ['default'])])],
    unlocked_backgrounds: [...new Set([...(cloud.unlocked_backgrounds || ['clean']), ...(guest.unlocked_backgrounds || ['clean'])])],
    unlocked_themes: [...new Set([...(cloud.unlocked_themes || ['classic']), ...(guest.unlocked_themes || ['classic'])])],
    guest_imports: [...imported, importId],
  };
}
