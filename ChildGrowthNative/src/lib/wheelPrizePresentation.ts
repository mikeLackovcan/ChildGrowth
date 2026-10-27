export type WheelPrizePresentation = {
  icon: string;
  label: string;
};

const iconForReward = (reward: string) => {
  const suppliedIcon = reward.match(/\p{Extended_Pictographic}\uFE0F?/u)?.[0];
  if (suppliedIcon) return suppliedIcon;

  const normalized = reward.toLocaleLowerCase();
  if (/screen|tv|game/.test(normalized)) return '🎮';
  if (/movie|film/.test(normalized)) return '🍿';
  if (/ice|dessert|treat/.test(normalized)) return '🍦';
  if (/dinner|food|meal|pizza/.test(normalized)) return '🍕';
  if (/bed|sleep|night/.test(normalized)) return '🌙';
  if (/chore|clean|tidy/.test(normalized)) return '🧹';
  if (/family|together/.test(normalized)) return '🎁';
  if (/park|outside|walk/.test(normalized)) return '🌳';
  return '🎁';
};

/** The wheel reveals a saved prize; it must never invent an alternative reward. */
export function wheelChoices(configured: string[], savedPrize: string): string[] {
  const choices = configured.map(prize => prize.trim()).filter(Boolean);
  const winner = savedPrize.trim();
  if (winner && !choices.includes(winner)) choices.push(winner);
  return choices;
}

export const wheelPrizePresentation = (reward: string, fallback = 'Surprise'): WheelPrizePresentation => {
  const icon = iconForReward(reward);
  const words = reward
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, ' ')
    .replace(/^\s*(?:1|one)\s+day\s+/i, '')
    .replace(/\b(?:a|an|the)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}'’-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return {
    icon,
    label: words.join(' ') || fallback,
  };
};
