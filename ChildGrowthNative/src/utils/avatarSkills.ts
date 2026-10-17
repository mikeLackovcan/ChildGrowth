export interface AvatarSkillConfig {
  id: string;
  name: string;
  price: number;
  skillName: string;
  shortBuff: string;
  xpMultiplier: number;
  coinMultiplier: number;
  easyCoinBonusPct?: number;
  medHardCoinMultiplier?: number;
  bossBonusXP?: number;
  bossHoldDurationMs?: number;
  wheelBonusCoins?: number;
  hasStreakShield?: boolean;
}

export const AVATAR_SKILL_CONFIGS: AvatarSkillConfig[] = [
  {
    id: 'roblox_noob',
    name: 'Roblox Noob',
    price: 0,
    skillName: 'Beginner Luck 🍀',
    shortBuff: '+10% Coins on Easy Quests',
    xpMultiplier: 1.0,
    coinMultiplier: 1.0,
    easyCoinBonusPct: 0.1,
  },
  {
    id: 'roblox_bacon_hair',
    name: 'Bacon Hair',
    price: 350,
    skillName: 'Crispy Focus 🔥',
    shortBuff: '+15% XP Boost on All Quests',
    xpMultiplier: 1.15,
    coinMultiplier: 1.0,
  },
  {
    id: 'roblox_guest',
    name: 'Roblox Guest',
    price: 700,
    skillName: 'Stealth Shield 🛡️',
    shortBuff: 'Auto Streak Shield Protection',
    xpMultiplier: 1.1,
    coinMultiplier: 1.1,
    hasStreakShield: true,
  },
  {
    id: 'roblox_builderman',
    name: 'Builderman',
    price: 1400,
    skillName: 'Master Architect 🏗️',
    shortBuff: '2x Coins on Med & Hard Quests',
    xpMultiplier: 1.0,
    coinMultiplier: 1.0,
    medHardCoinMultiplier: 2.0,
  },
  {
    id: 'roblox_flamingo',
    name: 'Flamingo',
    price: 2100,
    skillName: 'Chill Vibe 🍨',
    shortBuff: '+20% Bonus Coins on Quests',
    xpMultiplier: 1.1,
    coinMultiplier: 1.2,
  },
  {
    id: 'roblox_ninja',
    name: 'Roblox Ninja',
    price: 2800,
    skillName: 'Shadow Speed ⚡',
    shortBuff: '2x Faster Boss Hold (0.75s)',
    xpMultiplier: 1.15,
    coinMultiplier: 1.15,
    bossHoldDurationMs: 750,
  },
  {
    id: 'roblox_dominus',
    name: 'Dominus Valkyrie',
    price: 3500,
    skillName: 'Crown of Power 👑',
    shortBuff: '+25% XP across All Quests',
    xpMultiplier: 1.25,
    coinMultiplier: 1.15,
  },
  {
    id: 'roblox_wizard',
    name: 'Galaxy Wizard',
    price: 4200,
    skillName: 'Starlight Magic ✨',
    shortBuff: '+30% Bonus Coins on Quests',
    xpMultiplier: 1.15,
    coinMultiplier: 1.3,
  },
  {
    id: 'roblox_cyber',
    name: 'Cyber Mecha',
    price: 4900,
    skillName: 'Overclock Core 🔋',
    shortBuff: '+50 Bonus XP on Daily Boss',
    xpMultiplier: 1.2,
    coinMultiplier: 1.2,
    bossBonusXP: 50,
  },
  {
    id: 'roblox_unicorn',
    name: 'Rainbow Unicorn',
    price: 5600,
    skillName: 'Rainbow Luck 🌈',
    shortBuff: '+50 Bonus Coins on Prize Wheel',
    xpMultiplier: 1.25,
    coinMultiplier: 1.25,
    wheelBonusCoins: 50,
  },
  {
    id: 'roblox_dragon',
    name: 'Frost Dragon',
    price: 6300,
    skillName: 'Ice Barrier ❄️',
    shortBuff: 'Streak Shield + 35% XP Boost',
    xpMultiplier: 1.35,
    coinMultiplier: 1.3,
    hasStreakShield: true,
  },
  {
    id: 'roblox_bloxy',
    name: 'Golden Bloxy Champ',
    price: 7000,
    skillName: 'Ultimate Champion 🏆',
    shortBuff: '+50% Coins & XP on ALL Quests',
    xpMultiplier: 1.5,
    coinMultiplier: 1.5,
  },
];

export function getAvatarSkillConfig(avatarId?: string | null): AvatarSkillConfig {
  if (!avatarId || avatarId === 'default') {
    return AVATAR_SKILL_CONFIGS[0];
  }
  return AVATAR_SKILL_CONFIGS.find((a) => a.id === avatarId) || AVATAR_SKILL_CONFIGS[0];
}

export interface QuestRewardCalculation {
  xpGain: number;
  coinGain: number;
  skillLabel: string;
  isCritical: boolean;
  comboMultiplier?: number;
  isSupercharged?: boolean;
}

