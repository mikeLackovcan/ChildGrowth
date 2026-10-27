// Cosmetics never participate in reward calculations or combat statistics.
export type FighterOutfits = Record<string, string>;
export function validOutfit(fighter: string, outfit: unknown): boolean {
  return outfit === 'original' || (fighter === 'roblox_noob' && outfit === 'explorer');
}
export function normalizeOutfits(value: unknown): FighterOutfits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  // Only the Noob explorer outfit is currently available; original needs no entry.
  return (value as FighterOutfits).roblox_noob === 'explorer' ? { roblox_noob: 'explorer' } : {};
}
