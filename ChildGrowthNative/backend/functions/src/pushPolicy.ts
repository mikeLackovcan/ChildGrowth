export function validZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || zone.length > 80) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); return true; } catch { return false; }
}
export function quietUntil(time: number, zone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' });
  // Walk actual instants, so DST transitions do not create invalid local times.
  for (let next = time; next <= time + 25 * 3600000; next += 60000) {
    const hour = Number(formatter.format(new Date(next)));
    if (hour >= 7 && hour < 20) return next;
  }
  return time + 24 * 3600000;
}
export function retryAt(time: number, attempts: number): number {
  return time + Math.min(60 * 60 * 1000, 30000 * 2 ** Math.min(attempts, 7));
}
export function familyChanges(before: any, after: any) {
  const notices: { kind: string; taskId?: string; prizeId?: string; toParent: boolean }[] = [];
  const oldTasks = new Map<string, any>((before?.tasks || []).map((task: any) => [task.id, task]));
  for (const task of after?.tasks || []) {
    if (typeof task.id !== 'string') continue;
    const old = oldTasks.get(task.id);
    if (task.pendingApproval === true && old?.pendingApproval !== true) notices.push({ kind: 'quest_review', taskId: task.id, toParent: true });
    if (task.helpRequested === true && old?.helpRequested !== true) notices.push({ kind: 'quest_help', taskId: task.id, toParent: true });
    // A review receipt distinguishes late approval from a legacy daily reset.
    if (old?.pendingApproval === true && task.pendingApproval === false) {
      const receipt = task.lastReview;
      if (receipt && receipt.at !== old.lastReview?.at && receipt.day === old.date) {
        notices.push({ kind: receipt.approved ? 'quest_approved' : 'quest_retry', taskId: task.id, toParent: false });
      } else if (before?.lastActiveDate === after?.lastActiveDate && old.date === task.date) {
        notices.push({ kind: task.done ? 'quest_approved' : 'quest_retry', taskId: task.id, toParent: false });
      }
    }
  }
  const oldPrizes = new Map<string, any>((before?.won_prizes || []).map((prize: any) => [prize.id, prize]));
  for (const prize of after?.won_prizes || []) {
    if (typeof prize.id !== 'string') continue;
    const old = oldPrizes.get(prize.id);
    if (prize.status === 'requested' && old?.status !== 'requested') notices.push({ kind: 'prize_review', prizeId: prize.id, toParent: true });
    if (prize.status === 'approved' && old?.status === 'requested') notices.push({ kind: 'prize_approved', prizeId: prize.id, toParent: false });
  }
  return notices;
}
