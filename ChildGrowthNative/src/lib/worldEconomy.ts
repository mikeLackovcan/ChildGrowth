import type { Task } from '../store/useAppStore';
import { isQuestDue, localDateKey } from './questSchedule';

export const STARTER_BUILD_POWER = 5_000;
export const DAILY_BUILD_POWER = 10_000;

export type WorldBuildingType = 'home' | 'park' | 'bakery' | 'school';

export type WorldPlacement = {
  plotId: string;
  type: WorldBuildingType;
  level: number;
};

export const WORLD_BUILDINGS: Record<WorldBuildingType, {
  name: string;
  icon: string;
  cost: number;
  upgradeCost: number;
  color: string;
}> = {
  home: { name: 'Home', icon: '🏠', cost: 5_000, upgradeCost: 10_000, color: '#3270EB' },
  park: { name: 'Park', icon: '🌳', cost: 5_000, upgradeCost: 10_000, color: '#8FCB24' },
  bakery: { name: 'Bakery', icon: '🥐', cost: 7_500, upgradeCost: 15_000, color: '#FF806C' },
  school: { name: 'School', icon: '🏫', cost: 10_000, upgradeCost: 20_000, color: '#F6B83F' },
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