export function getComboMultiplier(completedCount: number): { multiplier: number; label: string; color: string } {
  if (completedCount >= 3) {
    return { multiplier: 2.0, label: '👑 2.0x ROBLOX FRENZY!', color: '#ff007f' };
  } else if (completedCount === 2) {
    return { multiplier: 1.5, label: '⚡ 1.5x ULTRA COMBO!', color: '#ffb300' };
  } else if (completedCount === 1) {
    return { multiplier: 1.2, label: '🔥 1.2x COMBO!', color: '#00e5ff' };
  }
  return { multiplier: 1.0, label: '1.0x NORMAL', color: '#AAAAAA' };
}

export function calculateQuestReward(
  baseXp: number,
  diff: 'easy' | 'med' | 'hard' | 'boss',
  avatarId?: string | null,
  forceCritical?: boolean,
  completedCount: number = 0,
  isSupercharged: boolean = false
): QuestRewardCalculation {
  const config = getAvatarSkillConfig(avatarId);
  let xp = baseXp * config.xpMultiplier;
  let coins = baseXp * config.coinMultiplier;

  if (diff === 'easy' && config.easyCoinBonusPct) {
    coins = Math.max(coins + 2, coins * (1 + config.easyCoinBonusPct));
  }
  if ((diff === 'med' || diff === 'hard') && config.medHardCoinMultiplier) {
    coins = baseXp * config.medHardCoinMultiplier;
  }
  if (diff === 'boss' && config.bossBonusXP) {
    xp += config.bossBonusXP;
    coins += Math.round(config.bossBonusXP * 0.5);
  }

  // Hero's Choice 2x Supercharge (Bucher Autonomy + Seduced by Logic)
  if (isSupercharged) {
    coins *= 2;
    xp = Math.round(xp * 1.5);
  }

  // Live Session Combo Multiplier (Hooked + Evil by Design Gluttony)
  const combo = getComboMultiplier(completedCount);
  if (combo.multiplier > 1.0) {
    coins = Math.round(coins * combo.multiplier);
    xp = Math.round(xp * Math.min(1.5, combo.multiplier));
  }

  const isCritical = Boolean(forceCritical);
  if (isCritical) {
    coins = Math.round(coins * 1.5) + 5;
    xp = Math.round(xp * 1.25);
  }

  let skillLabel = config.shortBuff;
  if (isSupercharged) skillLabel = `⚡ 2X SUPERCHARGE · ${skillLabel}`;
  if (combo.multiplier > 1.0) skillLabel = `${combo.label} · ${skillLabel}`;

  return {
    xpGain: Math.max(1, Math.round(xp)),
    coinGain: Math.max(1, Math.round(coins)),
    skillLabel,
    isCritical,
    comboMultiplier: combo.multiplier,
    isSupercharged,
  };
}

export function getHeroCompanionMessage(
  avatarId: string | null | undefined,
  context: {
    progressPct: number;
    hasUnclaimedChest: boolean;
    comboCount: number;
    isBossVulnerable: boolean;
    streak: number;
  }
): string {
  const avatar = getAvatarSkillConfig(avatarId);

  if (context.hasUnclaimedChest) {
    return `🎁 Yo! Tap your Daily Mystery Supply Crate for free coins & XP!`;
  }
  if (context.progressPct === 100) {
    return `👑 LEGENDARY SWEEP! All daily quests defeated today! You're a true champion!`;
  }
  if (context.isBossVulnerable) {
    return `💥 Boss shield is SHATTERED! Hold to claim your massive victory bonus!`;
  }
  if (context.comboCount >= 2) {
    return `🔥 COMBO FRENZY! ${context.comboCount} quests crushed in a row — keep the multiplier going!`;
  }
  if (context.progressPct >= 70) {
    return `⚡ Almost there! Just 1 or 2 quests left to crack open today's Vault!`;
  }
  if (context.streak >= 3) {
    return `🔥 You're on a ${context.streak}-day streak! ${avatar.name} is proud of you!`;
  }
  return `⚔️ Ready for today's quests? Tap the ⚡ Supercharge to double your loot!`;
}

export interface NextAvatarGoal {
  id: string;
  name: string;
  price: number;
  coinsNeeded: number;
  progressPct: number;
  canUnlockNow: boolean;
}

export function getNextLockedAvatar(
  unlockedAvatars: string[],
  currentCoins: number
): NextAvatarGoal | null {
  const normalizedUnlocked = new Set(
    unlockedAvatars.map((id) => (id === 'default' ? 'roblox_noob' : id))
  );
  normalizedUnlocked.add('roblox_noob');

  const nextLocked = AVATAR_SKILL_CONFIGS.find(
    (avatar) => avatar.price > 0 && !normalizedUnlocked.has(avatar.id)
  );

  if (!nextLocked) {
    return null;
  }

  const coinsNeeded = Math.max(0, nextLocked.price - currentCoins);
  const progressPct = Math.min(100, Math.round((currentCoins / nextLocked.price) * 100));

  return {
    id: nextLocked.id,
    name: nextLocked.name,
    price: nextLocked.price,
    coinsNeeded,
    progressPct,
    canUnlockNow: currentCoins >= nextLocked.price,
  };
}
