import type { Task } from '../store/useAppStore';
import { isQuestDue, localDateKey } from './questSchedule';

export const STARTER_BUILD_POWER = 5_000;
export const DAILY_BUILD_POWER = 10_000;

export type WorldBuildingType =
  | 'home'
  | 'park'
  | 'bakery'
  | 'school'
  | 'library'
  | 'clubhouse'
  | 'cafe'
  | 'studio'
  | 'tree'
  | 'bench'
  | 'streetlight';

export type WorldPlacement = {
  plotId: string;
  type: WorldBuildingType;
  level: number;
};

export const WORLD_BUILDINGS: Record<WorldBuildingType, {
  nameKey: string;
  icon: string;
  cost: number;
  upgradeCost: number;
  maxLevel: number;
  category: 'building' | 'nature' | 'decoration';
  color: string;
}> = {
  home: { nameKey: 'world_item_home', icon: '🏠', cost: 5_000, upgradeCost: 8_000, maxLevel: 3, category: 'building', color: '#3270EB' },
  park: { nameKey: 'world_item_park', icon: '🌳', cost: 4_000, upgradeCost: 7_000, maxLevel: 3, category: 'nature', color: '#8FCB24' },
  bakery: { nameKey: 'world_item_bakery', icon: '🥐', cost: 7_500, upgradeCost: 12_000, maxLevel: 3, category: 'building', color: '#FF806C' },
  school: { nameKey: 'world_item_school', icon: '🏫', cost: 10_000, upgradeCost: 16_000, maxLevel: 3, category: 'building', color: '#F6B83F' },
  library: { nameKey: 'world_item_library', icon: '📚', cost: 9_000, upgradeCost: 14_000, maxLevel: 3, category: 'building', color: '#8F6DE8' },
  clubhouse: { nameKey: 'world_item_clubhouse', icon: '🏰', cost: 12_000, upgradeCost: 18_000, maxLevel: 3, category: 'building', color: '#36A6A6' },
  cafe: { nameKey: 'world_item_cafe', icon: '☕', cost: 7_000, upgradeCost: 11_000, maxLevel: 3, category: 'building', color: '#D67B45' },
  studio: { nameKey: 'world_item_studio', icon: '🎨', cost: 8_000, upgradeCost: 13_000, maxLevel: 3, category: 'building', color: '#E8689D' },
  tree: { nameKey: 'world_item_tree', icon: '🌲', cost: 1_000, upgradeCost: 0, maxLevel: 1, category: 'nature', color: '#55AE46' },
  bench: { nameKey: 'world_item_bench', icon: '🪑', cost: 750, upgradeCost: 0, maxLevel: 1, category: 'decoration', color: '#A86939' },
  streetlight: { nameKey: 'world_item_light', icon: '💡', cost: 750, upgradeCost: 0, maxLevel: 1, category: 'decoration', color: '#F6B83F' },
};

export function todayBuildPower(tasks: Task[]): number {
  const due = tasks.filter(task => isQuestDue(task));
  if (!due.length) return 0;
  const complete = due.filter(task => task.done && task.date === localDateKey()).length;
  return Math.round((complete / due.length) * DAILY_BUILD_POWER);
}

export function worldPowerBalance(totalEarnedCoins: number, spentPower: number): number {
  return Math.max(0, STARTER_BUILD_POWER + Math.max(0, totalEarnedCoins) * 100 - Math.max(0, spentPower));
}

export function canPlaceBuilding(
  placements: WorldPlacement[],
  plotId: string,
  type: WorldBuildingType,
  availablePower: number,
): boolean {
  return !placements.some(item => item.plotId === plotId)
    && availablePower >= WORLD_BUILDINGS[type].cost;
}
