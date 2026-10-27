const oldFirst = ['astro', 'blaze', 'brave', 'cosmic', 'frost', 'hyper', 'lucky', 'mega', 'pixel', 'rapid', 'solar', 'turbo'];
const oldSecond = ['bear', 'fox', 'hero', 'koala', 'ninja', 'otter', 'panda', 'raven', 'tiger', 'wolf', 'wizard', 'yeti'];

export function isLegacyGeneratedName(value: string | null | undefined) {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return /^hero_[a-f0-9]{16}$/.test(clean) || oldFirst.some(first => oldSecond.some(second => new RegExp(`^${first}${second}\\d{4}$`).test(clean)));
}

export function personName(name: string | null | undefined, nickname: string | null | undefined, fallback: string) {
  if (name?.trim() && !isLegacyGeneratedName(name)) return name.trim();
  if (nickname?.trim() && !isLegacyGeneratedName(nickname)) return nickname.trim();
  return fallback;
}

export function visibleNickname(nickname: string | null | undefined) {
  return nickname?.trim() && !isLegacyGeneratedName(nickname) ? nickname.trim() : null;
}
