export interface RobloxAvatar {
  id: string;
  name: string;
  price: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  skillName: string;
  skillDesc: string;
  image?: any;
  emoji?: string;
  color: string;
  // Battle Combat System Stats
  hp: number;
  attack: number;
  speed: number;
  battleSkill: string;
  battleSkillDesc: string;
  battleClass: string;
}

export const AVAILABLE_AVATARS: RobloxAvatar[] = [
  {
    id: 'roblox_noob',
    name: 'Roblox Noob',
    price: 0,
    rarity: 'Common',
    skillName: 'Beginner Luck 🍀',
    skillDesc: '+10% Bonus Coins on Easy Quests',
    image: require('../assets/images/roblox_noob.png'),
    color: '#FBBF24',
    hp: 100,
    attack: 15,
    speed: 20,
    battleSkill: 'Noob Punch 👊',
    battleSkillDesc: 'Deals 20 damage with 10% chance to stun opponent.',
    battleClass: 'Brawler 🥊'
  },
  {
    id: 'roblox_bacon_hair',
    name: 'Bacon Hair',
    price: 350,
    rarity: 'Common',
    skillName: 'Crispy Focus 🔥',
    skillDesc: '+15% XP Boost from Daily Quests',
    image: require('../assets/images/roblox_bacon_hair.png'),
    color: '#EF4444',
    hp: 120,
    attack: 25,
    speed: 25,
    battleSkill: 'Crispy Fireball 🔥',
    battleSkillDesc: 'Launches a sizzle fireball dealing 35 fire damage.',
    battleClass: 'Fire Fighter 🔥'
  },
  {
    id: 'roblox_guest',
    name: 'Roblox Guest',
    price: 700,
    rarity: 'Common',
    skillName: 'Stealth Shield 🛡️',
    skillDesc: '1-Day Free Sick Mode Streak Protection',
    image: require('../assets/images/roblox_guest.png'),
    color: '#3B82F6',
    hp: 110,
    attack: 30,
    speed: 45,
    battleSkill: 'Stealth Counter 🥷',
    battleSkillDesc: 'Dodges incoming attack and strikes back for 40 damage.',
    battleClass: 'Ninja 🥷'
  },
  {
    id: 'roblox_builderman',
    name: 'Builderman',
    price: 1400,
    rarity: 'Rare',
    skillName: 'Master Architect 🏗️',
    skillDesc: 'Earn 2x Coins on Medium & Hard Quests',
    image: require('../assets/images/roblox_builderman.png'),
    color: '#F59E0B',
    hp: 180,
    attack: 35,
    speed: 15,
    battleSkill: 'Brick Wall 🧱',
    battleSkillDesc: 'Constructs a fortress shielding +50 HP for 2 battle turns.',
    battleClass: 'Heavy Tank 🏗️'
  },
  {
    id: 'roblox_flamingo',
    name: 'Flamingo',
    price: 2100,
    rarity: 'Rare',
    skillName: 'Chill Vibe 🍨',
    skillDesc: 'Unlocks Bonus Ice Cream Prize Wheel Slice',
    image: require('../assets/images/roblox_flamingo.png'),
    color: '#EC4899',
    hp: 140,
    attack: 40,
    speed: 30,
    battleSkill: 'Ice Cream Freeze 🍨',
    battleSkillDesc: 'Restores +30 HP to figure and slows enemy speed.',
    battleClass: 'Support Mage 🍨'
  },
  {
    id: 'roblox_ninja',
    name: 'Roblox Ninja',
    price: 2800,
    rarity: 'Rare',
    skillName: 'Shadow Speed',
    skillDesc: 'Fast-Charge Hold-to-Claim Boss Quests',
    image: require('../assets/images/roblox_ninja.png'),
    color: '#8B5CF6',
    hp: 130,
    attack: 50,
    speed: 60,
    battleSkill: 'Shadow Katana ⚡',
    battleSkillDesc: 'Delivers a rapid double strike dealing 60 critical damage.',
    battleClass: 'Speedster ⚡'
  },
  {
    id: 'roblox_dominus',
    name: 'Dominus Valkyrie',
    price: 3500,
    rarity: 'Epic',
    skillName: 'Crown of Power',
    skillDesc: '+25% XP Multiplier across ALL Quests',
    image: require('../assets/images/roblox_dominus.png'),
    color: '#10B981',
    hp: 200,
    attack: 55,
    speed: 35,
    battleSkill: 'Valkyrie Strike 👑',
    battleSkillDesc: 'Smites rival figure with 70 holy radiant damage.',
    battleClass: 'Paladin 👑'
  },
  {
    id: 'roblox_wizard',
    name: 'Galaxy Wizard',
    price: 4200,
    rarity: 'Epic',
    skillName: 'Starlight Magic ?',
    skillDesc: '+30% Bonus Coins on Reading & Math Quests',
    image: require('../assets/images/roblox_wizard.png'),
    color: '#6366F1',
    hp: 160,
    attack: 60,
    speed: 40,
    battleSkill: 'Cosmic Meteor ✨',
    battleSkillDesc: 'Summons a star shower dealing 75 cosmic magic damage.',
    battleClass: 'Galaxy Mage 🧙‍♂️'
  },
  {
    id: 'roblox_cyber',
    name: 'Cyber Mecha',
    price: 4900,
    rarity: 'Epic',
    skillName: 'Overclock Core ?',
    skillDesc: '+50 XP Bonus when completing Daily Boss',
    image: require('../assets/images/roblox_cyber.png'),
    color: '#0EA5E9',
    hp: 220,
    attack: 65,
    speed: 25,
    battleSkill: 'Overclock Cannon 🔋',
    battleSkillDesc: 'Fires a high-density plasma beam dealing 80 damage.',
    battleClass: 'Tech Mech 🤖'
  },
  {
    id: 'roblox_unicorn',
    name: 'Rainbow Unicorn',
    price: 5600,
    rarity: 'Legendary',
    skillName: 'Rainbow Luck ??',
    skillDesc: '+50 Roblox Coins Bonus on Prize Wheel',
    image: require('../assets/images/roblox_unicorn.png'),
    color: '#F43F5E',
    hp: 190,
    attack: 50,
    speed: 55,
    battleSkill: 'Rainbow Wave 🌈',
    battleSkillDesc: 'Unleashes a mystic beam restoring +50 HP and 60 damage.',
    battleClass: 'Mystic 🦄'
  },
  {
    id: 'roblox_dragon',
    name: 'Frost Dragon',
    price: 6300,
    rarity: 'Legendary',
    skillName: 'Ice Barrier ??',
    skillDesc: 'Automatic Streak Saver for missed days',
    image: require('../assets/images/roblox_dragon.png'),
    color: '#0284C7',
    hp: 250,
    attack: 75,
    speed: 45,
    battleSkill: 'Glacier Blast ❄️',
    battleSkillDesc: 'Freezes rival figure for 1 turn and deals 85 ice damage.',
    battleClass: 'Dragon 🐉'
  },
  {
    id: 'roblox_bloxy',
    name: 'Golden Bloxy Champ',
    price: 7000,
    rarity: 'Legendary',
    skillName: 'Ultimate Champion ??',
    skillDesc: '+50% Coins & XP Multiplier on ALL Quests!',
    image: require('../assets/images/roblox_bloxy.png'),
    color: '#F59E0B',
    hp: 280,
    attack: 85,
    speed: 50,
    battleSkill: 'Bloxy Smash 🏆',
    battleSkillDesc: 'Ultimate Champion Finisher! Deals 100 massive damage.',
    battleClass: 'Mythic Champ 🌟'
  },
];
