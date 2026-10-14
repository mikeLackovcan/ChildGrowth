// Read compatibility only: old saved unlocks must retain their value after rebranding.
const previousAvatarIds = ['noob', 'bacon_hair', 'guest', 'builderman', 'flamingo', 'ninja', 'dominus', 'wizard', 'cyber', 'unicorn', 'dragon', 'bloxy'];
export const companionIds = ['sprout', 'ember', 'drift', 'forge', 'coral', 'dusk', 'jade', 'nova', 'pulse', 'prism', 'frost', 'sunrise'].map(id => `quest_${id}`);

export function normalizeAvatarId(id: string): string {
  const index = previousAvatarIds.findIndex(old => `roblox_${old}` === id);
  return index < 0 ? id : companionIds[index];
}

export function normalizeBrandState<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(normalizeBrandState) as T;
  const result = { ...value } as Record<string, any>;
  for (const key of ['currentAvatar', 'current_avatar']) {
    if (typeof result[key] === 'string') result[key] = normalizeAvatarId(result[key]);
  }
  for (const key of ['unlockedAvatars', 'unlocked_avatars']) {
    if (Array.isArray(result[key])) result[key] = [...new Set(result[key].map((id: string) => normalizeAvatarId(id)))];
  }
  // Replace only the app's former built-in reward, never rewrite custom task/name text.
  const reward = (text: string) => text === 'Robux 💰' ? 'Family surprise 🎁' : text;
  if (Array.isArray(result.prizes)) result.prizes = result.prizes.map(reward);
  for (const key of ['wonPrizes', 'won_prizes']) {
    if (Array.isArray(result[key])) result[key] = result[key].map((item: any) => typeof item === 'string' ? reward(item) : { ...item, prize: reward(item.prize) });
  }
  if (Array.isArray(result.children)) result.children = result.children.map(normalizeBrandState);
  return result as T;
}
