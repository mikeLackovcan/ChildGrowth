import { create } from 'zustand';
import projectStorage from '../lib/projectStorage';
import { auth } from '../lib/firebase';
import { loadOwnCloudData, saveOwnCloudData } from '../lib/familyCloud';
import {
  canPlaceBuilding,
  WORLD_BUILDINGS,
  type WorldBuildingType,
  type WorldPlacement,
} from '../lib/worldEconomy';

type SavedWorld = {
  spentPower: number;
  placements: WorldPlacement[];
  updatedAt: number;
};

type WorldStore = SavedWorld & {
  ownerKey: string | null;
  hydrated: boolean;
  hydrate: (ownerKey: string) => Promise<void>;
  placeBuilding: (plotId: string, type: WorldBuildingType, availablePower: number) => boolean;
  upgradeBuilding: (plotId: string, availablePower: number) => boolean;
};

const starterWorld = (): SavedWorld => ({
  spentPower: 0,
  placements: [{ plotId: 'home', type: 'home', level: 1 }],
  updatedAt: 0,
});

const validWorld = (value: any): value is SavedWorld => Boolean(
  value
  && Number.isFinite(value.spentPower)
  && Array.isArray(value.placements)
  && value.placements.every((item: any) => item?.plotId && WORLD_BUILDINGS[item.type as WorldBuildingType]),
);

export const useWorldStore = create<WorldStore>((set, get) => {
  const persist = async (ownerKey: string) => {
    const snapshot: SavedWorld = {
      spentPower: get().spentPower,
      placements: get().placements,
      updatedAt: Date.now(),
    };
    set({ updatedAt: snapshot.updatedAt });
    await projectStorage.setItem(`world_${ownerKey}`, JSON.stringify(snapshot));
    if (auth.currentUser && ownerKey !== 'guest-local') {
      await saveOwnCloudData({ world: snapshot });
    }
  };

  return {
    ...starterWorld(),
    ownerKey: null,
    hydrated: false,
    hydrate: async (ownerKey) => {
      if (get().ownerKey === ownerKey && get().hydrated) return;
      set({ ...starterWorld(), ownerKey, hydrated: false });
      let best = starterWorld();
      try {
        const localRaw = await projectStorage.getItem(`world_${ownerKey}`);
        const local = localRaw ? JSON.parse(localRaw) : null;
        if (validWorld(local)) best = local;
        if (auth.currentUser && ownerKey !== 'guest-local') {
          const cloud = (await loadOwnCloudData())?.world;
          if (validWorld(cloud) && (cloud.updatedAt || 0) > (best.updatedAt || 0)) best = cloud;
        }
      } catch (_) {
        // The starter world remains a complete offline fallback.
      }
      set({ ...best, ownerKey, hydrated: true });
    },
    placeBuilding: (plotId, type, availablePower) => {
      if (!canPlaceBuilding(get().placements, plotId, type, availablePower)) return false;
      set(state => ({
        spentPower: state.spentPower + WORLD_BUILDINGS[type].cost,
        placements: [...state.placements, { plotId, type, level: 1 }],
      }));
      void persist(get().ownerKey || 'guest-local').catch(() => undefined);
      return true;
    },
    upgradeBuilding: (plotId, availablePower) => {
      const building = get().placements.find(item => item.plotId === plotId);
      if (!building || building.level >= WORLD_BUILDINGS[building.type].maxLevel) return false;
      const cost = WORLD_BUILDINGS[building.type].upgradeCost * building.level;
      if (availablePower < cost) return false;
      set(state => ({
        spentPower: state.spentPower + cost,
        placements: state.placements.map(item => item.plotId === plotId ? { ...item, level: item.level + 1 } : item),
      }));
      void persist(get().ownerKey || 'guest-local').catch(() => undefined);
      return true;
    },
  };
});
