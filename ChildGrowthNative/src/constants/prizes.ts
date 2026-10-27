// Visual starter rewards for a new family. Parents can replace these labels
// with rewards that fit their home; saved custom pools stay unchanged.
export const DEFAULT_PRIZES = [
  'Ice Cream 🍦',
  'Pick Dinner 🍕',
  'Screen Time 🎮',
  'Robux 💰',
  'Movie Night 🎬',
  'Choose a Game 🕹️',
  'Late Bedtime 🌙',
  'Skip One Chore 🛑',
  'Outdoor Play ⚽',
  'Sticker Pack 🌟',
];

export const PRIZE_ICONS = ['🍦', '🍕', '🎮', '💰', '🎬', '🕹️', '🌙', '🛑', '⚽', '🌟'];
export const prizeEmoji = (prize: string) => prize.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/)?.[0] || '🎁';
export const prizeLabel = (prize: string) => prize.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\uFE0F?/, '').trim();

const LEGACY_DEFAULT_PRIZES = ['Robux 💰', '1 Day Screen Time 🎮', 'Ice Cream 🍦', '1 Day Late Bedtime 🌙', '1 Day Pick Dinner 🍕', '1 Day Skip a Chore 🛑'];

export const restorePrizePool = (saved: unknown): string[] => {
  if (!Array.isArray(saved)) return [...DEFAULT_PRIZES];
  const prizes = saved.filter((prize): prize is string => typeof prize === 'string');
  if (prizes.length === 1) return Array.from(new Set([...prizes, ...DEFAULT_PRIZES]));
  return prizes.length === LEGACY_DEFAULT_PRIZES.length && prizes.every((prize, index) => prize === LEGACY_DEFAULT_PRIZES[index])
    ? [...DEFAULT_PRIZES]
    : prizes;
};
