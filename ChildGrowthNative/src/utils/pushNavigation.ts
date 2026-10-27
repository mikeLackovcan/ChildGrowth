import { pushText } from '../i18n/pushMessages';
export interface PushDestination { screen: 'battle' | 'parent' | 'quests' | 'rewards' | 'family'; id?: string }
export function pushDestination(data: Record<string, unknown>, uid: string | null, role: string | null): PushDestination | null {
  if (!uid || data.questbloxPush !== true || data.recipient !== uid || typeof data.kind !== 'string' || !pushText(data.kind, 'en')) return null;
  const id = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : undefined;
  if (data.kind.startsWith('battle_')) return id(data.battleId) ? { screen: 'battle', id: id(data.battleId) } : null;
  if (['quest_review', 'quest_help', 'prize_review'].includes(data.kind)) return role === 'parent' ? { screen: 'parent', id: id(data.sourceChildId) } : null;
  if (data.kind === 'prize_approved') return role === 'child' ? { screen: 'rewards' } : null;
  if (data.kind.startsWith('quest_')) return role === 'child' ? { screen: 'quests', id: id(data.taskId) } : null;
  if (data.kind.startsWith('family_')) return { screen: role === 'parent' ? 'parent' : 'family' };
  return null;
}
