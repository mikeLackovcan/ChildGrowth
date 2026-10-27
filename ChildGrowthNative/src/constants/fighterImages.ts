import { AVAILABLE_AVATARS } from './fighters';
export function fighterImage(fighter: string, outfit?: string) {
  if (fighter === 'roblox_noob' && outfit === 'explorer') return require('../assets/images/roblox_noob_explorer.png');
  return (AVAILABLE_AVATARS.find(item => item.id === fighter) || AVAILABLE_AVATARS[0]).image;
}

export function fighterHasCombatCutout(fighter: string, outfit?: string) {
  return (fighter === 'roblox_noob' && outfit !== 'explorer') || AVAILABLE_AVATARS.some(item => item.id === fighter && fighter !== 'roblox_noob');
}

export function fighterCombatImage(fighter: string, outfit?: string) {
  if (fighter === 'roblox_noob' && outfit !== 'explorer') return require('../assets/images/fighter_noob_cutout.png');
  if (fighter === 'roblox_bacon_hair') return require('../assets/images/fighter_bacon_cutout.png');
  if (fighter === 'roblox_guest') return require('../assets/images/fighter_guest_cutout.png');
  if (fighter === 'roblox_builderman') return require('../assets/images/fighter_builderman_cutout.png');
  if (fighter === 'roblox_flamingo') return require('../assets/images/fighter_flamingo_cutout.png');
  if (fighter === 'roblox_ninja') return require('../assets/images/fighter_ninja_cutout.png');
  if (fighter === 'roblox_dominus') return require('../assets/images/fighter_dominus_cutout.png');
  if (fighter === 'roblox_wizard') return require('../assets/images/fighter_wizard_cutout.png');
  if (fighter === 'roblox_cyber') return require('../assets/images/fighter_cyber_cutout.png');
  if (fighter === 'roblox_unicorn') return require('../assets/images/fighter_unicorn_cutout.png');
  if (fighter === 'roblox_dragon') return require('../assets/images/fighter_dragon_cutout.png');
  if (fighter === 'roblox_bloxy') return require('../assets/images/fighter_bloxy_cutout.png');
  return fighterImage(fighter, outfit);
}
